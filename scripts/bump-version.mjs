import fs from 'node:fs';
import path from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const newVersion = process.argv[2];

if (!newVersion) {
  console.error('Usage: node scripts/bump-version.mjs <new-version>');
  process.exit(1);
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function replaceInFile(p, replacer) {
  const content = fs.readFileSync(p, 'utf8');
  const next = replacer(content);
  fs.writeFileSync(p, next, 'utf8');
}

// 1. package.json
const pkgPath = path.join(ROOT, 'package.json');
const pkg = readJson(pkgPath);
pkg.version = newVersion;
writeJson(pkgPath, pkg);

// 2. package-lock.json (root + packages[""])
const lockPath = path.join(ROOT, 'package-lock.json');
if (fs.existsSync(lockPath)) {
  const lock = readJson(lockPath);
  lock.version = newVersion;
  if (lock.packages && lock.packages['']) {
    lock.packages[''].version = newVersion;
  }
  writeJson(lockPath, lock);
}

// 3. app.json (expo.version)
const appJsonPath = path.join(ROOT, 'app.json');
const appJson = readJson(appJsonPath);
if (!appJson.expo) {
  throw new Error('app.json missing "expo" field');
}
appJson.expo.version = newVersion;
writeJson(appJsonPath, appJson);

// 4. android/app/build.gradle (versionName "x.y.z")
const gradlePath = path.join(ROOT, 'android', 'app', 'build.gradle');
if (fs.existsSync(gradlePath)) {
  replaceInFile(gradlePath, (text) =>
    text.replace(/versionName\s+"[0-9.]+"/, `versionName "${newVersion}"`),
  );
}

// 5. SettingsScreen.tsx 中的 APP_VERSION
const settingsPath = path.join(
  ROOT,
  'src',
  'screens',
  'me',
  'SettingsScreen.tsx',
);
if (fs.existsSync(settingsPath)) {
  replaceInFile(settingsPath, (text) =>
    text.replace(
      /const APP_VERSION = '[^']*';/,
      `const APP_VERSION = '${newVersion}';`,
    ),
  );
}

console.log(`Version bumped to ${newVersion}`);

