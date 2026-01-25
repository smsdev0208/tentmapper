// Import Firebase SDK
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

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

// Initialize Firestore, Storage, and Auth
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

// reCAPTCHA site key
export const RECAPTCHA_SITE_KEY = '6LctphMsAAAAAF7GKY3kY3AZ1TAg8fdyHqvqUfKL';

// Anonymous authentication state
let authInitialized = false;
let currentUser = null;

// Ensure user is authenticated anonymously
export async function ensureAuthenticated() {
    if (authInitialized && currentUser) {
        return currentUser;
    }
    
    return new Promise((resolve, reject) => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            unsubscribe();
            
            if (user) {
                // User is already signed in
                currentUser = user;
                authInitialized = true;
                console.log('User already authenticated:', user.uid);
                resolve(user);
            } else {
                // Sign in anonymously
                try {
                    console.log('Signing in anonymously...');
                    const result = await signInAnonymously(auth);
                    currentUser = result.user;
                    authInitialized = true;
                    console.log('Signed in anonymously:', result.user.uid);
                    resolve(result.user);
                } catch (error) {
                    console.error('Error signing in anonymously:', error);
                    reject(error);
                }
            }
        });
    });
}

// Get current user (may be null if not yet initialized)
export function getCurrentUser() {
    return currentUser;
}

// Initialize auth on load
ensureAuthenticated().catch(error => {
    console.error('Failed to initialize authentication:', error);
});

console.log('Firebase initialized successfully');

