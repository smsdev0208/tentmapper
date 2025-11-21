# Deployment Guide

## Quick Start - Test Locally

1. **Open in browser**:
   ```bash
   # Navigate to the project directory
   cd tentmapper
   
   # Open index.html directly in your browser
   # OR use a local server:
   python -m http.server 8000
   # Then visit: http://localhost:8000
   ```

2. **Test the app**:
   - The map should load centered on Seattle
   - Click anywhere on the map to report a tent
   - Try uploading a photo (optional)
   - Submit the report and watch it appear on the map
   - Click a tent marker and vote on it

## Deploy Firebase Rules

Before going live, you MUST deploy the security rules:

### Option 1: Manual (via Console)

1. **Firestore Rules**:
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Select your project: `tent-mapper`
   - Navigate to: Firestore Database > Rules
   - Copy contents from `firestore.rules`
   - Paste and publish

2. **Storage Rules**:
   - Navigate to: Storage > Rules
   - Copy contents from `storage.rules`
   - Paste and publish

### Option 2: Using Firebase CLI (Recommended)

```bash
# Install Firebase CLI (if not already installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project
firebase init

# Select:
# - Firestore (Configure rules)
# - Storage (Configure rules)
# - Use existing project: tent-mapper

# Deploy rules
firebase deploy --only firestore:rules,storage:rules
```

## Deploy to GitHub Pages

### Step 1: Commit Your Code

```bash
# Check what will be committed
git status

# Add all files (respects .gitignore)
git add .

# Commit
git commit -m "Add Seattle Tent Mapper web application"

# Push to GitHub
git push origin main
```

### Step 2: Enable GitHub Pages

1. Go to your repository on GitHub: `https://github.com/yourusername/tentmapper`
2. Click **Settings** (top navigation)
3. Scroll to **Pages** (left sidebar)
4. Under "Source":
   - Branch: `main`
   - Folder: `/ (root)`
5. Click **Save**
6. Wait 1-2 minutes for deployment
7. Your site will be live at: `https://yourusername.github.io/tentmapper/`

### Step 3: Update reCAPTCHA Domains

1. Go to [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin)
2. Select your site key: `6LctphMsAAAAAF7GKY3kY3AZ1TAg8fdyHqvqUfKL`
3. Click **Settings** (gear icon)
4. Under "Domains", add:
   - `yourusername.github.io`
   - Keep `localhost` for local testing
5. Save

## Verify Deployment

1. Visit your GitHub Pages URL
2. Open browser DevTools (F12) > Console
3. Check for errors:
   - ✅ "Firebase initialized successfully"
   - ✅ "Map initialized and listening for tent updates"
   - ✅ "Voting system initialized"

4. Test functionality:
   - Map loads and displays Seattle
   - Can click to place tent
   - Can submit tent (check Firebase Console > Firestore for new document)
   - Can vote on tents
   - Photos upload (check Firebase Console > Storage)

## Troubleshooting Deployment

### "Failed to load resource" errors
- Check Firebase config in `js/firebase-config.js`
- Verify project ID matches your Firebase project

### "Permission denied" errors
- Deploy Firestore and Storage rules (see above)
- Check rules in Firebase Console

### reCAPTCHA errors
- Verify site key is correct
- Ensure GitHub Pages domain is added to reCAPTCHA
- Check browser console for specific error messages

### Map doesn't load
- Check internet connection (Leaflet loads tiles from CDN)
- Verify no content security policy issues

## Post-Deployment

### Monitor Usage

Check Firebase Console regularly:
- **Firestore**: Database size and read/write operations
- **Storage**: Storage used and bandwidth
- **Free tier limits**: Stay under 50K reads/day, 20K writes/day

### Share Your App

Once deployed, share your GitHub Pages URL:
```
https://yourusername.github.io/tentmapper/
```

### Next Steps

1. Test with friends/family
2. Gather feedback
3. Monitor for spam (reCAPTCHA should help)
4. Consider Phase 2: Mobile apps
5. Consider Phase 3: Automated vote processing with Cloud Functions

## Custom Domain (Optional)

If you want a custom domain instead of github.io:

1. Buy a domain (e.g., from Namecheap, Google Domains)
2. In repository settings > Pages, add custom domain
3. Create CNAME record in your DNS settings pointing to: `yourusername.github.io`
4. Wait for DNS propagation (up to 24 hours)
5. Update reCAPTCHA domains to include your custom domain

## Production Considerations

Before heavy use:

1. **Upgrade Firebase**: Free tier may not be enough for high traffic
2. **Implement rate limiting**: Consider Cloud Functions for better validation
3. **Add analytics**: Track usage patterns
4. **Backup data**: Regular Firestore exports
5. **Monitor costs**: Set up billing alerts

## Support

Questions or issues? Check:
- Firebase Console for errors
- Browser DevTools console
- GitHub Issues for this project

