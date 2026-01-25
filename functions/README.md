# Tent Mapper Cloud Functions

This directory contains Firebase Cloud Functions for the Tent Mapper application.

## Functions

### `processVotes` (HTTP Trigger)
Manually callable HTTP endpoint that processes all voting and updates marker statuses.

**URL:** Will be provided after deployment (typically: `https://us-central1-tent-mapper.cloudfunctions.net/processVotes`)

**Method:** GET or POST

**Response:**
```json
{
  "success": true,
  "timestamp": "2026-01-22T12:00:00.000Z",
  "processed": 150,
  "added": 12,
  "removed": 5,
  "votesCleared": 487
}
```

### `scheduledVoteProcessing` (Scheduled)
Automatically runs every day at midnight PST via Cloud Scheduler.

Performs the same processing as `processVotes` but triggered by schedule.

## Setup

1. Install dependencies:
```bash
cd functions
npm install
```

2. Deploy functions:
```bash
firebase deploy --only functions
```

3. The scheduled function will automatically create a Cloud Scheduler job on first deployment.

## Local Testing

Run functions locally with the Firebase emulator:
```bash
npm run serve
```

Then call the HTTP function:
```bash
curl http://localhost:5001/tent-mapper/us-central1/processVotes
```

## Voting Logic

### Pending Markers
- `yes >= no` → Status changes to `verified` (ties mean the marker is added)
- `yes < no` → Status changes to `removed`

### Verified Markers
- `no > yes` → Status changes to `removed` (ties mean the marker stays)
- `no <= yes` → Status remains `verified`

After processing, all vote counts are reset to 0 and all vote records are deleted.

## Monitoring

View function logs:
```bash
firebase functions:log
```

Or in the Firebase Console under Functions → Logs
