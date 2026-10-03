// Adds the account / sign-in settings to the generated native projects (run after `npx cap add android`).
// Reads them from environment variables so nothing private is stored in the repository:
//   GOOGLE_SERVICES_JSON       contents of google-services.json (Firebase → Project settings → Android app)
//   FACEBOOK_APP_ID            Meta for Developers → your app → App settings → Basic
//   FACEBOOK_CLIENT_TOKEN      Meta for Developers → your app → App settings → Advanced → Client token
// Without them the app still builds; Google / Facebook sign-in just won't work in that build.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const android = join(root, 'android');
const env = process.env;

function edit(file, fn) {
  const before = readFileSync(file, 'utf8');
  const after = fn(before);
  if (after !== before) writeFileSync(file, after);
}

// The native Firebase sign-in plugin starts Firebase when the app opens and crashes the app if
// google-services.json is missing. Until Firebase is set up, build the app without it
// (sign-in then simply isn't offered; everything else works).
const configPath = join(root, 'capacitor.config.json');
const capConfig = JSON.parse(readFileSync(configPath, 'utf8'));
if (!env.GOOGLE_SERVICES_JSON) {
  const deps = Object.keys(JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).dependencies || {});
  capConfig.includePlugins = deps.filter((d) => !/^@capacitor\/(android|ios|core)$/.test(d) && d !== 'firebase' && d !== '@capacitor-firebase/authentication');
  console.log('No GOOGLE_SERVICES_JSON: building without native Firebase sign-in (' + capConfig.includePlugins.join(', ') + ')');
} else {
  delete capConfig.includePlugins;
}
// Only ask the plugin for Facebook login when the Facebook SDK is included (it crashes on start otherwise).
const fa = capConfig.plugins && capConfig.plugins.FirebaseAuthentication;
if (fa) {
  const all = ['google.com', 'apple.com', 'facebook.com'];
  fa.providers = env.FACEBOOK_APP_ID && env.FACEBOOK_CLIENT_TOKEN ? all : all.filter((p) => p !== 'facebook.com');
}
writeFileSync(configPath, JSON.stringify(capConfig, null, 2) + '\n');

if (existsSync(android)) {
  // Which sign-in SDKs the plugin includes.
  edit(join(android, 'variables.gradle'), (s) => (s.includes('rgcfaIncludeGoogle') ? s
    : s.replace(/ext \{/, `ext {\n    rgcfaIncludeGoogle = true\n    rgcfaIncludeFacebook = ${env.FACEBOOK_APP_ID ? 'true' : 'false'}`)));

  if (env.GOOGLE_SERVICES_JSON) {
    writeFileSync(join(android, 'app/google-services.json'), env.GOOGLE_SERVICES_JSON);
    console.log('android: google-services.json added');
  }

  if (env.FACEBOOK_APP_ID && env.FACEBOOK_CLIENT_TOKEN) {
    edit(join(android, 'app/src/main/res/values/strings.xml'), (s) => (s.includes('facebook_app_id') ? s
      : s.replace('</resources>', `    <string name="facebook_app_id">${env.FACEBOOK_APP_ID}</string>\n    <string name="facebook_client_token">${env.FACEBOOK_CLIENT_TOKEN}</string>\n    <string name="fb_login_protocol_scheme">fb${env.FACEBOOK_APP_ID}</string>\n</resources>`)));
    edit(join(android, 'app/src/main/AndroidManifest.xml'), (s) => (s.includes('com.facebook.sdk.ApplicationId') ? s
      : s.replace(/<application([^>]*)>/, `<application$1>\n        <meta-data android:name="com.facebook.sdk.ApplicationId" android:value="@string/facebook_app_id"/>\n        <meta-data android:name="com.facebook.sdk.ClientToken" android:value="@string/facebook_client_token"/>`)));
    console.log('android: Facebook sign-in configured');
  }
  console.log('android: configured');
}
