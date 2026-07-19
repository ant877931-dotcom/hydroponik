import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-analytics.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js";

// Firebase project credentials
const firebaseConfig = {
    apiKey: "AIzaSyANbryI2Er_P8Eu6bHgkn4I4A6Yc-Cfgjw",
    authDomain: "hydroponik-592f5.firebaseapp.com",
    databaseURL: "https://hydroponik-592f5-default-rtdb.firebaseio.com", // Usually required for Realtime Database
    projectId: "hydroponik-592f5",
    storageBucket: "hydroponik-592f5.firebasestorage.app",
    messagingSenderId: "396147590725",
    appId: "1:396147590725:web:935be827323d80ec68852c",
    measurementId: "G-LQY4W5LXQS"
};

// Initialize Firebase
let app, db, analytics;
try {
    app = initializeApp(firebaseConfig);
    analytics = getAnalytics(app);
    db = getDatabase(app);
} catch (error) {
    console.error("Firebase initialization error:", error);
}

// Define ideal ranges for visual status cues
const THRESHOLDS = {
    ph: { min: 5.5, max: 6.5 },
    tds: { min: 600, max: 1000 },
    waterTemp: { min: 18, max: 28 },
    airTemp: { min: 20, max: 32 },
    humidity: { min: 50, max: 70 }
};

/**
 * Determines the status based on thresholds
 * @param {number} value - The sensor value
 * @param {object} thresholds - Min and max thresholds
 * @returns {object} Status object with CSS class and display text
 */
function evaluateStatus(value, thresholds) {
    if (value === null || value === undefined || isNaN(value)) {
        return { class: '', text: 'No Data' };
    }
    
    if (value < thresholds.min) {
        return { class: 'status-warning', text: 'Low' };
    } else if (value > thresholds.max) {
        // Highlight in danger color if extremely high
        if (value > thresholds.max * 1.2) {
            return { class: 'status-danger', text: 'Critical High' };
        }
        return { class: 'status-warning', text: 'High' };
    } else {
        return { class: 'status-good', text: 'Optimal' };
    }
}

/**
 * Updates a specific card's UI with new data
 * @param {string} cardId - The ID of the card wrapper
 * @param {string} valId - The ID of the value text element
 * @param {string} statusId - The ID of the status text element
 * @param {number} value - The actual sensor value
 * @param {string} thresholdKey - Key matching the THRESHOLDS object
 * @param {number} decimalPlaces - Decimals to display (0 for integers)
 */
function updateCard(cardId, valId, statusId, value, thresholdKey, decimalPlaces = 1) {
    const cardEl = document.getElementById(cardId);
    const valEl = document.getElementById(valId);
    const statusEl = document.getElementById(statusId);

    if (!cardEl || !valEl || !statusEl) return;

    if (value !== null && value !== undefined) {
        // Format value
        const formattedValue = Number.isInteger(value) ? value : parseFloat(value).toFixed(decimalPlaces);
        valEl.textContent = formattedValue;

        // Apply status classes and text
        const thresholds = THRESHOLDS[thresholdKey];
        const status = evaluateStatus(value, thresholds);

        // Reset previous status classes
        cardEl.classList.remove('status-good', 'status-warning', 'status-danger');
        
        // Add new status class if applicable
        if (status.class) {
            cardEl.classList.add(status.class);
        }
        
        statusEl.textContent = status.text;
    } else {
        valEl.textContent = '--';
        statusEl.textContent = 'Error';
        cardEl.classList.remove('status-good', 'status-warning', 'status-danger');
    }
}

// Setup Realtime Database Listeners
if (db) {
    // Listen for Alat 1 Data
    const alat1Ref = ref(db, 'alat1');
    onValue(alat1Ref, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            // Expected keys: ph, tds, waterTemp
            updateCard('card-a1-ph', 'val-a1-ph', 'status-a1-ph', data.ph, 'ph', 1);
            updateCard('card-a1-tds', 'val-a1-tds', 'status-a1-tds', data.tds, 'tds', 0);
            updateCard('card-a1-temp', 'val-a1-temp', 'status-a1-temp', data.waterTemp, 'waterTemp', 1);
        } else {
            updateCard('card-a1-ph', 'val-a1-ph', 'status-a1-ph', null, 'ph');
            updateCard('card-a1-tds', 'val-a1-tds', 'status-a1-tds', null, 'tds');
            updateCard('card-a1-temp', 'val-a1-temp', 'status-a1-temp', null, 'waterTemp');
        }
    }, (error) => {
        console.error("Error fetching Alat 1 data:", error);
    });

    // Listen for Alat 2 Data
    const alat2Ref = ref(db, 'alat2');
    onValue(alat2Ref, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            // Expected keys: ph, tds, waterTemp
            updateCard('card-a2-ph', 'val-a2-ph', 'status-a2-ph', data.ph, 'ph', 1);
            updateCard('card-a2-tds', 'val-a2-tds', 'status-a2-tds', data.tds, 'tds', 0);
            updateCard('card-a2-temp', 'val-a2-temp', 'status-a2-temp', data.waterTemp, 'waterTemp', 1);
        } else {
            updateCard('card-a2-ph', 'val-a2-ph', 'status-a2-ph', null, 'ph');
            updateCard('card-a2-tds', 'val-a2-tds', 'status-a2-tds', null, 'tds');
            updateCard('card-a2-temp', 'val-a2-temp', 'status-a2-temp', null, 'waterTemp');
        }
    }, (error) => {
        console.error("Error fetching Alat 2 data:", error);
    });

    // Listen for Lingkungan Data
    const lingkunganRef = ref(db, 'lingkungan');
    onValue(lingkunganRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            // Expected keys: airTemp (suhu ruang), humidity (kelembapan ruang)
            updateCard('card-env-temp', 'val-env-temp', 'status-env-temp', data.airTemp, 'airTemp', 1);
            updateCard('card-env-hum', 'val-env-hum', 'status-env-hum', data.humidity, 'humidity', 0);
        } else {
            updateCard('card-env-temp', 'val-env-temp', 'status-env-temp', null, 'airTemp');
            updateCard('card-env-hum', 'val-env-hum', 'status-env-hum', null, 'humidity');
        }
    }, (error) => {
        console.error("Error fetching Lingkungan data:", error);
    });
} else {
    console.log("Waiting for valid Firebase Configuration...");
}
