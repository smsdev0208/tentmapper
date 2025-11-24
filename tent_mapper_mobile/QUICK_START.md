# ⚡ Quick Start - Flutter App

## Prerequisites Checklist

- [ ] Flutter SDK installed and in PATH
- [ ] Terminal restarted after adding Flutter to PATH
- [ ] Android device with USB debugging enabled (or iOS device)
- [ ] USB cable connected

## 5-Minute Setup

### 1. Open NEW Terminal Window
```bash
# Test Flutter works
flutter --version
```

### 2. Navigate to Project
```bash
cd C:\Users\corwi\OneDrive\Documents\tentmapper\tent_mapper_mobile
```

### 3. Install Dependencies
```bash
flutter pub get
```

### 4. Download Firebase Config Files

**Need these 2 files:**
1. `google-services.json` → place in `android/app/`
2. `GoogleService-Info.plist` → place in `ios/Runner/`

Get them from: https://console.firebase.google.com → tent-mapper project → Settings

### 5. Connect Device & Run
```bash
flutter devices          # Check device is connected
flutter run             # Build and run!
```

## That's It!

App should build and launch on your device in 2-3 minutes.

## If Something Goes Wrong

### Flutter command not found?
→ Close terminal completely and reopen (PATH needs refresh)

### No devices found?
→ Enable USB debugging on Android phone (Settings → Developer Options)

### Build errors?
→ Run `flutter clean` then `flutter pub get` then `flutter run`

### Firebase errors?
→ Make sure you downloaded and placed the config files correctly

## Full Documentation

See `SETUP_GUIDE.md` for detailed instructions and troubleshooting.

