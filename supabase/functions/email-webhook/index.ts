// ============================================================================
// EMAIL WEBHOOK - Supabase Edge Function
// Receives webhooks from Resend for email events (opens, clicks, bounces)
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature',
}

interface WebhookPayload {
  type: string
  created_at: string
  data: {
    email_id: string
    from: string
    to: string[]
    subject: string
    created_at: string
    // For click events
    click?: {
      link: string
      timestamp: string
      ip_address: string
      user_agent: string
    }
    // For bounce events
    bounce?: {
      type: string
      message: string
    }
    // Common metadata
    tags?: Array<{ name: string; value: string }>
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify webhook signature (optional but recommended)
    // const signature = req.headers.get('svix-signature')
    // const timestamp = req.headers.get('svix-timestamp')
    // const webhookId = req.headers.get('svix-id')
    // Add signature verification logic here if needed

    const payload = await req.json() as WebhookPayload
    console.log('Received webhook:', payload.type)

    // Extract campaign_id and contact_id from tags
    const tags = payload.data.tags || []
    const campaignId = tags.find(t => t.name === 'campaign_id')?.value
    const contactId = tags.find(t => t.name === 'contact_id')?.value

    if (!campaignId) {
      console.log('No campaign_id in webhook tags, skipping')
      return new Response(
        JSON.stringify({ success: true, message: 'No campaign_id found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Find the email send record
    const { data: sendRecord } = await supabaseClient
      .from('email_sends')
      .select('id')
      .eq('external_id', payload.data.email_id)
      .single()

    const sendId = sendRecord?.id

    // Process different event types
    switch (payload.type) {
      case 'email.delivered':
        if (sendId) {
          await supabaseClient
            .from('email_sends')
            .update({
              status: 'delivered',
              delivered_at: new Date().toISOString()
            })
            .eq('id', sendId)
        }
        
        await supabaseClient
          .from('email_analytics_events')
          .insert({
            send_id: sendId,
            campaign_id: campaignId,
            contact_id: contactId,
            event_type: 'delivered',
            created_at: payload.created_at
          })
        break

      case 'email.opened':
        if (sendId) {
          await supabaseClient
            .from('email_sends')
            .update({
              status: 'opened',
              first_opened_at: supabaseClient.sql`COALESCE(first_opened_at, NOW())`,
              last_opened_at: new Date().toISOString(),
              open_count: supabaseClient.sql`open_count + 1`
            })
            .eq('id', sendId)
        }
        
        await supabaseClient
          .from('email_analytics_events')
          .insert({
            send_id: sendId,
            campaign_id: campaignId,
            contact_id: contactId,
            event_type: 'opened',
            created_at: payload.created_at
          })
        break

      case 'email.clicked':
        if (sendId) {
          await supabaseClient
            .from('email_sends')
            .update({
              status: 'clicked',
              first_clicked_at: supabaseClient.sql`COALESCE(first_clicked_at, NOW())`,
              click_count: supabaseClient.sql`click_count + 1`
            })
            .eq('id', sendId)
        }
        
        await supabaseClient
          .from('email_analytics_events')
          .insert({
            send_id: sendId,
            campaign_id: campaignId,
            contact_id: contactId,
            event_type: 'clicked',
            event_data: {
              url: payload.data.click?.link,
              ip_address: payload.data.click?.ip_address,
              user_agent: payload.data.click?.user_agent
            },
            ip_address: payload.data.click?.ip_address,
            user_agent: payload.data.click?.user_agent,
            created_at: payload.created_at
          })
        break

      case 'email.bounced':
        if (sendId) {
          await supabaseClient
            .from('email_sends')
            .update({
              status: 'bounced',
              error_message: payload.data.bounce?.message,
              error_code: payload.data.bounce?.type
            })
            .eq('id', sendId)
        }

        // Update contact status
        if (contactId) {
          await supabaseClient
            .from('email_contacts')
            .update({ status: 'bounced' })
            .eq('id', contactId)
        }
        
        await supabaseClient
          .from('email_analytics_events')
          .insert({
            send_id: sendId,
            campaign_id: campaignId,
            contact_id: contactId,
            event_type: 'bounced',
            event_data: {
              type: payload.data.bounce?.type,
              message: payload.data.bounce?.message
            },
            created_at: payload.created_at
          })
        break

      case 'email.complained':
        if (sendId) {
          await supabaseClient
            .from('email_sends')
            .update({ status: 'complained' })
            .eq('id', sendId)
        }

        // Update contact status
        if (contactId) {
          await supabaseClient
            .from('email_contacts')
            .update({ status: 'complained' })
            .eq('id', contactId)
        }
        
        await supabaseClient
          .from('email_analytics_events')
          .insert({
            send_id: sendId,
            campaign_id: campaignId,
            contact_id: contactId,
            event_type: 'complained',
            created_at: payload.created_at
          })
        break

      default:
        console.log('Unhandled webhook type:', payload.type)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${payload.type} event`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error processing webhook:', error)
    
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
