import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, onValue, query, limitToLast, orderByKey, startAt, endAt } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

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

// ============================================================
// CHART + HISTORY — semua dijalankan setelah halaman siap
// ============================================================
let chartDev1 = null;
let chartDev2 = null;

window.addEventListener('load', () => {

    // --- Inisialisasi Chart ---
    const commonOptions = {
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        scales: {
            x: { display: true, title: { display: true, text: 'Waktu' } },
            yPH:  { type: 'linear', display: true, position: 'left',  title: { display: true, text: 'pH' } },
            yTDS: { type: 'linear', display: true, position: 'right', title: { display: true, text: 'TDS (ppm)' }, grid: { drawOnChartArea: false } },
            yTemp:{ type: 'linear', display: true, position: 'right', title: { display: true, text: 'Temp (°C)' }, grid: { drawOnChartArea: false } }
        }
    };

    chartDev1 = new Chart(document.getElementById('chart-dev1').getContext('2d'), {
        type: 'line', data: { labels: [], datasets: [] }, options: JSON.parse(JSON.stringify(commonOptions))
    });
    chartDev2 = new Chart(document.getElementById('chart-dev2').getContext('2d'), {
        type: 'line', data: { labels: [], datasets: [] }, options: JSON.parse(JSON.stringify(commonOptions))
    });

    // --- Fungsi update chart ---
    function updateChartData(chart, labels, phData, tdsData, tempData) {
        if (!chart) return;
        chart.data.labels = labels;
        const datasets = [
            { label: 'pH',   data: phData,   borderColor: '#40916c', backgroundColor: 'transparent', yAxisID: 'yPH',   tension: 0.3, borderWidth: 2, pointRadius: 2 },
            { label: 'TDS',  data: tdsData,  borderColor: '#023e8a', backgroundColor: 'transparent', yAxisID: 'yTDS',  tension: 0.3, borderWidth: 2, pointRadius: 2 },
            { label: 'Temp', data: tempData, borderColor: '#e63946', backgroundColor: 'transparent', yAxisID: 'yTemp', tension: 0.3, borderWidth: 2, pointRadius: 2 }
        ];
        if (chart.data.datasets.length === 0) {
            chart.data.datasets = datasets;
        } else {
            chart.data.datasets[0].data = phData;
            chart.data.datasets[1].data = tdsData;
            chart.data.datasets[2].data = tempData;
        }
        chart.update();
    }

    // --- Tampilkan/sembunyikan pesan kosong ---
    function toggleEmptyMsg(devId, hasData) {
        const el = document.getElementById(devId + '-empty-msg');
        if (el) el.style.display = hasData ? 'none' : 'block';
    }

    // --- Load History dari Firebase ---
    let unsubHistory = null;

    function loadHistory(dateStr) {
        if (unsubHistory) { unsubHistory(); unsubHistory = null; }

        let historyQuery;
        if (!dateStr) {
            historyQuery = query(ref(db, 'HydroponicSystem/History'), limitToLast(20));
        } else {
            const startKey = dateStr + '_00-00-00';
            const endKey   = dateStr + '_23-59-59';
            historyQuery = query(
                ref(db, 'HydroponicSystem/History'),
                orderByKey(),
                startAt(startKey),
                endAt(endKey)
            );
        }

        unsubHistory = onValue(historyQuery, (snapshot) => {
            const data = snapshot.val();
            console.log('[History] dateStr:', dateStr, '| jumlah data:', data ? Object.keys(data).length : 0, data);

            if (!data) {
                toggleEmptyMsg('dev1', false);
                toggleEmptyMsg('dev2', false);
                updateChartData(chartDev1, [], [], [], []);
                updateChartData(chartDev2, [], [], [], []);
                return;
            }

            const labels = [];
            const dev1PH = [], dev1TDS = [], dev1Temp = [];
            const dev2PH = [], dev2TDS = [], dev2Temp = [];
            let validDev1 = false, validDev2 = false;

            Object.keys(data).sort().forEach(key => {
                const entry = data[key];

                // Ambil jam:menit dari kunci "YYYY-MM-DD_HH-mm-ss"
                let timeLabel = key.length >= 16
                    ? key.substring(11, 13) + ':' + key.substring(14, 16)
                    : key;
                labels.push(timeLabel);

                if (entry.Installation_A) {
                    dev1PH.push(entry.Installation_A.pH ?? null);
                    dev1TDS.push(entry.Installation_A.TDS_Nutrition ?? null);
                    dev1Temp.push(entry.Installation_A.Water_Temp ?? null);
                    validDev1 = true;
                } else { dev1PH.push(null); dev1TDS.push(null); dev1Temp.push(null); }

                if (entry.Installation_B) {
                    dev2PH.push(entry.Installation_B.pH ?? null);
                    dev2TDS.push(entry.Installation_B.TDS_Nutrition ?? null);
                    dev2Temp.push(entry.Installation_B.Water_Temp ?? null);
                    validDev2 = true;
                } else { dev2PH.push(null); dev2TDS.push(null); dev2Temp.push(null); }
            });

            toggleEmptyMsg('dev1', validDev1);
            toggleEmptyMsg('dev2', validDev2);
            updateChartData(chartDev1, labels, dev1PH, dev1TDS, dev1Temp);
            updateChartData(chartDev2, labels, dev2PH, dev2TDS, dev2Temp);
        });
    }

    // Pertama kali: mode Live
    loadHistory(null);

    // Event Listeners
    const datePicker = document.getElementById('history-date');

    datePicker.addEventListener('change', (e) => loadHistory(e.target.value || null));

}); // END window.addEventListener('load')
