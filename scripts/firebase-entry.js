// The parts of the Firebase JavaScript SDK the app uses. Bundled by scripts/vendor.mjs into
// js/vendor/firebase.js (a plain script, so the app keeps working without a build step).
export { initializeApp } from 'firebase/app';
export {
  initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, browserPopupRedirectResolver,
  onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail,
  sendEmailVerification, updateProfile, signInWithPopup, signInWithRedirect, getRedirectResult, signInWithCredential,
  GoogleAuthProvider, FacebookAuthProvider, OAuthProvider, signOut, deleteUser, connectAuthEmulator,
} from 'firebase/auth';
export {
  initializeFirestore, doc, getDoc, setDoc, deleteDoc, serverTimestamp, connectFirestoreEmulator, collection, getDocs, query, where, writeBatch, Timestamp,
} from 'firebase/firestore/lite';
export { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
