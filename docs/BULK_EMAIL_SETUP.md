# Bulk Email Feature - Setup Guide

## Overview

This document provides step-by-step instructions for setting up the Bulk Email Marketing feature in your ProjectFlow application.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     BULK EMAIL SYSTEM                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  React Frontend                                                  │
│  ├── BulkEmailDashboard (main hub)                              │
│  ├── ContactManager (CSV import, prospects, manual)             │
│  ├── CampaignBuilder (create, schedule, send)                   │
│  ├── TemplateManager (Canva HTML upload)                        │
│  └── EmailAnalytics (tracking, reports)                         │
│                          │                                       │
│                          ▼                                       │
│  Supabase Backend                                                │
│  ├── Database (contacts, campaigns, templates, analytics)       │
│  ├── Edge Functions (send-campaign, process-scheduled)          │
│  └── Webhooks (email-webhook for tracking)                      │
│                          │                                       │
│                          ▼                                       │
│  Resend Email API                                                │
│  └── Sends emails & provides tracking events                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

1. **Supabase Account** - [Sign up at supabase.com](https://supabase.com)
2. **Resend Account** - [Sign up at resend.com](https://resend.com)
3. **Verified Domain** - For sending emails (in Resend)

---

## Step 1: Set Up Supabase

### 1.1 Create a New Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Fill in project details and wait for setup

### 1.2 Run Database Schema

1. Go to **SQL Editor** in your Supabase dashboard
2. Copy the contents of `/supabase/schema/email_marketing.sql`
3. Paste and run the SQL script
4. This creates all required tables:
   - `email_contacts`
   - `email_lists`
   - `email_list_contacts`
   - `email_segments`
   - `email_templates`
   - `email_campaigns`
   - `email_sends`
   - `email_analytics_events`
   - `email_unsubscribes`
   - `email_queue`
   - `csv_imports`

### 1.3 Get API Keys

1. Go to **Settings > API**
2. Copy:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`

---

## Step 2: Set Up Resend

### 2.1 Create Account & Get API Key

1. Go to [Resend Dashboard](https://resend.com)
2. Navigate to **API Keys**
3. Create a new API key
4. Copy the key (starts with `re_`)

### 2.2 Verify Your Domain

1. Go to **Domains** in Resend
2. Click "Add Domain"
3. Add DNS records as instructed
4. Wait for verification (can take a few minutes to hours)

### 2.3 Configure Webhook (for tracking)

1. Go to **Webhooks** in Resend
2. Add a new webhook endpoint:
   - URL: `https://YOUR_PROJECT.supabase.co/functions/v1/email-webhook`
   - Events: Select all (delivered, opened, clicked, bounced, complained)

---

## Step 3: Deploy Supabase Edge Functions

### 3.1 Install Supabase CLI

```bash
npm install -g supabase
```

### 3.2 Login to Supabase

```bash
supabase login
```

### 3.3 Link Your Project

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

### 3.4 Set Edge Function Secrets

```bash
supabase secrets set RESEND_API_KEY=re_your_api_key
```

### 3.5 Deploy Functions

```bash
# Deploy all functions
supabase functions deploy send-campaign
supabase functions deploy process-scheduled
supabase functions deploy email-webhook
```

---

## Step 4: Configure Frontend

### 4.1 Create Environment File

```bash
cp .env.example .env
```

### 4.2 Add Your Keys

Edit `.env`:
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4.3 Restart Development Server

```bash
npm run dev
```

---

## Step 5: Set Up Scheduled Campaign Processing (Optional)

For scheduled campaigns to work automatically, set up a cron job:

### Using Supabase pg_cron

Run in SQL Editor:
```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule to check every minute
SELECT cron.schedule(
  'process-scheduled-campaigns',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/process-scheduled',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  );
  $$
);
```

### Alternative: External Cron Service

Use services like:
- [cron-job.org](https://cron-job.org)
- [EasyCron](https://www.easycron.com)
- GitHub Actions scheduled workflow

---

## Usage Guide

### Adding Contacts

1. **Manual Entry**: Click "Add Contact" and fill in details
2. **CSV Import**: Click "Import CSV" and upload your file
3. **From Prospects**: Click "From Prospects" to sync prospect data

### Creating Templates

1. Design your email in **Canva**
2. Export as HTML (Share > More > HTML embed)
3. In the app, go to **Templates** > **Add Template**
4. Paste HTML or upload HTML file
5. Use variables like `{{first_name}}` for personalization

### Creating Campaigns

1. Go to **Campaigns** > **New Campaign**
2. Fill in:
   - Campaign name
   - Subject line
   - From name & email
3. Select a template or paste HTML
4. Choose recipients (all contacts or specific list)
5. Schedule or send immediately

### Viewing Analytics

- Go to **Analytics** tab
- View overall stats and campaign performance
- See open rates, click rates, bounce rates
- Compare against industry benchmarks

---

## Personalization Variables

Use these in your templates:

| Variable | Description |
|----------|-------------|
| `{{first_name}}` | Contact's first name |
| `{{last_name}}` | Contact's last name |
| `{{full_name}}` | Full name |
| `{{email}}` | Email address |
| `{{company}}` | Company name |

---

## Troubleshooting

### Emails Not Sending

1. Check Resend API key is correct
2. Verify domain is verified in Resend
3. Check Supabase Edge Function logs
4. Ensure contacts have valid email addresses

### Webhooks Not Working

1. Verify webhook URL is correct in Resend
2. Check Edge Function is deployed
3. Look at Supabase Function logs for errors

### Low Open Rates

1. Check spam folder
2. Improve subject lines
3. Verify sender domain reputation
4. Use double opt-in for contacts

---

## Cost Estimates

| Service | Free Tier | Paid Tier |
|---------|-----------|-----------|
| **Supabase** | 500MB DB, 2GB bandwidth | $25/mo (8GB DB, 50GB bandwidth) |
| **Resend** | 3,000 emails/month | $20/mo (50,000 emails) |

**Monthly estimate for 50,000 emails**: ~$45/month

---

## File Structure

```
/src/
├── components/
│   └── email/
│       ├── BulkEmailDashboard.jsx
│       ├── ContactManager.jsx
│       ├── CampaignBuilder.jsx
│       ├── TemplateManager.jsx
│       ├── EmailAnalytics.jsx
│       └── index.js
├── services/
│   └── emailService.js
├── lib/
│   └── supabase.js
└── pages/
    └── marketing/
        └── MarketingToolsView.jsx

/supabase/
├── schema/
│   └── email_marketing.sql
└── functions/
    ├── send-campaign/
    │   └── index.ts
    ├── process-scheduled/
    │   └── index.ts
    └── email-webhook/
        └── index.ts
```

---

## Support

For issues or questions:
1. Check Supabase documentation
2. Check Resend documentation
3. Review Edge Function logs
4. Check browser console for frontend errors
