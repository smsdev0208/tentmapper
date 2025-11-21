# Seattle Tent Mapper

A crowdsourced web application for mapping tent locations in Seattle. Users can report tent locations, vote on their current status, and upload photo evidence.

## Features

- 🗺️ Interactive map centered on Seattle using OpenStreetMap
- 📍 Click-to-place tent markers
- ✅ Daily voting system to verify tent locations
- 📸 Photo upload capability
- 🔄 Real-time updates across all users
- 🛡️ reCAPTCHA v3 spam protection
- 📱 Responsive design for mobile browsers

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript (vanilla)
- **Map**: Leaflet.js with OpenStreetMap tiles
- **Backend**: Firebase Firestore + Firebase Storage
- **Security**: Google reCAPTCHA v3

## Local Testing

1. **Open the application**:
   - Simply open `index.html` in your web browser
   - Or use a local server (recommended):
     ```bash
     # Using Python
     python -m http.server 8000
     
     # Using Node.js (npx)
     npx http-server -p 8000
     ```
   - Navigate to `http://localhost:8000`

2. **Test features**:
   - Click anywhere on the map to report a tent
   - Upload a photo (optional)
   - Submit the report
   - Click on existing tent markers to vote
   - Votes are tracked per browser session (localStorage)

## Firebase Setup Required

Before deploying, ensure you have:

1. ✅ Created a Firebase project
2. ✅ Enabled Firestore Database
3. ✅ Enabled Firebase Storage
4. ✅ Configured Firestore Security Rules (see below)
5. ✅ Registered your web app and obtained config
6. ✅ Set up reCAPTCHA v3

### Firestore Security Rules

Go to Firebase Console > Firestore Database > Rules and update:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow anyone to read tents
    match /tents/{tentId} {
      allow read: if true;
      allow create: if request.resource.data.keys().hasAll([
        'latitude', 'longitude', 'createdAt', 'status', 
        'votesYes', 'votesNo', 'photoUrls', 'votingEndsAt'
      ]);
      allow update: if request.resource.data.diff(resource.data)
        .affectedKeys().hasOnly(['votesYes', 'votesNo', 'lastVerifiedAt', 'status', 'photoUrls']);
    }
    
    // Allow anyone to record votes
    match /votes/{voteId} {
      allow read: if true;
      allow create: if request.resource.data.keys().hasAll([
        'tentId', 'sessionId', 'vote', 'timestamp'
      ]);
    }
  }
}
```

### Firebase Storage Rules

Go to Firebase Console > Storage > Rules and update:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /tent-photos/{tentId}/{filename} {
      allow read: if true;
      allow write: if request.resource.size < 5 * 1024 * 1024 // 5MB limit
                   && request.resource.contentType.matches('image/.*');
    }
  }
}
```

## Deploy to GitHub Pages

1. **Commit and push your code**:
   ```bash
   git add .
   git commit -m "Initial commit - Web MVP"
   git push origin main
   ```

2. **Enable GitHub Pages**:
   - Go to your repository settings on GitHub
   - Scroll to "Pages" section
   - Source: Deploy from a branch
   - Branch: main / root
   - Save

3. **Update reCAPTCHA domains**:
   - Go to [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin)
   - Add your GitHub Pages domain: `username.github.io`
   - The site will be live at: `https://username.github.io/tentmapper`

## How It Works

### Data Flow

1. **Reporting a Tent**:
   - User clicks map → modal opens
   - User uploads photo (optional) → stored in Firebase Storage
   - User submits → reCAPTCHA token generated
   - Tent document created in Firestore with status: "pending"
   - All connected clients see new marker immediately

2. **Voting**:
   - User clicks vote button on marker popup
   - Session ID checked (localStorage) to prevent duplicate votes
   - Vote recorded in `votes` collection
   - Tent document vote counters incremented
   - Vote buttons disabled after voting

3. **Real-time Updates**:
   - Firestore `onSnapshot` listener in `map.js`
   - Any changes to tents collection trigger marker updates
   - Color-coded markers: Yellow (pending), Red (verified), Gray (removed)

### Session Management

- Each browser generates a unique session ID (stored in localStorage)
- Session ID used to track votes and prevent duplicates
- No user accounts required - low barrier to entry

## File Structure

```
tentmapper/
├── index.html              # Main HTML file
├── css/
│   └── style.css          # All styles
├── js/
│   ├── firebase-config.js # Firebase initialization
│   ├── map.js             # Leaflet map & real-time listener
│   ├── tents.js           # Tent CRUD operations
│   └── voting.js          # Voting logic
├── FirebaseConfig.txt     # Firebase config backup
├── reCaptchaKeys.txt      # reCAPTCHA keys backup
└── README.md              # This file
```

## Future Enhancements (Phase 2+)

- [ ] Firebase Cloud Functions for automated vote processing
- [ ] Flutter mobile apps (iOS + Android)
- [ ] User location tracking ("Show my location" button)
- [ ] Photo gallery view
- [ ] Filtering by tent status
- [ ] Heat map view
- [ ] Export data functionality

## Troubleshooting

### Map doesn't load
- Check browser console for errors
- Ensure you have internet connection (Leaflet tiles load from CDN)

### Can't submit tent
- Check Firebase console for quota limits
- Verify Firestore security rules are set
- Check browser console for reCAPTCHA errors

### Photos don't upload
- Verify Firebase Storage is enabled
- Check Storage security rules
- Ensure file size is under 5MB
- Verify file is an image type

### Votes not working
- Check browser localStorage is enabled
- Verify Firestore rules allow vote creation
- Check network tab for failed requests

## Support

For issues or questions, please open an issue on GitHub.

## License

MIT License - Feel free to use and modify for your needs.

