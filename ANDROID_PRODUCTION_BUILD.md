# Android Production Build

## Required Environment Variables

Set these before building a Play-ready release bundle:

```powershell
$env:JAVA_HOME = "C:\Program Files\Java\jdk-21"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"

$env:EVENTZ_VERSION_CODE = "4"
$env:EVENTZ_VERSION_NAME = "1.0.3"
$env:EVENTZ_UPLOAD_STORE_FILE = "C:\Users\DELL\.eventz-release\eventz-upload-key.jks"
$env:EVENTZ_UPLOAD_STORE_PASSWORD = "<store password>"
$env:EVENTZ_UPLOAD_KEY_ALIAS = "eventz-upload"
$env:EVENTZ_UPLOAD_KEY_PASSWORD = "<key password>"
```

Keep the keystore and passwords backed up securely. Do not commit them.

## Build

```powershell
cd "E:\Web Apps\Eventz Live\eventz-app-bd36658b"
npm run build
npx cap sync android

cd android
.\gradlew.bat :app:bundleRelease
```

The Play Store upload file is:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

## Notes

- Increment `EVENTZ_VERSION_CODE` for every Play Console upload.
- `EVENTZ_VERSION_NAME` is user-facing and can follow semantic versioning.
- `android/gradle.properties` is the source of truth for Capacitor Cloud builds. If Capacitor Cloud has old environment values such as `EVENTZ_VERSION_CODE=1` or `EVENTZ_VERSION_NAME=1.0.0`, remove them or update them so the build does not reuse an old Play Store version.
- The Android build fails intentionally if the release version code is below `4`, because Play has already seen version code `1`.
- Paid virtual access on Android remains disabled unless Play Billing or an approved policy path is configured.
