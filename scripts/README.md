# Tent Mapper Dev Tools

Command-line tools for managing the Tent Mapper Firebase database.

## Setup

1. **Download Service Account Key**

   Go to [Firebase Console](https://console.firebase.google.com/):
   - Select your project (tent-mapper)
   - Go to Project Settings (gear icon) > Service Accounts
   - Click "Generate New Private Key"
   - Save the downloaded file as `service-account-key.json` in this directory

2. **Install Dependencies**

   ```bash
   cd scripts
   npm install
   ```

## Usage

```bash
node dev-tools.js <command> [args]
```

## Available Commands

### `stats`
Display database statistics including marker counts, votes, and storage usage.

```bash
node dev-tools.js stats
```

Example output:
```
MARKERS:
  Total: 247
  By Type:
    tent: 180
    rv: 42
    encampment: 20
    structure: 5
  By Status:
    verified: 200
    pending: 35
    removed: 12

VOTES: 487 total
USER SUBMISSIONS: 142 records
STORAGE: 89 files (145.32 MB)
NEWS: 15 posts
```

### `reset-database`
Delete ALL data from the database. This removes:
- All markers
- All votes
- All user submission records
- All news posts

**WARNING: This cannot be undone!**

```bash
node dev-tools.js reset-database
```

### `delete-after <date>`
Delete markers created after a specific date. Useful for rolling back spam submissions.

Date format: `YYYY-MM-DD`

```bash
node dev-tools.js delete-after 2026-01-20
```

This will delete all markers created after January 20, 2026.

### `clean-images`
Remove orphaned images from Firebase Storage. This finds and deletes images that are no longer associated with any existing marker.

```bash
node dev-tools.js clean-images
```

Example output:
```
Scanning for orphaned images in storage...
Found 247 valid markers with 195 photos
Found 220 total files in storage
Deleting orphaned image: marker-photos/abc123/photo.jpg
✓ Deleted 25 orphaned images (42.15 MB freed)
```

### `trigger-voting <function-url>`
Manually trigger the voting update Cloud Function. This processes all votes and updates marker statuses.

```bash
node dev-tools.js trigger-voting https://us-central1-tent-mapper.cloudfunctions.net/processVotes
```

To get your function URL:
1. Go to Firebase Console > Functions
2. Find the `processVotes` function
3. Copy the "Trigger URL"

### `help`
Display help information and list all available commands.

```bash
node dev-tools.js help
```

## Security Notes

- **Never commit `service-account-key.json` to git!** It's already in `.gitignore`
- These tools have full admin access to your Firebase project
- Always double-check before running destructive operations like `reset-database`
- Keep the service account key secure and rotate it periodically

## Troubleshooting

**Error: service-account-key.json not found**
- Make sure you've downloaded the service account key from Firebase Console
- Place it in the `scripts/` directory
- The file must be named exactly `service-account-key.json`

**Error: Permission denied**
- Verify your service account has the correct permissions
- Go to Firebase Console > Project Settings > Service Accounts
- Ensure the service account has "Firebase Admin SDK Administrator" role

**Storage errors**
- Ensure your Firebase project has Firebase Storage enabled
- Check that the storage bucket name matches your project
