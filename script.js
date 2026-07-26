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
let chartPH   = null;
let chartTDS  = null;
let chartTemp = null;

window.addEventListener('load', () => {

    // --- Opsi dasar chart yang dipakai ulang ---
    function makeChart(canvasId, yLabel, yMin, yMax) {
        return new Chart(document.getElementById(canvasId).getContext('2d'), {
            type: 'line',
            data: { labels: [], datasets: [] },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 4,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { position: 'top', align: 'end', labels: { boxWidth: 12, font: { size: 11 } } }
                },
                scales: {
                    x: {
                        display: true,
                        title: { display: true, text: 'Waktu', font: { size: 11 } },
                        ticks: { maxRotation: 0, font: { size: 10 } }
                    },
                    y: {
                        display: true,
                        title: { display: true, text: yLabel, font: { size: 11 } },
                        ...(yMin !== null ? { suggestedMin: yMin } : {}),
                        ...(yMax !== null ? { suggestedMax: yMax } : {}),
                        ticks: { font: { size: 10 } }
                    }
                }
            }
        });
    }

    chartPH   = makeChart('chart-ph',   'pH',         5,    9);
    chartTDS  = makeChart('chart-tds',  'TDS (ppm)',  null, null);
    chartTemp = makeChart('chart-temp', 'Temp (°C)',  null, null);

    // --- Update satu chart dengan 2 dataset (dev1 & dev2) ---
    function updateChart(chart, labels, data1, data2, label1, label2, color1, color2) {
        if (!chart) return;
        chart.data.labels = labels;
        const newDatasets = [
            {
                label: label1, data: data1,
                borderColor: color1, backgroundColor: color1 + '22',
                tension: 0.3, borderWidth: 2, pointRadius: 2, fill: false
            },
            {
                label: label2, data: data2,
                borderColor: color2, backgroundColor: color2 + '22',
                tension: 0.3, borderWidth: 2, pointRadius: 2, fill: false,
                borderDash: [5, 3]
            }
        ];
        if (chart.data.datasets.length === 0) {
            chart.data.datasets = newDatasets;
        } else {
            chart.data.datasets[0].data = data1;
            chart.data.datasets[1].data = data2;
        }
        chart.update();
    }

    // --- Tampilkan/sembunyikan pesan kosong global ---
    function toggleEmptyMsg(hasData) {
        const el = document.getElementById('history-empty-msg');
        if (el) el.style.display = hasData ? 'none' : 'flex';
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

            if (!data || Object.keys(data).length === 0) {
                toggleEmptyMsg(false);
                // Kosongkan semua chart
                [chartPH, chartTDS, chartTemp].forEach(c => {
                    if (!c) return;
                    c.data.labels = [];
                    if (c.data.datasets.length > 0) {
                        c.data.datasets[0].data = [];
                        c.data.datasets[1].data = [];
                    }
                    c.update();
                });
                return;
            }

            toggleEmptyMsg(true);

            const labels   = [];
            const ph1 = [], ph2 = [];
            const tds1 = [], tds2 = [];
            const temp1 = [], temp2 = [];

            Object.keys(data).sort().forEach(key => {
                const entry = data[key];

                // Label waktu dari kunci "YYYY-MM-DD_HH-mm-ss"
                const timeLabel = key.length >= 16
                    ? key.substring(11, 13) + ':' + key.substring(14, 16)
                    : key;
                labels.push(timeLabel);

                ph1.push(entry.Installation_A?.pH ?? null);
                tds1.push(entry.Installation_A?.TDS_Nutrition ?? null);
                temp1.push(entry.Installation_A?.Water_Temp ?? null);

                ph2.push(entry.Installation_B?.pH ?? null);
                tds2.push(entry.Installation_B?.TDS_Nutrition ?? null);
                temp2.push(entry.Installation_B?.Water_Temp ?? null);
            });

            updateChart(chartPH,   labels, ph1,   ph2,   'Device 1', 'Device 2', '#40916c', '#e63946');
            updateChart(chartTDS,  labels, tds1,  tds2,  'Device 1', 'Device 2', '#023e8a', '#f59e0b');
            updateChart(chartTemp, labels, temp1, temp2, 'Device 1', 'Device 2', '#7b2d8b', '#0ea5e9');
        });
    }

    // Pertama kali: mode Live
    loadHistory(null);

    // Event Listener tanggal
    document.getElementById('history-date')
        .addEventListener('change', (e) => loadHistory(e.target.value || null));

}); // END window.addEventListener('load')
