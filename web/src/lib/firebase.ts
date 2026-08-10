import { getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyASuvaFV9g48N8uzbjX5rC06iqXU2WgU-U",
  // Same origin as the app avoids iPhone/Safari storage partitioning during OAuth.
  authDomain: "sunreads.se",
  projectId: "sunbooks-fe49c",
  storageBucket: "sunbooks-fe49c.firebasestorage.app",
  messagingSenderId: "278678544545",
  appId: "1:278678544545:web:a02c68d7f53c8ad4bed0e0",
};

const app = getApps()[0] ?? initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
