// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAa2mmC-TCAIAUg7nPVPIpR96Y4tsUBlc0",
  authDomain: "vectr-484622.firebaseapp.com",
  projectId: "vectr-484622",
  storageBucket: "vectr-484622.firebasestorage.app",
  messagingSenderId: "644641090902",
  appId: "1:644641090902:web:8b0c8a0b482204dda7faf7",
  measurementId: "G-5LDJNXLB4F",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
