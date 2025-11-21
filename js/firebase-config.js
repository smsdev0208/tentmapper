// Import Firebase SDK
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyApM1SommsAgnnQmBKcWPhb6-6C9AneR5Q",
  authDomain: "tent-mapper.firebaseapp.com",
  projectId: "tent-mapper",
  storageBucket: "tent-mapper.firebasestorage.app",
  messagingSenderId: "985438520114",
  appId: "1:985438520114:web:8bc61865b4392466f0cd2b",
  measurementId: "G-22059713VZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore and Storage
export const db = getFirestore(app);
export const storage = getStorage(app);

// reCAPTCHA site key
export const RECAPTCHA_SITE_KEY = '6LctphMsAAAAAF7GKY3kY3AZ1TAg8fdyHqvqUfKL';

console.log('Firebase initialized successfully');

