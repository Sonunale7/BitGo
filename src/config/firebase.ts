import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyC2Jgo25HgwSERkVsA6vXrk-93ik5LBeZ4",
  authDomain: "bitgo-e290d.firebaseapp.com",
  databaseURL: "https://bitgo-e290d-default-rtdb.firebaseio.com",
  projectId: "bitgo-e290d",
  storageBucket: "bitgo-e290d.firebasestorage.app",
  messagingSenderId: "138027187864",
  appId: "1:138027187864:web:e9ea86d41d342e8c419aed",
  measurementId: "G-Z02DQBQEN2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database
export const database = getDatabase(app);

export default app;
