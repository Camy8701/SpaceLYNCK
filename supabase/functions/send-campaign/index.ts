// ============================================================================
// SEND CAMPAIGN - Supabase Edge Function
// Processes and sends email campaigns via Resend API
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailPayload {
  campaignId: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured')
    }

    const { campaignId } = await req.json() as EmailPayload

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabaseClient
      .from('email_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      throw new Error('Campaign not found')
    }

    // Update campaign status to 'sending'
    await supabaseClient
      .from('email_campaigns')
      .update({ status: 'sending', started_at: new Date().toISOString() })
      .eq('id', campaignId)

    // Get recipients based on recipient_type
    let recipients: any[] = []

    if (campaign.recipient_type === 'all') {
      const { data } = await supabaseClient
        .from('email_contacts')
        .select('*')
        .eq('user_id', campaign.user_id)
        .eq('status', 'active')
      recipients = data || []
    } else if (campaign.recipient_type === 'list' && campaign.recipient_list_id) {
      const { data } = await supabaseClient
        .from('email_list_contacts')
        .select('contact:email_contacts(*)')
        .eq('list_id', campaign.recipient_list_id)
      recipients = data?.map(d => d.contact).filter(c => c?.status === 'active') || []
    }

    // Update recipient count
    await supabaseClient
      .from('email_campaigns')
      .update({ recipient_count: recipients.length })
      .eq('id', campaignId)

    let sentCount = 0
    let failedCount = 0

    // Send emails in batches
    const BATCH_SIZE = 10
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE)
      
      await Promise.all(batch.map(async (contact) => {
        try {
          // Replace template variables
          let htmlContent = campaign.html_content
          const variables = {
            first_name: contact.first_name || '',
            last_name: contact.last_name || '',
            full_name: contact.full_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
            email: contact.email,
            company: contact.company || '',
            ...(contact.custom_fields || {})
          }

          Object.entries(variables).forEach(([key, value]) => {
            const regex = new RegExp(`\\{\\{?\\s*${key}\\s*\\}?\\}`, 'gi')
            htmlContent = htmlContent.replace(regex, value as string)
          })

          // Create email send record
          const { data: sendRecord } = await supabaseClient
            .from('email_sends')
            .insert({
              campaign_id: campaignId,
              contact_id: contact.id,
              recipient_email: contact.email,
              recipient_name: contact.full_name || contact.first_name,
              status: 'pending'
            })
            .select()
            .single()

          // Send via Resend
          const resendResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: `${campaign.from_name} <${campaign.from_email}>`,
              to: [contact.email],
              subject: campaign.subject.replace(/\{\{first_name\}\}/gi, contact.first_name || ''),
              html: htmlContent,
              reply_to: campaign.reply_to || campaign.from_email,
              tags: [
                { name: 'campaign_id', value: campaignId },
                { name: 'contact_id', value: contact.id }
              ]
            }),
          })

          const resendData = await resendResponse.json()

          if (resendResponse.ok) {
            // Update send record with success
            await supabaseClient
              .from('email_sends')
              .update({
                status: 'sent',
                external_id: resendData.id,
                sent_at: new Date().toISOString()
              })
              .eq('id', sendRecord.id)

            // Log analytics event
            await supabaseClient
              .from('email_analytics_events')
              .insert({
                send_id: sendRecord.id,
                campaign_id: campaignId,
                contact_id: contact.id,
                event_type: 'sent'
              })

            sentCount++
          } else {
            // Update send record with failure
            await supabaseClient
              .from('email_sends')
              .update({
                status: 'failed',
                error_message: resendData.message || 'Unknown error',
                error_code: resendData.statusCode?.toString()
              })
              .eq('id', sendRecord.id)

            failedCount++
          }
        } catch (error) {
          console.error('Error sending email to', contact.email, error)
          failedCount++
        }
      }))

      // Small delay between batches to respect rate limits
      if (i + BATCH_SIZE < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    // Update campaign with final stats
    await supabaseClient
      .from('email_campaigns')
      .update({
        status: 'sent',
        completed_at: new Date().toISOString(),
        total_sent: sentCount
      })
      .eq('id', campaignId)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Campaign sent successfully`,
        stats: {
          total: recipients.length,
          sent: sentCount,
          failed: failedCount
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error processing campaign:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
