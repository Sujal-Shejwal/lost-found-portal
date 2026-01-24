import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDAyqY1uPByDfRykBSjgxw74Hx1DNKKmHE",
  authDomain: "lost-found-portal-31c37.firebaseapp.com",
  projectId: "lost-found-portal-31c37",
  storageBucket: "lost-found-portal-31c37.appspot.com",
  messagingSenderId: "775312601409",
  appId: "1:775312601409:web:e5d016ee4786768025b1c0",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

export const db = getFirestore(app);
export const storage = getStorage(app);
