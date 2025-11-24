# Flutter Installation Guide for Windows

## Quick Installation Steps

### 1. Download Flutter SDK

1. Go to: https://docs.flutter.dev/get-started/install/windows
2. Click "Download Flutter SDK" (around 1.8 GB)
3. Extract the zip file to: `C:\src\flutter`
   - **IMPORTANT**: Don't put it in `C:\Program Files\` (needs admin)
   - Don't put it in a path with spaces

### 2. Add Flutter to PATH

**Option A: Using PowerShell (Recommended)**

1. Open PowerShell as Administrator
2. Run this command:
```powershell
[System.Environment]::SetEnvironmentVariable('Path', $env:Path + ';C:\src\flutter\bin', [System.EnvironmentVariableTarget]::User)
```
3. Close and reopen PowerShell/Git Bash
4. Test: `flutter --version`

**Option B: Using System Settings (GUI)**

1. Press `Windows + R`
2. Type `sysdm.cpl` and press Enter
3. Click "Environment Variables"
4. Under "User variables", select "Path"
5. Click "Edit"
6. Click "New"
7. Add: `C:\src\flutter\bin`
8. Click OK on all windows
9. Close and reopen Git Bash/terminal
10. Test: `flutter --version`

### 3. Run Flutter Doctor

After Flutter is in PATH:

```bash
flutter doctor
```

This checks your setup and shows what's missing.

### 4. Accept Android Licenses

```bash
flutter doctor --android-licenses
```

Type `y` to accept all licenses.

### 5. Verify Everything Works

```bash
flutter doctor -v
```

You should see:
- ✅ Flutter SDK
- ✅ Android toolchain
- ✅ VS Code or Android Studio
- ⚠️ Xcode (only needed on macOS)

## Troubleshooting

### "flutter not recognized"
- Flutter not in PATH
- Restart terminal after adding to PATH
- Make sure path is: `C:\src\flutter\bin` (with \bin)

### "Android licenses not accepted"
- Run: `flutter doctor --android-licenses`
- Accept all with `y`

### "Android SDK not found"
- Install Android Studio first
- Open Android Studio → More Actions → SDK Manager
- Install latest Android SDK

## Ready to Continue?

Once `flutter --version` works, come back and we'll create the app!

