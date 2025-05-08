// Import the functions you need from the SDKs you need
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDfGS8FxR8v2orZd3kNMC0U2yY3xk7tFaQ",
  authDomain: "pulseerp.firebaseapp.com",
  projectId: "pulseerp",
  storageBucket: "pulseerp.appspot.com", // corrected to .appspot.com which is more common for storage
  messagingSenderId: "917957062375",
  appId: "1:917957062375:web:96d4e292e4340c3b5ffc42"
};

// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const db = getFirestore(app);

export { app, db };
