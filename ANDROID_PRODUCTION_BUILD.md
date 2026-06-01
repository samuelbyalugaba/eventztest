# Android Production Build

## Required Environment Variables

Set these before building a Play-ready release bundle:

```powershell
$env:JAVA_HOME = "C:\Program Files\Java\jdk-21"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"

$env:EVENTZ_VERSION_CODE = "1"
$env:EVENTZ_VERSION_NAME = "1.0.0"
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
- Paid virtual access on Android remains disabled unless Play Billing or an approved policy path is configured.
