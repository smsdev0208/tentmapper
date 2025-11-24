# Flutter App Setup Guide

## Step-by-Step Setup

### Step 1: Close and Reopen Your Terminal

**IMPORTANT:** Flutter won't work until you restart your terminal after adding it to PATH.

1. Close Git Bash or terminal completely
2. Reopen it
3. Test Flutter:
   ```bash
   flutter --version
   ```
   
If you still get "command not found", Flutter isn't in your PATH correctly. Check `FLUTTER_SETUP.md` in the parent directory.

### Step 2: Navigate to Flutter Project

```bash
cd C:\Users\corwi\OneDrive\Documents\tentmapper\tent_mapper_mobile
```

### Step 3: Get Dependencies

```bash
flutter pub get
```

This downloads all the packages listed in `pubspec.yaml`.

### Step 4: Add Firebase Configuration Files

You need to download two configuration files from Firebase Console:

#### For Android:

1. Go to: https://console.firebase.google.com
2. Select project: **tent-mapper**
3. Click settings gear ⚙️ → Project settings
4. Scroll to "Your apps" section
5. Click on the **Android app** (or add one if it doesn't exist)
   - Package name: `com.tentmapper.app`
6. Download `google-services.json`
7. Place it here: `tent_mapper_mobile/android/app/google-services.json`

#### For iOS:

1. In the same Firebase Console → Project settings
2. Click on the **iOS app** (or add one if it doesn't exist)
   - Bundle ID: `com.tentmapper.app`
3. Download `GoogleService-Info.plist`
4. Place it here: `tent_mapper_mobile/ios/Runner/GoogleService-Info.plist`

#### Update Firebase App IDs:

Open `lib/firebase_options.dart` and find these lines:

```dart
appId: '1:985438520114:android:YOUR_ANDROID_APP_ID',  // Line 56
appId: '1:985438520114:ios:YOUR_IOS_APP_ID',          // Line 63
```

Replace `YOUR_ANDROID_APP_ID` and `YOUR_IOS_APP_ID` with the actual App IDs from your Firebase configuration files.

### Step 5: Check Flutter Doctor

```bash
flutter doctor
```

You should see:
- ✅ Flutter SDK
- ✅ Android toolchain
- ✅ VS Code or Android Studio
- ⚠️ Xcode (only if on macOS)

If Android toolchain shows issues:
```bash
flutter doctor --android-licenses
```

### Step 6: Connect Your Device

#### Android Device:
1. Enable Developer Options on your Android phone:
   - Settings → About Phone → Tap "Build Number" 7 times
2. Enable USB Debugging:
   - Settings → Developer Options → USB Debugging
3. Connect phone via USB cable
4. Accept USB debugging prompt on phone
5. Verify:
   ```bash
   flutter devices
   ```

#### iOS Device (requires macOS):
1. Connect iPhone via USB
2. Trust your computer on iPhone
3. In project folder:
   ```bash
   cd ios
   pod install
   cd ..
   ```

### Step 7: Run the App!

```bash
flutter run
```

The app should build and launch on your connected device!

### Step 8: Test the App

Once running on your device:

1. ✅ **Map loads** - Should show Seattle centered
2. ✅ **See existing tents** - Tents from web app should appear
3. ✅ **Location button** - Tap to see your current location
4. ✅ **Add tent** - Tap anywhere on map
5. ✅ **Take photo** - Should open camera
6. ✅ **Vote** - Tap marker, vote on tent
7. ✅ **Real-time sync** - Add tent on web, should appear on mobile immediately

## Troubleshooting

### "flutter: command not found"
- Restart terminal after adding Flutter to PATH
- Check Flutter is at: `C:\src\flutter\bin`
- Verify PATH includes Flutter: `echo $PATH`

### "No devices found"
- For Android: Enable USB debugging
- Run `flutter devices` to check
- Try different USB cable/port

### "Could not find google-services.json"
- Download from Firebase Console
- Place in: `android/app/google-services.json`
- Run `flutter clean` then `flutter pub get`

### "Camera permission denied"
- Go to phone Settings → Apps → Tent Mapper → Permissions
- Enable Camera and Location

### "Firebase errors"
- Ensure Firestore and Storage rules are deployed (see main README)
- Check `google-services.json` and `GoogleService-Info.plist` are in correct locations
- Verify app IDs in `firebase_options.dart`

### Build errors after changes
```bash
flutter clean
flutter pub get
flutter run
```

## Building Release Versions

### Android APK (for testing):
```bash
flutter build apk --release
```
APK location: `build/app/outputs/flutter-apk/app-release.apk`

### Android App Bundle (for Play Store):
```bash
flutter build appbundle --release
```

### iOS (macOS only):
```bash
flutter build ios --release
```

## Next Steps After Testing

1. Test all features on both Android and iOS
2. Add app icon (use flutter_launcher_icons package)
3. Add splash screen
4. Prepare for app store submission:
   - Google Play: $25 one-time fee
   - Apple App Store: $99/year

## Need Help?

Check these resources:
- Flutter docs: https://docs.flutter.dev
- Firebase docs: https://firebase.google.com/docs
- Run: `flutter doctor -v` for detailed info

