import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('--- Running Asset Generator Script (scripts/generate-assets.js) ---');

const projectRoot = process.cwd();
const assetsDir = path.join(projectRoot, 'assets');
const publicDir = path.join(projectRoot, 'public');

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Locate primary logo/icon source
const possibleSources = [
  path.join(projectRoot, 'src/assets/images/logo_png_1786015746899.jpg'),
  path.join(assetsDir, 'logo.png'),
  path.join(assetsDir, 'icon.png'),
  path.join(publicDir, 'logo.png'),
  path.join(publicDir, 'icon.png')
];

const primarySource = possibleSources.find((p) => fs.existsSync(p));

if (!primarySource) {
  console.warn('⚠️ No source logo found in assets/ or public/. Please ensure logo.png exists.');
} else {
  console.log(`✅ Using primary icon source: ${primarySource}`);

  const requiredPNGAssets = [
    path.join(assetsDir, 'icon-only.png'),
    path.join(assetsDir, 'icon-foreground.png'),
    path.join(assetsDir, 'icon-background.png'),
    path.join(assetsDir, 'icon.png'),
    path.join(assetsDir, 'logo.png'),
    path.join(assetsDir, 'splash.png'),
    path.join(publicDir, 'logo.png'),
    path.join(publicDir, 'icon.png'),
    path.join(publicDir, 'favicon.png'),
    path.join(projectRoot, 'src/assets/images/logo.png')
  ];

  // Try convert (ImageMagick) if source is JPG or needed, otherwise copy Buffer
  let useConvert = false;
  try {
    execSync('which convert');
    useConvert = true;
  } catch {
    useConvert = false;
  }

  requiredPNGAssets.forEach((targetPath) => {
    try {
      const targetDir = path.dirname(targetPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      if (useConvert) {
        execSync(`convert "${primarySource}" "${targetPath}"`);
      } else {
        fs.copyFileSync(primarySource, targetPath);
      }
      console.log(`Updated asset: ${path.relative(projectRoot, targetPath)}`);
    } catch (err) {
      console.error(`Error processing asset ${targetPath}:`, err);
    }
  });
}

// 2. Run @capacitor/assets CLI if android folder exists or can be generated
const androidResDir = path.join(projectRoot, 'android/app/src/main/res');

if (fs.existsSync(path.join(projectRoot, 'android'))) {
  console.log('🚀 Android platform directory found. Running Capacitor Assets Generator...');
  try {
    execSync('npx cap-assets generate --android', { stdio: 'inherit' });
    console.log('✅ @capacitor/assets completed successfully!');
  } catch (e) {
    console.warn('⚠️ npx cap-assets generate failed or skipped, falling back to manual res sync:', e.message);
  }
}

// 3. Fallback / Manual Android Res Sync to prevent black/corrupted icons
if (fs.existsSync(androidResDir) && primarySource) {
  console.log('🔧 Verifying and updating Android res mipmap and drawable directories...');
  const iconBuffer = fs.readFileSync(primarySource);

  const mipmapDirs = [
    'mipmap-mdpi',
    'mipmap-hdpi',
    'mipmap-xhdpi',
    'mipmap-xxhdpi',
    'mipmap-xxxhdpi'
  ];

  mipmapDirs.forEach((dirName) => {
    const targetDir = path.join(androidResDir, dirName);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Write PNG files cleanly
    fs.writeFileSync(path.join(targetDir, 'ic_launcher.png'), iconBuffer);
    fs.writeFileSync(path.join(targetDir, 'ic_launcher_round.png'), iconBuffer);
    fs.writeFileSync(path.join(targetDir, 'ic_launcher_foreground.png'), iconBuffer);
  });

  // Ensure drawable folder has splash and logo
  const drawableDir = path.join(androidResDir, 'drawable');
  if (!fs.existsSync(drawableDir)) {
    fs.mkdirSync(drawableDir, { recursive: true });
  }
  fs.writeFileSync(path.join(drawableDir, 'splash.png'), iconBuffer);

  // Ensure mipmap-anydpi-v26 XML files exist and point properly
  const anyDpiDir = path.join(androidResDir, 'mipmap-anydpi-v26');
  if (!fs.existsSync(anyDpiDir)) {
    fs.mkdirSync(anyDpiDir, { recursive: true });
  }

  const adaptiveXmlContent = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>`;

  fs.writeFileSync(path.join(anyDpiDir, 'ic_launcher.xml'), adaptiveXmlContent, 'utf8');
  fs.writeFileSync(path.join(anyDpiDir, 'ic_launcher_round.xml'), adaptiveXmlContent, 'utf8');

  // Ensure values/ic_launcher_background.xml or colors.xml exists
  const valuesDir = path.join(androidResDir, 'values');
  if (!fs.existsSync(valuesDir)) {
    fs.mkdirSync(valuesDir, { recursive: true });
  }

  const icBgPath = path.join(valuesDir, 'ic_launcher_background.xml');
  if (!fs.existsSync(icBgPath)) {
    const icBgContent = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#FFFFFF</color>
</resources>`;
    fs.writeFileSync(icBgPath, icBgContent, 'utf8');
  }

  console.log('✅ Android mipmap and adaptive icon resources synced successfully!');
}

console.log('--- Asset Generator Completed Successfully ---');
