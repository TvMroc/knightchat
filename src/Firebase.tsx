// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA-BeRq-CfaFb4egOos6fcPzgYaZpSrC9A",
  authDomain: "knightchat-6df76.firebaseapp.com",
  projectId: "knightchat-6df76",
  storageBucket: "knightchat-6df76.firebasestorage.app",
  messagingSenderId: "162570867014",
  appId: "1:162570867014:web:6f98f29dcaf72f607d5547"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);