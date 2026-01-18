// Firebase Configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getDatabase, ref, set, get, onValue, push, child, onDisconnect, update } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyDHj6QuhxwXDh3IuJu_40KKViu9HAhrL44",
    authDomain: "family-town-58f10.firebaseapp.com",
    databaseURL: "https://family-town-58f10-default-rtdb.firebaseio.com",
    projectId: "family-town-58f10",
    storageBucket: "family-town-58f10.firebasestorage.app",
    messagingSenderId: "828252447493",
    appId: "1:828252447493:web:340587ed15b75bd33d0d6c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export { db, ref, set, get, onValue, push, child, onDisconnect, update };
