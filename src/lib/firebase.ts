// Import the functions you need from the SDKs you need
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator, Timestamp } from "firebase/firestore"; // Added Timestamp
import { getAuth } from "firebase/auth"; // Added getAuth

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDfGS8FxR8v2orZd3kNMC0U2yY3xk7tFaQ", // It's generally recommended to use environment variables for API keys
  authDomain: "pulseerp.firebaseapp.com",
  projectId: "pulseerp",
  storageBucket: "pulseerp.appspot.com", // Corrected from firebasestorage.app to appspot.com
  messagingSenderId: "917957062375",
  appId: "1:917957062375:web:96d4e292e4340c3b5ffc42",
  region: 'eur3'
};

// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const db = getFirestore(app);
const auth = getAuth(app); // Initialize Firebase Auth

// If running in a development environment with an emulator, connect to it.
// Make sure to start the emulator with `firebase emulators:start --only firestore`
if (process.env.NODE_ENV === 'development' && process.env.USE_FIREBASE_EMULATOR === 'true') {
  console.log("Connecting to Firebase Emulator for Firestore...");
  connectFirestoreEmulator(db, 'localhost', 8080);
  // If you also want to use the Auth emulator:
  // import { connectAuthEmulator } from "firebase/auth";
  // connectAuthEmulator(auth, "http://localhost:9099");
}


export { app, db, auth, Timestamp }; // Export auth and Timestamp
