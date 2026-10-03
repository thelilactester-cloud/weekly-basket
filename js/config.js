/*
 * Settings for the online services. Everything here is public (it ships inside the app);
 * secret keys live only in Firebase (see LAUNCH.md).
 *
 * Until `firebase.apiKey` is filled in, accounts are switched off and the app works as before
 * (everything stays on the device).
 */
(function (g) {
  const MP = (g.MP = g.MP || {});

  MP.CONFIG = {
    // Firebase console → Project settings → General → Your apps → Web app → "SDK setup and configuration".
    firebase: {
      apiKey: '',
      authDomain: '',
      projectId: '',
      appId: '',
    },
    // Region of the Cloud Functions (functions/index.js). Keep in sync with REGION there.
    functionsRegion: 'europe-west1',
    // Which sign-in buttons to show. Each needs to be switched on in Firebase → Authentication → Sign-in method.
    providers: { google: true, apple: true, facebook: true },
    // App Store app id (numbers, from App Store Connect → App Information), for affiliate offer-code links.
    appleAppId: '',
    // Google Play package name (= appId in capacitor.config.json), and whether the app is live on Google Play yet.
    androidPackage: 'com.prepcart.app',
    playStoreLive: false,
    // Where the web app lives; used to build affiliate links.
    webUrl: 'https://thelilactester-cloud.github.io/weekly-basket/',
    // Local testing only: talk to the Firebase emulators instead of the real project.
    emulators: false,
  };
})(typeof window !== 'undefined' ? window : globalThis);
