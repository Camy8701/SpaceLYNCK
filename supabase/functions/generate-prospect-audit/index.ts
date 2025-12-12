// ============================================================================
// GENERATE PROSPECT AUDIT - Supabase Edge Function
// Analyzes prospect websites and generates comprehensive audit reports
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AuditPayload {
  prospectId: string
  website: string
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

    const { prospectId, website } = await req.json() as AuditPayload

    if (!website) {
      throw new Error('Website URL is required')
    }

    // Get prospect details
    const { data: prospect, error: prospectError } = await supabaseClient
      .from('prospects')
      .select('*')
      .eq('id', prospectId)
      .single()

    if (prospectError || !prospect) {
      throw new Error('Prospect not found')
    }

    console.log(`Generating audit for: ${website}`)

    // Initialize audit data
    const auditData: any = {
      prospect_id: prospectId,
      user_id: prospect.user_id,
      audit_type: 'basic',
      status: 'completed',
    }

    // ========================================================================
    // FETCH WEBSITE HTML
    // ========================================================================
    let html = ''
    let fetchSuccess = false
    let loadTimeMs = 0

    try {
      const startTime = performance.now()
      const websiteUrl = website.startsWith('http') ? website : `https://${website}`

      const response = await fetch(websiteUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ProspectAuditBot/1.0)',
        },
        redirect: 'follow',
      })

      loadTimeMs = performance.now() - startTime

      if (response.ok) {
        html = await response.text()
        fetchSuccess = true
      }
    } catch (error) {
      console.error('Error fetching website:', error)
      fetchSuccess = false
    }

    // ========================================================================
    // SEO AUDIT
    // ========================================================================
    let seoScore = 0
    let seoChecks = 0
    const seoTotal = 8

    // Check title tag
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i)
    const seoTitleOptimized = titleMatch && titleMatch[1].length > 10 && titleMatch[1].length < 70
    if (seoTitleOptimized) seoChecks++

    // Check meta description
    const metaDescMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)
    const seoMetaDescription = metaDescMatch && metaDescMatch[1].length > 50 && metaDescMatch[1].length < 160
    if (seoMetaDescription) seoChecks++

    // Check headings structure (H1)
    const h1Match = html.match(/<h1[^>]*>.*?<\/h1>/i)
    const seoHeadingsStructure = !!h1Match
    if (seoHeadingsStructure) seoChecks++

    // Check mobile-friendly viewport
    const viewportMatch = html.match(/<meta\s+name=["']viewport["']/i)
    const seoMobileFriendly = !!viewportMatch
    if (seoMobileFriendly) seoChecks++

    // Check HTTPS
    const seoHttpsEnabled = website.startsWith('https://')
    if (seoHttpsEnabled) seoChecks++

    // Check robots.txt
    let seoRobotsTxt = false
    try {
      const robotsUrl = website.replace(/\/$/, '') + '/robots.txt'
      const robotsResponse = await fetch(robotsUrl)
      seoRobotsTxt = robotsResponse.ok
      if (seoRobotsTxt) seoChecks++
    } catch (e) {
      seoRobotsTxt = false
    }

    // Check sitemap
    const sitemapMatch = html.match(/sitemap\.xml/i)
    const seoSitemapExists = !!sitemapMatch
    if (seoSitemapExists) seoChecks++

    // Check schema markup
    const schemaMatch = html.match(/schema\.org|application\/ld\+json/i)
    const seoSchemaMarkup = !!schemaMatch
    if (seoSchemaMarkup) seoChecks++

    seoScore = (seoChecks / seoTotal) * 100

    auditData.seo_score = seoScore
    auditData.seo_title_optimized = seoTitleOptimized
    auditData.seo_meta_description = seoMetaDescription
    auditData.seo_headings_structure = seoHeadingsStructure
    auditData.seo_mobile_friendly = seoMobileFriendly
    auditData.seo_https_enabled = seoHttpsEnabled
    auditData.seo_sitemap_exists = seoSitemapExists
    auditData.seo_robots_txt = seoRobotsTxt
    auditData.seo_schema_markup = seoSchemaMarkup

    // ========================================================================
    // PERFORMANCE AUDIT
    // ========================================================================
    let performanceScore = 0
    let perfChecks = 0
    const perfTotal = 3

    // Load time analysis
    const loadTimeSec = loadTimeMs / 1000
    auditData.performance_load_time = loadTimeSec

    if (loadTimeSec < 2) perfChecks += 1
    else if (loadTimeSec < 4) perfChecks += 0.5

    // Page size analysis
    const pageSizeMB = html.length / (1024 * 1024)
    auditData.performance_page_size = pageSizeMB

    if (pageSizeMB < 1) perfChecks += 1
    else if (pageSizeMB < 3) perfChecks += 0.5

    // Count external resources
    const scriptMatches = html.match(/<script/gi) || []
    const cssMatches = html.match(/<link[^>]*rel=["']stylesheet["']/gi) || []
    const imgMatches = html.match(/<img/gi) || []
    const totalRequests = scriptMatches.length + cssMatches.length + imgMatches.length
    auditData.performance_requests_count = totalRequests

    if (totalRequests < 50) perfChecks += 1
    else if (totalRequests < 100) perfChecks += 0.5

    performanceScore = (perfChecks / perfTotal) * 100

    auditData.performance_score = performanceScore
    auditData.performance_fcp = loadTimeSec * 0.6 // Estimate
    auditData.performance_lcp = loadTimeSec * 0.8 // Estimate
    auditData.performance_cls = 0.1 // Estimate

    // ========================================================================
    // ONLINE PRESENCE AUDIT
    // ========================================================================
    let onlinePresenceScore = 0
    let presenceChecks = 0
    const presenceTotal = 6

    const hasFacebook = prospect.facebook_url || html.match(/facebook\.com/i)
    const hasInstagram = prospect.instagram_url || html.match(/instagram\.com/i)
    const hasLinkedin = prospect.linkedin_url || html.match(/linkedin\.com/i)
    const hasTwitter = prospect.twitter_url || html.match(/twitter\.com|x\.com/i)
    const hasGoogleBusiness = prospect.google_business_url || html.match(/google\.com\/maps|business\.google\.com/i)
    const hasYelp = prospect.yelp_url || html.match(/yelp\.com/i)

    if (hasFacebook) presenceChecks++
    if (hasInstagram) presenceChecks++
    if (hasLinkedin) presenceChecks++
    if (hasTwitter) presenceChecks++
    if (hasGoogleBusiness) presenceChecks++
    if (hasYelp) presenceChecks++

    onlinePresenceScore = (presenceChecks / presenceTotal) * 100

    auditData.online_presence_score = onlinePresenceScore
    auditData.has_facebook = !!hasFacebook
    auditData.has_instagram = !!hasInstagram
    auditData.has_linkedin = !!hasLinkedin
    auditData.has_twitter = !!hasTwitter
    auditData.has_google_business = !!hasGoogleBusiness
    auditData.has_yelp = !!hasYelp

    // ========================================================================
    // REPUTATION AUDIT (Mock data - real implementation would use APIs)
    // ========================================================================
    // In production, you'd use Google Places API, Yelp API, Facebook API
    let reputationScore = 50 // Default moderate score

    auditData.reputation_score = reputationScore
    auditData.google_rating = null
    auditData.google_reviews_count = 0
    auditData.yelp_rating = null
    auditData.yelp_reviews_count = 0
    auditData.facebook_rating = null
    auditData.facebook_reviews_count = 0

    // ========================================================================
    // LEAD CAPTURE AUDIT
    // ========================================================================
    let leadCaptureScore = 0
    let leadChecks = 0
    const leadTotal = 5

    const hasContactForm = html.match(/<form/i) && html.match(/email|contact|message/i)
    const hasPhoneNumber = html.match(/\(\d{3}\)\s*\d{3}-\d{4}|\d{3}-\d{3}-\d{4}|tel:/i)
    const hasEmail = html.match(/mailto:|[\w\.-]+@[\w\.-]+\.\w+/i)
    const hasChatWidget = html.match(/intercom|drift|tawk\.to|crisp|livechat|zendesk/i)
    const hasBookingSystem = html.match(/calendly|acuity|booksy|setmore|appointment|book now/i)

    if (hasContactForm) leadChecks++
    if (hasPhoneNumber) leadChecks++
    if (hasEmail) leadChecks++
    if (hasChatWidget) leadChecks++
    if (hasBookingSystem) leadChecks++

    leadCaptureScore = (leadChecks / leadTotal) * 100

    auditData.lead_capture_score = leadCaptureScore
    auditData.has_contact_form = !!hasContactForm
    auditData.has_phone_number = !!hasPhoneNumber
    auditData.has_email = !!hasEmail
    auditData.has_chat_widget = !!hasChatWidget
    auditData.has_booking_system = !!hasBookingSystem

    // ========================================================================
    // LOCAL SEO AUDIT
    // ========================================================================
    let localSeoScore = 0
    let localChecks = 0
    const localTotal = 3

    // Check NAP consistency (Name, Address, Phone)
    const hasName = html.match(new RegExp(prospect.business_name, 'i'))
    const hasAddress = prospect.address && html.match(new RegExp(prospect.address.substring(0, 20), 'i'))
    const hasPhone = prospect.phone && html.match(new RegExp(prospect.phone.replace(/\D/g, '').substring(0, 6)))

    const napConsistency = !!(hasName && (hasAddress || hasPhone))
    if (napConsistency) localChecks++

    // Check for local business schema
    const localBusinessSchema = html.match(/LocalBusiness|Restaurant|Store|ProfessionalService/i)
    if (localBusinessSchema) localChecks++

    // Check Google Business optimization
    const googleBusinessOptimized = !!hasGoogleBusiness
    if (googleBusinessOptimized) localChecks++

    localSeoScore = (localChecks / localTotal) * 100

    auditData.local_seo_score = localSeoScore
    auditData.nap_consistency = napConsistency
    auditData.local_citations_count = 0 // Would need API to check
    auditData.google_business_optimized = googleBusinessOptimized

    // ========================================================================
    // CALCULATE OVERALL SCORE
    // ========================================================================
    const overallScore = (
      seoScore * 0.25 +
      performanceScore * 0.20 +
      onlinePresenceScore * 0.15 +
      reputationScore * 0.15 +
      leadCaptureScore * 0.15 +
      localSeoScore * 0.10
    )

    auditData.overall_score = overallScore

    // ========================================================================
    // GENERATE FINDINGS AND RECOMMENDATIONS
    // ========================================================================
    const findings: any = {
      seo: [],
      performance: [],
      online_presence: [],
      reputation: [],
      lead_capture: [],
      local_seo: []
    }

    const recommendations: any = {
      critical: [],
      important: [],
      nice_to_have: []
    }

    // SEO findings
    if (!seoTitleOptimized) {
      findings.seo.push('Missing or poorly optimized title tag')
      recommendations.critical.push('Add a unique, descriptive title tag (10-70 characters)')
    }
    if (!seoMetaDescription) {
      findings.seo.push('Missing or poorly optimized meta description')
      recommendations.important.push('Add a compelling meta description (50-160 characters)')
    }
    if (!seoHttpsEnabled) {
      findings.seo.push('Website not using HTTPS')
      recommendations.critical.push('Enable HTTPS with SSL certificate for security and SEO')
    }
    if (!seoMobileFriendly) {
      findings.seo.push('Missing viewport meta tag for mobile optimization')
      recommendations.critical.push('Add viewport meta tag for mobile responsiveness')
    }

    // Performance findings
    if (loadTimeSec > 3) {
      findings.performance.push(`Slow load time: ${loadTimeSec.toFixed(2)} seconds`)
      recommendations.critical.push('Optimize images, minify CSS/JS, enable caching to improve load time')
    }
    if (pageSizeMB > 3) {
      findings.performance.push(`Large page size: ${pageSizeMB.toFixed(2)} MB`)
      recommendations.important.push('Compress images and assets to reduce page size')
    }

    // Lead capture findings
    if (!hasContactForm) {
      findings.lead_capture.push('No contact form detected')
      recommendations.important.push('Add a contact form to capture leads easily')
    }
    if (!hasPhoneNumber) {
      findings.lead_capture.push('No phone number visible on website')
      recommendations.important.push('Display phone number prominently for customer contact')
    }
    if (!hasChatWidget) {
      findings.lead_capture.push('No live chat widget detected')
      recommendations.nice_to_have.push('Consider adding live chat for instant customer engagement')
    }

    // Local SEO findings
    if (!napConsistency) {
      findings.local_seo.push('NAP (Name, Address, Phone) not consistently displayed')
      recommendations.important.push('Ensure business name, address, and phone are clearly visible')
    }
    if (!googleBusinessOptimized) {
      findings.local_seo.push('Google Business Profile not linked or optimized')
      recommendations.critical.push('Claim and optimize Google Business Profile for local visibility')
    }

    auditData.detailed_findings = findings
    auditData.recommendations = recommendations

    // ========================================================================
    // SAVE AUDIT TO DATABASE
    // ========================================================================
    const { data: audit, error: auditError } = await supabaseClient
      .from('prospect_audits')
      .insert(auditData)
      .select()
      .single()

    if (auditError) {
      throw new Error(`Failed to save audit: ${auditError.message}`)
    }

    // Update prospect with audit status
    await supabaseClient
      .from('prospects')
      .update({
        audit_generated: true,
        audit_generated_at: new Date().toISOString(),
        audit_score: overallScore,
        last_activity_at: new Date().toISOString()
      })
      .eq('id', prospectId)

    // Log activity
    await supabaseClient
      .from('prospect_activities')
      .insert({
        prospect_id: prospectId,
        user_id: prospect.user_id,
        activity_type: 'audit_generated',
        description: `Audit report generated - Overall score: ${overallScore.toFixed(0)}%`,
        metadata: {
          audit_id: audit.id,
          overall_score: overallScore
        }
      })

    console.log(`Audit completed for ${website} - Score: ${overallScore.toFixed(0)}%`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Audit generated successfully',
        audit: {
          id: audit.id,
          overall_score: overallScore,
          seo_score: seoScore,
          performance_score: performanceScore,
          online_presence_score: onlinePresenceScore,
          reputation_score: reputationScore,
          lead_capture_score: leadCaptureScore,
          local_seo_score: localSeoScore
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error generating audit:', error)

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
