// Firebase setup. These values identify the M1st Studio project; they are not secrets.
// Access is controlled by Google sign-in and the security rules in firestore.rules.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDCyG5C3jNDIbZxXRUCK9bQj0MK9tneH0E",
  authDomain: "m1st-studio.firebaseapp.com",
  projectId: "m1st-studio",
  storageBucket: "m1st-studio.firebasestorage.app",
  messagingSenderId: "805847644574",
  appId: "1:805847644574:web:0a0ca752ba8fc5e3187e8f"
};

export const fbApp = initializeApp(firebaseConfig);
export const auth = getAuth(fbApp);
export const fs = getFirestore(fbApp);
export const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

// Accounts that are always admins, even before anyone is added on the Access page.
export const OWNER_EMAILS = ["m1stcreatives25@gmail.com", "bobagda25@gmail.com"];

export { signInWithPopup, onAuthStateChanged, signOut, collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc };
