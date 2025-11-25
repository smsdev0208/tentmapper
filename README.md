# Seattle Tent Mapper

A crowdsourced web application for mapping homeless encampments, RVs, tents, and incidents in Seattle. Users can report locations with specific details, vote on their current status, and upload photo evidence.

## Features

- 🗺️ Interactive map centered on Seattle using OpenStreetMap
- 🎯 Radial donut menu with 4 marker types:
  - **Tent**: Individual tent locations
  - **RV**: RVs with side of street (North/South/East/West)
  - **Encampment**: Multi-tent locations with approximate count
  - **Incident**: Public safety incidents with type and timestamp
- ✅ Daily voting system to verify tent/RV/encampment locations (not incidents)
- 📸 Photo upload capability for all marker types
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
   - Click anywhere on the map to see the radial menu
   - Select a marker type (Tent, RV, Encampment, or Incident)
   - Fill in type-specific details
   - Upload a photo (optional, not available for incidents)
   - Submit the report
   - Click on existing markers to vote (except incidents)
   - Votes are tracked per browser session (localStorage)



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

1. **Reporting a Marker**:
   - User clicks map → radial donut menu appears
   - User selects marker type (Tent, RV, Encampment, or Incident)
   - Modal opens with type-specific fields
   - User fills in required details and uploads photo (optional)
   - User submits → reCAPTCHA token generated
   - Marker document created in Firestore with status: "pending"
   - All connected clients see new marker immediately

2. **Marker Types & Fields**:
   - **Tent**: Basic location only
   - **RV**: Side of street (North, South, East, West)
   - **Encampment**: Approximate number of tents (integer)
   - **Incident**: Type (public intoxication, substance use, noise, altercation, theft) + Date/Time

3. **Voting** (Tent, RV, Encampment only - not Incidents):
   - User clicks vote button on marker popup
   - Session ID checked (localStorage) to prevent duplicate votes
   - Vote recorded in `votes` collection
   - Marker document vote counters incremented
   - Vote buttons disabled after voting

4. **Real-time Updates**:
   - Firestore `onSnapshot` listener in `map.js`
   - Any changes to markers collection trigger marker updates
   - Color-coded markers: Yellow (pending), Red (verified)
   - Different icons for each marker type

### Session Management

- Each browser generates a unique session ID (stored in localStorage)
- Session ID used to track votes and prevent duplicates
- No user accounts required - low barrier to entry

## File Structure

```
tentmapper/
├── index.html              # Main HTML file with radial menu
├── css/
│   └── style.css          # All styles including radial menu
├── js/
│   ├── firebase-config.js # Firebase initialization
│   ├── map.js             # Leaflet map & real-time listener
│   ├── tents.js           # Marker CRUD operations (all types)
│   └── voting.js          # Voting logic (excludes incidents)
├── tent.png               # Tent marker icon
├── rv.png                 # RV marker icon
├── encampment.png         # Encampment marker icon
├── incident.png           # Incident marker icon
├── firestore.rules        # Firestore security rules
├── storage.rules          # Storage security rules
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

### Can't submit marker
- Check Firebase console for quota limits
- Verify Firestore security rules are set for `markers` collection
- Check browser console for reCAPTCHA errors
- Ensure all required fields for marker type are filled

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

