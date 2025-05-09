// Import the functions you need from the SDKs you need
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDfGS8FxR8v2orZd3kNMC0U2yY3xk7tFaQ",
  authDomain: "pulseerp.firebaseapp.com",
  projectId: "pulseerp",
  storageBucket: "pulseerp.appspot.com", // Corrected from firebasestorage.app to appspot.com
  messagingSenderId: "917957062375",
  appId: "1:917957062375:web:96d4e292e4340c3b5ffc42",
  region: 'eur3' // Added region configuration
};

// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const db = getFirestore(app);

// If running in a development environment with an emulator, connect to it.
// Make sure to start the emulator with `firebase emulators:start --only firestore`
if (process.env.NODE_ENV === 'development' && process.env.USE_FIREBASE_EMULATOR === 'true') {
  console.log("Connecting to Firebase Emulator for Firestore...");
  connectFirestoreEmulator(db, 'localhost', 8080);
}


export { app, db };

// // Test function to check the database connection
// async function checkDatabaseConnection() {
//   try {
//     const docRef = doc(db, "tenants", "testDocument"); // Replace "testDocument" with an existing document ID or create a new one
//     const docSnap = await getDoc(docRef);

//     if (docSnap.exists()) {
//       console.log("Database connection successful! Document data:", docSnap.data());
//     } else {
//       console.log("No such document!");
//     }
//   } catch (error) {
//     console.error("Error connecting to database:", error);
//   }
// }

// // Call the test function when the app initializes
// checkDatabaseConnection();
