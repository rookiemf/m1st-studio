// Firebase setup for Freelance HQ. These values identify the project; they are not secrets.
// Who can see what is decided by Google sign-in and the rules in firestore.rules.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, collection, query, orderBy, limitToLast, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCm24wOTOQFS-tGnPYz-cEqWHkDoZhcEz8",
  authDomain: "freelance-hq-57931.firebaseapp.com",
  projectId: "freelance-hq-57931",
  storageBucket: "freelance-hq-57931.firebasestorage.app",
  messagingSenderId: "131144654626",
  appId: "1:131144654626:web:ac98a552ed74fe43974f7b"
};

export const fbApp = initializeApp(firebaseConfig);
export const auth = getAuth(fbApp);
export const fs = getFirestore(fbApp);
export const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

// The owner can always sign in and is the only one who can invite people.
export const OWNER_EMAIL = "bobagda25@gmail.com";

export { signInWithPopup, onAuthStateChanged, signOut, collection, query, orderBy, limitToLast, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc };
