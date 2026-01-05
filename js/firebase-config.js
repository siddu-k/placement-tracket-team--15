// ========== FIREBASE CONFIG ==========
const firebaseConfig = {
    apiKey: "AIzaSyDxuSogEBS4s9CqmS6TaCil9CyDAOAp9So",
    authDomain: "placementracker.firebaseapp.com",
    projectId: "placementracker",
    storageBucket: "placementracker.firebasestorage.app",
    messagingSenderId: "853863085778",
    appId: "1:853863085778:web:f37516775416d524ed9f0b",
    measurementId: "G-ZHEJVY7NGW"
};

// Initialize Firebase
let db = null;
let auth = null;

try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    auth = firebase.auth();
    console.log('✅ Firebase initialized successfully');
    console.log('📊 Project:', firebaseConfig.projectId);
} catch (error) {
    console.error('❌ Firebase initialization error:', error);
}

// Check authentication state
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        console.log('✅ User logged in:', user.email);
    } else {
        console.log('ℹ️ No user logged in');
    }
});
