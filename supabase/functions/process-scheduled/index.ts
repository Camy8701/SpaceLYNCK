// ============================================================================
// PROCESS SCHEDULED CAMPAIGNS - Supabase Edge Function
// Runs on a schedule to process campaigns that are due to be sent
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Find scheduled campaigns that are due
    const now = new Date().toISOString()
    
    const { data: dueCampaigns, error } = await supabaseClient
      .from('email_campaigns')
      .select('id, name')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now)

    if (error) {
      throw error
    }

    if (!dueCampaigns || dueCampaigns.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No campaigns due for sending',
          processed: 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    console.log(`Found ${dueCampaigns.length} campaigns to process`)

    // Process each campaign
    const results = await Promise.all(
      dueCampaigns.map(async (campaign) => {
        try {
          // Call the send-campaign function
          const response = await fetch(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-campaign`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ campaignId: campaign.id }),
            }
          )

          const result = await response.json()
          return {
            campaignId: campaign.id,
            name: campaign.name,
            success: result.success,
            stats: result.stats
          }
        } catch (error) {
          console.error(`Error processing campaign ${campaign.id}:`, error)
          
          // Mark campaign as failed
          await supabaseClient
            .from('email_campaigns')
            .update({ status: 'failed' })
            .eq('id', campaign.id)

          return {
            campaignId: campaign.id,
            name: campaign.name,
            success: false,
            error: error.message
          }
        }
      })
    )

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${dueCampaigns.length} campaigns`,
        processed: dueCampaigns.length,
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error processing scheduled campaigns:', error)
    
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
