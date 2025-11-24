# Seattle Tent Mapper - Mobile App

Flutter mobile application for iOS and Android that syncs with the web version.

## Features

- 🗺️ Interactive map with OpenStreetMap tiles
- 📍 Tap to report tent locations
- 📸 Camera integration for photo evidence
- 📱 GPS location services
- ✅ Vote on tent status
- 🔄 Real-time sync with Firebase
- 🌍 Restricted to greater Seattle area

## Prerequisites

- Flutter SDK (3.0+)
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)
- Firebase project configured

## Setup Instructions

### 1. Install Dependencies

```bash
cd tent_mapper_mobile
flutter pub get
```

### 2. Configure Firebase

You need to add Firebase configuration files:

**For Android:**
1. Go to Firebase Console → Project Settings → Your Apps
2. Download `google-services.json` for Android app
3. Place it in: `android/app/google-services.json`

**For iOS:**
1. Go to Firebase Console → Project Settings → Your Apps
2. Download `GoogleService-Info.plist` for iOS app
3. Place it in: `ios/Runner/GoogleService-Info.plist`

**Update firebase_options.dart:**
- Open `lib/firebase_options.dart`
- Replace `YOUR_ANDROID_APP_ID` with your actual Android app ID
- Replace `YOUR_IOS_APP_ID` with your actual iOS app ID

### 3. Run the App

**On Android:**
```bash
flutter run
```

**On iOS (macOS only):**
```bash
flutter run
```

**To build release versions:**
```bash
# Android APK
flutter build apk --release

# Android App Bundle (for Play Store)
flutter build appbundle --release

# iOS (requires macOS)
flutter build ios --release
```

## Testing

### Test on Physical Devices

**Android:**
1. Enable USB debugging on your device
2. Connect via USB
3. Run `flutter devices` to verify connection
4. Run `flutter run`

**iOS:**
1. Connect iPhone via USB
2. Open `ios/Runner.xcworkspace` in Xcode
3. Select your device as target
4. Trust your Apple Developer account
5. Run from Xcode or `flutter run`

### Test Features

- ✅ Map loads centered on Seattle
- ✅ Can see existing tents from Firestore
- ✅ Tap map to place new tent
- ✅ Take photo with camera
- ✅ Location button works
- ✅ Tap marker to see details
- ✅ Vote on tents
- ✅ Real-time sync with web app

## Project Structure

```
lib/
├── main.dart                  # App entry point
├── firebase_options.dart      # Firebase configuration
├── models/
│   └── tent.dart             # Tent data model
├── screens/
│   └── map_screen.dart       # Main map screen
├── services/
│   ├── firebase_service.dart # Firestore operations
│   ├── location_service.dart # GPS & permissions
│   └── session_service.dart  # Session ID for voting
└── widgets/
    └── tent_details_sheet.dart # Bottom sheet for tent details
```

## Permissions

### Android
- `INTERNET` - Firebase and map tiles
- `ACCESS_FINE_LOCATION` - GPS positioning
- `CAMERA` - Take photos
- `READ_EXTERNAL_STORAGE` - Access photos

### iOS
- Location When In Use - GPS positioning
- Camera - Take photos
- Photo Library - Select photos

## Troubleshooting

### "Plugin not found"
Run `flutter pub get` and restart IDE

### Location not working
- Check permissions are granted in device settings
- Ensure location services are enabled

### Camera not working
- Check camera permission is granted
- Physical device required (camera doesn't work in emulator)

### Firebase errors
- Verify `google-services.json` and `GoogleService-Info.plist` are in correct locations
- Check Firebase app IDs in `firebase_options.dart`
- Ensure Firestore and Storage rules are deployed

### Build errors
```bash
flutter clean
flutter pub get
flutter run
```

## Publishing

### Google Play Store
1. Create keystore for signing
2. Update `android/key.properties`
3. Build app bundle: `flutter build appbundle --release`
4. Upload to Play Console

### Apple App Store
1. Open in Xcode: `open ios/Runner.xcworkspace`
2. Configure signing & capabilities
3. Archive build
4. Upload to App Store Connect

## Next Steps

- [ ] Test on physical Android device
- [ ] Test on physical iOS device
- [ ] Add app icon
- [ ] Add splash screen
- [ ] Submit to app stores

## Support

For issues, check:
- Flutter doctor: `flutter doctor`
- Firebase Console logs
- Device logs: `flutter logs`

