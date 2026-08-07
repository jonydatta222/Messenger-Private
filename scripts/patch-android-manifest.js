import fs from 'fs';
import path from 'path';

const manifestPath = path.resolve('android/app/src/main/AndroidManifest.xml');

console.log('Checking AndroidManifest.xml at:', manifestPath);

if (!fs.existsSync(manifestPath)) {
  console.log('AndroidManifest.xml not found yet. Skipping patch (will run during build).');
  process.exit(0);
}

let manifestContent = fs.readFileSync(manifestPath, 'utf8');

const requiredPermissions = [
  '<uses-permission android:name="android.permission.INTERNET" />',
  '<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />',
  '<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />',
  '<uses-permission android:name="android.permission.CAMERA" />',
  '<uses-permission android:name="android.permission.RECORD_AUDIO" />',
  '<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />',
  '<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />',
  '<uses-permission android:name="android.permission.ACTION_MANAGE_OVERLAY_PERMISSION" />',
  '<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />',
  '<uses-permission android:name="android.permission.FOREGROUND_SERVICE_SPECIAL_USE" />',
  '<uses-permission android:name="android.permission.USE_FULL_SCREEN_INTENT" />',
  '<uses-permission android:name="android.permission.MANAGE_OWN_CALLS" />',
  '<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />',
  '<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />',
  '<uses-permission android:name="android.permission.USE_EXACT_ALARM" />',
  '<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />',
  '<uses-permission android:name="android.permission.VIBRATE" />',
  '<uses-permission android:name="android.permission.WAKE_LOCK" />',
  '<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />',
  '<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />',
  '<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />',
  '<uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />',
  '<uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />',
  '<uses-feature android:name="android.hardware.camera" android:required="false" />',
  '<uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />',
  '<uses-feature android:name="android.hardware.microphone" android:required="false" />'
];

let addedCount = 0;
requiredPermissions.forEach((perm) => {
  // Extract permission name or feature name to check existence
  const match = perm.match(/name="([^"]+)"/);
  if (match) {
    const permName = match[1];
    if (!manifestContent.includes(permName)) {
      manifestContent = manifestContent.replace(
        '</manifest>',
        `    ${perm}\n</manifest>`
      );
      addedCount++;
    }
  }
});

// Ensure application attributes
if (!manifestContent.includes('android:usesCleartextTraffic')) {
  manifestContent = manifestContent.replace(
    '<application',
    '<application android:usesCleartextTraffic="true" android:requestLegacyExternalStorage="true"'
  );
}

fs.writeFileSync(manifestPath, manifestContent, 'utf8');
console.log(`Successfully patched AndroidManifest.xml. Added ${addedCount} missing permissions/features.`);

// Trigger generate-assets.js to properly format adaptive icons and mipmap resources
try {
  const genAssetsScript = path.resolve('scripts/generate-assets.js');
  if (fs.existsSync(genAssetsScript)) {
    import('./generate-assets.js').catch(err => {
      console.warn('Could not run generate-assets.js automatically:', err);
    });
  }
} catch (e) {
  console.warn('Error running generate-assets.js:', e);
}

// Patch App Name in Android strings.xml
const stringsPath = path.resolve('android/app/src/main/res/values/strings.xml');
if (fs.existsSync(stringsPath)) {
  let stringsContent = fs.readFileSync(stringsPath, 'utf8');
  stringsContent = stringsContent.replace(/<string name="app_name">[^<]*<\/string>/g, '<string name="app_name">Messenger+</string>');
  stringsContent = stringsContent.replace(/<string name="title_activity_main">[^<]*<\/string>/g, '<string name="title_activity_main">Messenger+</string>');
  fs.writeFileSync(stringsPath, stringsContent, 'utf8');
  console.log('Successfully updated app_name in strings.xml to Messenger+');
}

