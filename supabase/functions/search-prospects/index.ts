// ============================================================================
// SEARCH PROSPECTS - Supabase Edge Function
// Discovers businesses on the internet based on niche and location
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SearchPayload {
  niches: string[]
  country: string
  city?: string
  area?: string
  limit?: number
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

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

    if (userError || !user) {
      throw new Error('Invalid user token')
    }

    const { niches, country, city, area, limit = 10 } = await req.json() as SearchPayload

    if (!niches || niches.length === 0) {
      throw new Error('At least one niche is required')
    }

    if (!country) {
      throw new Error('Country is required')
    }

    console.log(`Searching for: ${niches.join(', ')} in ${city || area || country}`)

    const discoveredProspects: any[] = []

    // ========================================================================
    // SEARCH FOR BUSINESSES
    // ========================================================================
    for (const niche of niches.slice(0, 3)) {
      try {
        // Build search query
        const locationParts = [city, area, country].filter(Boolean)
        const location = locationParts.join(', ')
        const searchQuery = `${niche} in ${location}`

        console.log(`Searching Google for: ${searchQuery}`)

        // Search Google
        const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&num=10`

        const response = await fetch(googleUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
          },
        })

        if (!response.ok) {
          console.error(`Google search failed: ${response.status}`)
          continue
        }

        const html = await response.text()
        const doc = new DOMParser().parseFromString(html, 'text/html')

        if (!doc) {
          console.error('Failed to parse HTML')
          continue
        }

        // Extract search results
        const results = doc.querySelectorAll('div.g, div[data-sokoban-container]')

        console.log(`Found ${results.length} search results`)

        for (const result of Array.from(results).slice(0, limit)) {
          try {
            // Extract title and link
            const titleElement = result.querySelector('h3')
            const linkElement = result.querySelector('a[href^="http"]')

            if (!titleElement || !linkElement) continue

            const title = titleElement.textContent?.trim() || ''
            const url = linkElement.getAttribute('href') || ''

            if (!title || !url || url.includes('google.com')) continue

            // Extract description/snippet
            const snippetElement = result.querySelector('div[data-sncf], div[style*="-webkit-line-clamp"]')
            const description = snippetElement?.textContent?.trim() || ''

            // Clean business name from title
            let businessName = title
              .replace(/\s*[-|–]\s*.*$/, '') // Remove everything after dash or pipe
              .replace(/\s*\(.*?\)\s*/g, '') // Remove parentheses
              .trim()

            if (!businessName || businessName.length < 3) continue

            console.log(`Found: ${businessName} - ${url}`)

            // Try to extract more info from the website
            let websiteData: any = {
              business_name: businessName,
              website: url,
              description: description.substring(0, 500),
              niche: [niche],
              country: country,
              city: city || null,
              state: area || null,
              source: 'search',
              status: 'new',
              priority: 'medium',
            }

            // Attempt to scrape website for contact info
            try {
              const websiteResponse = await fetch(url, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (compatible; ProspectBot/1.0)',
                },
                signal: AbortSignal.timeout(5000), // 5 second timeout
              })

              if (websiteResponse.ok) {
                const websiteHtml = await websiteResponse.text()

                // Extract email
                const emailMatch = websiteHtml.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i)
                if (emailMatch && !emailMatch[0].includes('example.com') && !emailMatch[0].includes('sentry')) {
                  websiteData.email = emailMatch[0]
                }

                // Extract phone number (various formats)
                const phoneMatch = websiteHtml.match(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/)
                if (phoneMatch) {
                  websiteData.phone = phoneMatch[0].replace(/\s+/g, ' ').trim()
                }

                // Extract social media links
                const fbMatch = websiteHtml.match(/(?:https?:\/\/)?(?:www\.)?facebook\.com\/[a-zA-Z0-9.-]+/i)
                if (fbMatch) websiteData.facebook_url = fbMatch[0]

                const igMatch = websiteHtml.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/[a-zA-Z0-9._]+/i)
                if (igMatch) websiteData.instagram_url = igMatch[0]

                const liMatch = websiteHtml.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:company|in)\/[a-zA-Z0-9-]+/i)
                if (liMatch) websiteData.linkedin_url = liMatch[0]

                const twMatch = websiteHtml.match(/(?:https?:\/\/)?(?:www\.)?(?:twitter|x)\.com\/[a-zA-Z0-9_]+/i)
                if (twMatch) websiteData.twitter_url = twMatch[0]

                // Extract address (simple pattern)
                const addressMatch = websiteHtml.match(/\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way)[,\s]+[A-Za-z\s]+,\s*[A-Z]{2}\s+\d{5}/i)
                if (addressMatch) {
                  websiteData.address = addressMatch[0]
                }

                console.log(`Extracted contact info: email=${!!emailMatch}, phone=${!!phoneMatch}`)
              }
            } catch (error) {
              console.log(`Could not scrape website ${url}: ${error.message}`)
            }

            // Check if prospect already exists
            const { data: existing } = await supabaseClient
              .from('prospects')
              .select('id')
              .eq('user_id', user.id)
              .eq('website', url)
              .single()

            if (existing) {
              console.log(`Prospect already exists: ${businessName}`)
              continue
            }

            // Add user_id
            websiteData.user_id = user.id

            discoveredProspects.push(websiteData)

            // Stop if we've reached the limit
            if (discoveredProspects.length >= limit) {
              break
            }

          } catch (error) {
            console.error('Error processing result:', error)
            continue
          }
        }

        // Stop searching if we have enough prospects
        if (discoveredProspects.length >= limit) {
          break
        }

        // Small delay between searches to be respectful
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        console.error(`Error searching for ${niche}:`, error)
        continue
      }
    }

    // ========================================================================
    // SAVE PROSPECTS TO DATABASE
    // ========================================================================
    if (discoveredProspects.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No new prospects found',
          count: 0,
          prospects: []
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    const { data: savedProspects, error: insertError } = await supabaseClient
      .from('prospects')
      .insert(discoveredProspects)
      .select()

    if (insertError) {
      console.error('Error saving prospects:', insertError)
      throw new Error(`Failed to save prospects: ${insertError.message}`)
    }

    // Log activity for each prospect
    const activities = savedProspects.map(prospect => ({
      prospect_id: prospect.id,
      user_id: user.id,
      activity_type: 'prospect_discovered',
      description: `Prospect discovered via search: ${niches.join(', ')}`,
      metadata: {
        niches: niches,
        location: { country, city, area }
      }
    }))

    await supabaseClient
      .from('prospect_activities')
      .insert(activities)

    console.log(`Successfully saved ${savedProspects.length} prospects`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Found ${savedProspects.length} new prospects`,
        count: savedProspects.length,
        prospects: savedProspects
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error searching prospects:', error)

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
