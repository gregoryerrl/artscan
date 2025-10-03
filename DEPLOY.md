# Cloudflare Pages Deployment Guide

## Project Setup

This is a **static site** (no server-side code needed for deployment). Cloudflare Pages will serve the files directly.

## Deployment Steps

### 1. Push to GitHub/GitLab
Your repository is ready to deploy. Make sure all changes are committed and pushed.

```bash
git add .
git commit -m "Prepare for Cloudflare Pages deployment"
git push origin main
```

### 2. Deploy to Cloudflare Pages

1. Go to [Cloudflare Pages Dashboard](https://dash.cloudflare.com/)
2. Click **"Create a project"**
3. Connect your Git repository (GitHub/GitLab)
4. Select your repository: `artscan`

### 3. Build Configuration

Use these settings:

- **Framework preset**: `None`
- **Build command**: (leave empty)
- **Build output directory**: `/` (root directory)
- **Root directory**: `/` (default)

### 4. Environment Variables

No environment variables needed for this project.

### 5. Deploy

Click **"Save and Deploy"**

Your site will be live at: `https://your-project-name.pages.dev`

## Important Notes

### Camera Permissions
- ✅ Camera will work automatically (HTTPS enabled by default)
- ✅ Works on iOS and Android
- ✅ No additional configuration needed

### Files Structure
The following files are served statically:
- `index.html` - Main page
- `app.js` - Application logic
- `styles.css` - Styling
- `test-images/` - Reference artwork images
- `_headers` - Security headers for Cloudflare Pages

### Server.js Note
The `server.js` file is **not used** in production. Cloudflare Pages serves static files directly. The Express server is only for local development.

## Testing Locally

For local development with HTTPS (to test camera):
```bash
npm start  # Runs on http://localhost:8000
```

## Custom Domain (Optional)

After deployment, you can add a custom domain:
1. Go to your project settings in Cloudflare Pages
2. Click **"Custom domains"**
3. Add your domain and follow DNS instructions

## Troubleshooting

### Camera not working
- Ensure you're accessing via HTTPS (Cloudflare Pages uses HTTPS by default)
- Check browser permissions (allow camera access)
- Try different browsers (Chrome, Safari, Firefox)

### Images not loading
- Check that `test-images/` folder is committed to git
- Verify CORS headers in `_headers` file

### OpenCV.js loading issues
- Check browser console for errors
- Ensure CDN is accessible: `https://docs.opencv.org/4.5.0/opencv.js`
- Wait for full page load (OpenCV.js is ~8MB)
