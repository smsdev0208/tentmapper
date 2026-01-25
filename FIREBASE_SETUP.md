# Firebase Setup Guide for Tent Mapper

This guide walks you through setting up and deploying all Firebase features for the Tent Mapper application.

## Prerequisites

- Node.js 18 or higher installed
- Firebase CLI installed: `npm install -g firebase-tools`
- Firebase project created (tent-mapper)

## Table of Contents

1. [Enable Firebase Authentication](#1-enable-firebase-authentication)
2. [Deploy Firestore Security Rules](#2-deploy-firestore-security-rules)
3. [Deploy Storage Rules](#3-deploy-storage-rules)
4. [Deploy Cloud Functions](#4-deploy-cloud-functions)
5. [Set Up Cloud Scheduler](#5-set-up-cloud-scheduler)
6. [Configure Dev Tools](#6-configure-dev-tools)
7. [Update Web App Configuration](#7-update-web-app-configuration)
8. [Testing](#8-testing)

---

## 1. Enable Firebase Authentication

### Step 1: Enable Anonymous Authentication

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **tent-mapper**
3. In the left sidebar, click **Authentication**
4. Click the **Get started** button (if first time)
5. Go to the **Sign-in method** tab
6. Find **Anonymous** in the list of providers
7. Click on **Anonymous**
8. Toggle the **Enable** switch to ON
9. Click **Save**

### What This Does

- Allows users to authenticate automatically without creating accounts
- Each user gets a persistent anonymous UID
- Prevents abuse by tracking users across sessions
- No personal information is collected

---

## 2. Deploy Firestore Security Rules

### Step 1: Login to Firebase

```bash
firebase login
```

### Step 2: Initialize Firebase (if not already done)

If you haven't initialized Firebase in your project:

```bash
cd tentmapper
firebase init firestore
```

Select:
- Use existing project: **tent-mapper**
- Firestore rules file: **firestore.rules** (default)
- Firestore indexes file: **firestore.indexes.json** (default)

### Step 3: Deploy Security Rules

```bash
firebase deploy --only firestore:rules
```

### What These Rules Do

- **Markers**: Public read, authenticated write only
- **Votes**: Users can only vote once per marker per day
- **User Submissions**: Users can only read/write their own submission counts
- **News**: Public read, system write only

### Verify Deployment

1. Go to Firebase Console > Firestore Database
2. Click the **Rules** tab
3. Verify the rules match the content in `firestore.rules`

---

## 3. Deploy Storage Rules

### Step 1: Deploy Storage Rules

```bash
firebase deploy --only storage
```

### What These Rules Do

- Allow public read access to all photos
- Restrict uploads to images only
- Limit file size to 5MB
- Organize photos by marker ID

### Verify Deployment

1. Go to Firebase Console > Storage
2. Click the **Rules** tab
3. Verify the rules match the content in `storage.rules`

---

## 4. Deploy Cloud Functions

### Step 1: Install Dependencies

```bash
cd functions
npm install
```

### Step 2: Deploy Functions

```bash
firebase deploy --only functions
```

This deploys two functions:
- **processVotes**: HTTP-triggered function for manual voting updates
- **scheduledVoteProcessing**: Scheduled function that runs at midnight PST

### Step 3: Note the Function URL

After deployment, the CLI will display URLs like:
```
Function URL (processVotes): https://us-central1-tent-mapper.cloudfunctions.net/processVotes
```

**Save this URL** - you'll need it for the next steps.

### Troubleshooting

If deployment fails with billing error:
1. Go to Firebase Console > Usage and billing
2. Upgrade to the **Blaze (pay as you go)** plan
3. Don't worry - costs are minimal (see [Cost Estimates](#cost-estimates) below)

---

## 5. Set Up Cloud Scheduler

The `scheduledVoteProcessing` function automatically creates a Cloud Scheduler job, but you may need to verify it's set up correctly.

### Step 1: Verify Scheduler Job

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: **tent-mapper**
3. In the search bar, type "Cloud Scheduler" and select it
4. You should see a job named something like: `firebase-schedule-scheduledVoteProcessing-us-central1`

### Step 2: Check Schedule Configuration

Click on the job and verify:
- **Frequency**: `0 0 * * *` (every day at midnight)
- **Timezone**: `America/Los_Angeles` (PST/PDT)
- **Target**: Your `scheduledVoteProcessing` function

### Step 3: Test the Scheduler (Optional)

1. Click the **RUN NOW** button to test the scheduled function
2. Check the logs in Firebase Console > Functions > Logs
3. Verify that markers were processed correctly

### Manual Schedule Setup (If Needed)

If the scheduler wasn't created automatically:

1. In Cloud Scheduler, click **CREATE JOB**
2. Configure:
   - **Name**: `daily-vote-processing`
   - **Description**: Process daily voting for Tent Mapper
   - **Frequency**: `0 0 * * *`
   - **Timezone**: `America/Los_Angeles`
   - **Target**: Pub/Sub
   - **Topic**: Create new topic: `firebase-schedule-scheduledVoteProcessing`
3. Click **CREATE**

---

## 6. Configure Dev Tools

The dev tools allow you to manage the database from the command line.

### Step 1: Download Service Account Key

1. Go to Firebase Console > Project Settings (gear icon)
2. Go to **Service Accounts** tab
3. Click **Generate New Private Key**
4. Click **Generate Key** in the confirmation dialog
5. Save the downloaded JSON file

### Step 2: Install Dev Tools

```bash
cd scripts
npm install
```

### Step 3: Configure Service Account

Move the downloaded service account key:
```bash
# From your Downloads folder
mv ~/Downloads/tent-mapper-*.json ./service-account-key.json
```

Or on Windows:
```bash
move %USERPROFILE%\Downloads\tent-mapper-*.json service-account-key.json
```

**IMPORTANT**: Never commit this file to git! It's already in `.gitignore`.

### Step 4: Test Dev Tools

```bash
node dev-tools.js stats
```

You should see database statistics displayed.

### Available Commands

- `node dev-tools.js stats` - Show database statistics
- `node dev-tools.js reset-database` - Delete all data
- `node dev-tools.js delete-after 2026-01-20` - Delete markers after date
- `node dev-tools.js clean-images` - Remove orphaned images
- `node dev-tools.js trigger-voting <URL>` - Manually trigger voting

See `scripts/README.md` for detailed usage.

---

## 7. Update Web App Configuration

### Step 1: Update Cloud Function URL

Edit `js/ui.js` and replace the placeholder URL:

```javascript
// Line ~5
const PROCESS_VOTES_FUNCTION_URL = 'https://us-central1-tent-mapper.cloudfunctions.net/processVotes';
```

Use the URL you saved from Step 4.

### Step 2: Deploy Web App

If hosting on Firebase Hosting:

```bash
firebase deploy --only hosting
```

If hosting elsewhere, upload the updated files to your web server.

### Step 3: Test the Dev Button

1. Open the web app
2. The dev trigger button should be visible on the map (if implemented in UI)
3. Click it and verify it calls the Cloud Function successfully

---

## 8. Testing

### Test Authentication

1. Open the web app in an incognito window
2. Open browser console (F12)
3. Look for: `Signed in anonymously: [USER_ID]`
4. Try submitting a marker
5. Check Firebase Console > Authentication - you should see anonymous users

### Test Submission Limits

1. Submit 10 markers in quick succession
2. On the 11th attempt, you should see: "You have reached the daily limit"
3. Check Firestore > userSubmissions collection to see the count

### Test Voting

1. Vote on a pending marker
2. Try voting again - should show "already voted"
3. Check Firestore > votes collection for the vote record
4. Check the marker's votesYes or votesNo count incremented

### Test Cloud Function

#### Manual Trigger:

```bash
curl https://us-central1-tent-mapper.cloudfunctions.net/processVotes
```

Or use the dev tools:
```bash
cd scripts
node dev-tools.js trigger-voting https://us-central1-tent-mapper.cloudfunctions.net/processVotes
```

#### Check Results:

1. Go to Firebase Console > Functions > Logs
2. Look for the processing results
3. Check Firestore to verify marker statuses were updated
4. Check that votes collection was cleared

### Test Scheduled Function

The scheduled function runs automatically at midnight PST. To verify:

1. Wait until after midnight PST
2. Check Firebase Console > Functions > Logs
3. Look for `Scheduled vote processing triggered`
4. Verify markers were processed
5. Check that a news post was created with the daily summary

---

## Cost Estimates

With typical usage, costs should be minimal:

### Free Tier Includes:
- **Firestore**: 50K reads, 20K writes, 20K deletes per day
- **Cloud Functions**: 2M invocations, 400K GB-seconds per month
- **Cloud Scheduler**: 3 jobs free
- **Firebase Auth**: Unlimited (anonymous auth is free)
- **Hosting**: 10 GB storage, 360 MB/day transfer

### Expected Monthly Costs:
- **Cloud Functions**: ~$0 (only 1 invocation per day)
- **Cloud Scheduler**: $0 (under 3 jobs)
- **Firestore**: $0-$5 depending on traffic
- **Storage**: $0-$2 depending on photo uploads

**Total estimated: $0-$7/month** for moderate usage

### Tips to Minimize Costs:
- Enable Cloud Firestore's Delete Protection
- Set up budget alerts in Google Cloud Console
- Regularly run `clean-images` dev tool to remove orphaned photos
- Monitor usage in Firebase Console

---

## Monitoring and Maintenance

### View Function Logs

```bash
firebase functions:log
```

Or in Firebase Console > Functions > Logs

### Monitor Database Usage

1. Go to Firebase Console > Firestore Database
2. Click the **Usage** tab
3. Monitor reads, writes, and storage

### Monitor Storage Usage

1. Go to Firebase Console > Storage
2. Check total storage used
3. Run `node dev-tools.js stats` for detailed breakdown

### Daily Maintenance Tasks

The scheduled function handles:
- ✅ Processing votes
- ✅ Updating marker statuses
- ✅ Clearing old votes
- ✅ Creating news posts

### Weekly Maintenance (Optional)

```bash
# Check database stats
node dev-tools.js stats

# Clean orphaned images
node dev-tools.js clean-images
```

---

## Troubleshooting

### "Permission denied" errors

**Cause**: Firestore rules not deployed or user not authenticated

**Solution**:
1. Verify rules are deployed: `firebase deploy --only firestore:rules`
2. Check browser console for auth errors
3. Clear browser cache and reload

### Cloud Function not found

**Cause**: Functions not deployed or wrong region

**Solution**:
1. Redeploy: `firebase deploy --only functions`
2. Verify the URL matches the deployed region
3. Check Firebase Console > Functions for the correct URL

### Scheduled function not running

**Cause**: Cloud Scheduler not configured

**Solution**:
1. Go to Cloud Scheduler in Google Cloud Console
2. Verify job exists and is enabled
3. Check timezone is set to `America/Los_Angeles`
4. Click RUN NOW to test

### Dev tools can't connect

**Cause**: Service account key missing or invalid

**Solution**:
1. Verify `service-account-key.json` exists in `scripts/` directory
2. Check the JSON file is valid (should start with `{`)
3. Re-download the key from Firebase Console if needed

### "Exceeded daily submission limit" but haven't submitted today

**Cause**: Old submission records not cleared

**Solution**:
The submission tracking is based on UTC dates. Records automatically expire after 24 hours. If needed, manually clear:
```bash
node dev-tools.js reset-database
# Warning: This clears ALL data
```

---

## Security Best Practices

1. **Never commit secrets**:
   - `service-account-key.json` is in `.gitignore`
   - Don't share your service account key
   - Rotate keys periodically

2. **Monitor authentication**:
   - Check Firebase Console > Authentication regularly
   - Look for suspicious patterns (many users from one IP)

3. **Review security rules**:
   - Test with the Firebase Rules Playground
   - Never set `allow read, write: if true` in production

4. **Set up alerts**:
   - Go to Google Cloud Console > Monitoring
   - Set up budget alerts
   - Monitor function error rates

5. **Regular backups**:
   - Export Firestore data periodically
   - Store backups in a separate location

---

## Support

If you encounter issues:

1. Check Firebase Console > Functions > Logs for error messages
2. Review Firestore security rules in Firebase Console
3. Check browser console for client-side errors
4. Verify all environment variables are set correctly

For Firebase-specific issues, see [Firebase Documentation](https://firebase.google.com/docs)

---

## Summary Checklist

After completing this guide, you should have:

- ✅ Anonymous authentication enabled
- ✅ Firestore security rules deployed
- ✅ Storage rules deployed
- ✅ Cloud Functions deployed
- ✅ Cloud Scheduler configured for midnight PST
- ✅ Dev tools configured with service account
- ✅ Web app updated with function URL
- ✅ All systems tested and working

Your Tent Mapper app is now production-ready! 🎉
