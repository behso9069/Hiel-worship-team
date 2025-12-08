import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCLXB6lR1PnugOhx5BufQ7Rs6GZ-eACdz8",
  authDomain: "hiel-worship-team.firebaseapp.com",
  projectId: "hiel-worship-team",
  storageBucket: "hiel-worship-team.firebasestorage.app",
  messagingSenderId: "827585564996",
  appId: "1:827585564996:web:79546c5710614632d10711"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
