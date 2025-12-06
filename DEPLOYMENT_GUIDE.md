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

### Step 3: Deploy!
1. Click "Deploy site"
2. Wait 2-3 minutes for build to complete
3. Your site will be live at: `https://your-site-name.netlify.app`

**Note**: The app currently works standalone without backend dependencies. Environment variables are not required for basic deployment.

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

### Step 3: Deploy!
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

### 3. Run development server
```bash
npm run dev
```

App will be available at `http://localhost:5173`

---

## 🔄 Future: Add Backend with Supabase

When you're ready to add backend features (user authentication, data persistence):

### 1. Create Supabase Project
- Go to https://supabase.com
- Create new project
- Copy your project URL and anon key

### 2. Update Environment Variables

**On Netlify/Vercel:**
Add these new variables in the dashboard:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

**Locally:**
Create a `.env` file:
```bash
cp .env.example .env
```

Then add your credentials to `.env`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Code Integration
Install Supabase client:
```bash
npm install @supabase/supabase-js
```

Then integrate authentication and data features as needed.

---

## 📊 Performance Optimization

The app has been optimized for performance:

### Removed Dependencies
- ✅ Base44 SDK removed (saved ~500KB)
- ✅ three.js removed (saved ~600KB - was unused)

### Enabled Compression
Both Netlify and Vercel automatically compress assets:
- Gzip compression: ✅ Enabled by default
- Brotli compression: ✅ Enabled by default

---

## 🐛 Troubleshooting

### Build Fails on Netlify/Vercel
**Error**: Dependencies not installing
- **Fix**: Check that `package.json` is committed to repository
- **Fix**: Ensure Node version is 18 or higher

### App Loads but Shows Blank Page
- **Fix**: Check browser console for errors
- **Fix**: Verify build completed successfully in deployment logs

### UnicornStudio Background Not Loading
- **Fix**: Wait a few seconds for external script to load
- **Fix**: Check network tab in browser DevTools

---

## 📝 Notes

- **Standalone App**: Currently works without backend dependencies
- **Environment Variables**: Not required unless adding backend features
- **Cost**: Netlify/Vercel free tier is perfect for this app
- **Custom Domain**: Can be added in Netlify/Vercel dashboard after deployment
- **Future Backend**: Ready for Supabase integration when needed

---

Need help with deployment? Check the build logs or create an issue on GitHub!
