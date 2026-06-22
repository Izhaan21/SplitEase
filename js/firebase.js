// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDdkvNhBAIvofrF3tjF3eWxdXjiak3MaCc",
    authDomain: "splitease-88ca1.firebaseapp.com",
    projectId: "splitease-88ca1",
    storageBucket: "splitease-88ca1.firebasestorage.app",
    messagingSenderId: "91362894264",
    appId: "1:91362894264:web:aca9c381df7e82dfe2ef4d",
    measurementId: "G-5VZV0TKTRF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
let analytics = null;
try {
  analytics = getAnalytics(app);
} catch (e) {
  console.warn("Firebase Analytics failed to initialize:", e);
}
const auth = getAuth(app);
const db = getFirestore(app);

export { app, analytics, auth, db };