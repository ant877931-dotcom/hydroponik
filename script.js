import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

// Firebase Configuration (provided)
const firebaseConfig = {
    apiKey: "AIzaSyBF2-gyMKbL_4mKvt_Q0yOVN67B5KtRfXk",
    databaseURL: "https://hydroponics-2026-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Store dynamic thresholds from Firebase
let thresholds = {
    Environment: {},
    Installation_A: {},
    Installation_B: {}
};

// Helper to update DOM card
function updateCard(cardId, value, device, type, format = (v) => v) {
    const cardEl = document.getElementById(cardId);
    if (!cardEl) return;

    const valEl = cardEl.querySelector('.value');
    const rangeEl = cardEl.querySelector('.range-val');
    const badgeEl = cardEl.querySelector('.badge');

    let minKey, maxKey;
    if (type === 'ph') { minKey = 'pH_Min'; maxKey = 'pH_Max'; }
    else if (type === 'tds') { minKey = 'TDS_Nutrition_Min'; maxKey = 'TDS_Nutrition_Max'; }
    else if (type === 'waterTemp') { minKey = 'Water_Temp_Min'; maxKey = 'Water_Temp_Max'; }
    else if (type === 'airTemp') { minKey = 'Temperature_Min'; maxKey = 'Temperature_Max'; }
    else if (type === 'humidity') { minKey = 'Humidity_Min'; maxKey = 'Humidity_Max'; }

    const min = thresholds[device][minKey];
    const max = thresholds[device][maxKey];

    // Update range text
    if (min !== undefined && max !== undefined) {
        rangeEl.textContent = `${min} - ${max}`;
    } else {
        rangeEl.textContent = `-- - --`;
    }

    // Update value & badge
    if (value !== null && value !== undefined) {
        valEl.textContent = format(value);
        
        badgeEl.classList.remove('optimal', 'warning', 'danger');
        if (min !== undefined && max !== undefined) {
            if (value >= min && value <= max) {
                badgeEl.textContent = "Optimal";
                badgeEl.classList.add('optimal');
            } else {
                badgeEl.textContent = "Warning";
                badgeEl.classList.add('danger');
            }
        } else {
            badgeEl.textContent = "No Threshold";
            badgeEl.classList.add('warning');
        }
    } else {
        valEl.textContent = "--";
        badgeEl.textContent = "Waiting";
        badgeEl.classList.remove('optimal', 'warning', 'danger');
        badgeEl.classList.add('warning');
    }
}

// Database Paths based on structure
const thresholdRef = ref(db, 'HydroponicSystem/Threshold');
const monitoringRef = ref(db, 'HydroponicSystem/Monitoring');

let currentData = null;

function renderAll() {
    if (!currentData) return;
    
    // Alat 1 (Installation_A)
    if (currentData.Installation_A) {
        updateCard('dev1-ph', currentData.Installation_A.pH, 'Installation_A', 'ph', (v) => parseFloat(v).toFixed(1));
        updateCard('dev1-tds', currentData.Installation_A.TDS_Nutrition, 'Installation_A', 'tds', (v) => parseInt(v));
        updateCard('dev1-temp', currentData.Installation_A.Water_Temp, 'Installation_A', 'waterTemp', (v) => parseFloat(v).toFixed(1));
    }

    // Alat 2 (Installation_B)
    if (currentData.Installation_B) {
        updateCard('dev2-ph', currentData.Installation_B.pH, 'Installation_B', 'ph', (v) => parseFloat(v).toFixed(1));
        updateCard('dev2-tds', currentData.Installation_B.TDS_Nutrition, 'Installation_B', 'tds', (v) => parseInt(v));
        updateCard('dev2-temp', currentData.Installation_B.Water_Temp, 'Installation_B', 'waterTemp', (v) => parseFloat(v).toFixed(1));
    }

    // Lingkungan (Environment)
    if (currentData.Environment) {
        updateCard('env-temp', currentData.Environment.Temperature, 'Environment', 'airTemp', (v) => parseFloat(v).toFixed(1));
        updateCard('env-hum', currentData.Environment.Humidity, 'Environment', 'humidity', (v) => parseInt(v));
    }
}

// Listen to Thresholds dynamically
onValue(thresholdRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
        if (data.Environment) thresholds.Environment = data.Environment;
        if (data.Installation_A) thresholds.Installation_A = data.Installation_A;
        if (data.Installation_B) thresholds.Installation_B = data.Installation_B;
        renderAll(); // Re-evaluate when thresholds change
    }
});

// Listen to Monitoring Realtime Data
onValue(monitoringRef, (snapshot) => {
    currentData = snapshot.val();
    renderAll();
});
