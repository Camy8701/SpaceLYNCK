# SpaceLYNCK - Deployment Guide

## 🚀 Deploy to Netlify

### Step 1: Connect GitHub Repository
1. Go to https://app.netlify.com
2. Click "Add new site" → "Import an existing project"
3. Choose "GitHub" and authorize Netlify
4. Select your repository: `Camy8701/SpaceLYNCK`

### Step 2: Configure Build Settings
Netlify should auto-detect these, but verify:

- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Node version**: 18 or higher

### Step 3: Set Environment Variables

⚠️ **IMPORTANT**: You need to set these in Netlify's dashboard

#### Go to: Site settings → Environment variables → Add variables

**Required Variables (for Base44 backend):**

| Variable Name | Value | Description |
|---------------|-------|-------------|
| `VITE_BASE44_APP_ID` | `your_app_id` | Base44 application ID |
| `VITE_BASE44_BACKEND_URL` | `https://api.base44.com` | Base44 backend URL |

**Where to find these values:**
- If you have Base44 credentials: Check your Base44 dashboard
- If you don't: Leave blank for now (app will work with limited features)

### Step 4: Deploy!
1. Click "Deploy site"
2. Wait 2-3 minutes for build to complete
3. Your site will be live at: `https://your-site-name.netlify.app`

---

## 🌐 Deploy to Vercel (Alternative)

### Step 1: Connect Repository
1. Go to https://vercel.com
2. Click "Add New Project"
3. Import `Camy8701/SpaceLYNCK` from GitHub

### Step 2: Configure Project
Vercel auto-detects Vite projects, but verify:
- **Framework**: Vite
- **Build command**: `npm run build`
- **Output directory**: `dist`

### Step 3: Environment Variables

Click "Environment Variables" and add:

```
VITE_BASE44_APP_ID=your_app_id_here
VITE_BASE44_BACKEND_URL=https://api.base44.com
```

### Step 4: Deploy!
Click "Deploy" and wait ~2 minutes.

---

## 🔧 Local Development Setup

### 1. Clone the repository (if not already done)
```bash
git clone https://github.com/Camy8701/SpaceLYNCK.git
cd SpaceLYNCK
```

### 2. Install dependencies
```bash
npm install
```

### 3. Create `.env` file
```bash
cp .env.example .env
```

### 4. Edit `.env` and add your credentials
```
VITE_BASE44_APP_ID=your_app_id
VITE_BASE44_BACKEND_URL=your_backend_url
```

### 5. Run development server
```bash
npm run dev
```

App will be available at `http://localhost:5173`

---

## 🔄 Future: Migrate to Supabase

When you're ready to migrate from Base44 to Supabase:

### 1. Create Supabase Project
- Go to https://supabase.com
- Create new project
- Copy your project URL and anon key

### 2. Update Environment Variables

**On Netlify/Vercel:**
Add these new variables:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

**Locally:**
Update your `.env` file with the same values

### 3. Code Migration
We'll need to:
- Replace `@base44/sdk` with `@supabase/supabase-js`
- Update `src/api/base44Client.js` to use Supabase
- Migrate authentication logic
- Update database queries

*(I can help with all of this when you're ready!)*

---

## 📊 Performance Optimization (Before Deployment)

Before deploying, consider these optimizations:

### Remove Unused Dependencies
```bash
npm uninstall three
```
(Saves ~600KB - it's not being used)

### Enable Compression
Both Netlify and Vercel automatically compress assets, but you can verify:
- Gzip compression: ✅ Enabled by default
- Brotli compression: ✅ Enabled by default

---

## 🐛 Troubleshooting

### Build Fails on Netlify/Vercel
**Error**: `Cannot find module '@base44/sdk'`
- **Fix**: Environment variables not set. Add them in dashboard.

### App Loads but Shows Errors
**Error**: Base44 connection failed
- **Fix**: Check environment variable values are correct
- **Alternative**: Leave blank to run in offline mode

### Performance Issues
- See the performance report in the main README
- UnicornStudio background may be heavy - consider disabling for production

---

## 📝 Notes

- **Base44 SDK**: Still used for now, will be replaced with Supabase later
- **Environment Variables**: Never commit `.env` to Git (already in `.gitignore`)
- **Cost**: Netlify/Vercel free tier is perfect for this app
- **Custom Domain**: Can be added in Netlify/Vercel dashboard after deployment

---

Need help with deployment? Check the build logs or ask for assistance!
