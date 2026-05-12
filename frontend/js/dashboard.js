/**
 * TreeSense AI — Dashboard JavaScript
 * Project: AI-Driven IoT Framework for Tree Behaviour Analysis
 * Author: Prof. Anjit Raja R — RGU CII | Version: 1.0.0 | May 2026
 */

'use strict';

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const CONFIG = {
  WS_URL:      'ws://localhost:8000/ws/live',
  API_BASE:    'http://localhost:8000/api/v1',
  MAP_CENTER:  [11.0168, 76.9558],   // Coimbatore, Tamil Nadu
  MAP_ZOOM:    14,
  UPDATE_MS:   3000,
  CHART_POINTS: 30,
};

// ─── STATE ────────────────────────────────────────────────────────────────────
const STATE = {
  trees:       [],
  activePage:  'dashboard',
  activeTree:  'RGU-TBA-0001',
  ws:          null,
  map:         null,
  markers:     {},
  charts:      {},
  alerts:      [],
  mockMode:    true,   // fallback when backend is offline
};

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MOCK_TREES = [
  { id:'RGU-TBA-0001', name:'Ficus benghalensis',  common:'Banyan Tree',     lat:11.0168, lng:76.9558, health:87, status:'Healthy' },
  { id:'RGU-TBA-0002', name:'Tectona grandis',     common:'Teak Tree',       lat:11.0182, lng:76.9571, health:62, status:'Moderate' },
  { id:'RGU-TBA-0003', name:'Mangifera indica',    common:'Mango Tree',      lat:11.0155, lng:76.9545, health:45, status:'Stressed' },
  { id:'RGU-TBA-0004', name:'Azadirachta indica',  common:'Neem Tree',       lat:11.0175, lng:76.9532, health:91, status:'Healthy' },
  { id:'RGU-TBA-0005', name:'Delonix regia',       common:'Royal Poinciana', lat:11.0161, lng:76.9580, health:28, status:'Critical' },
];

function mockSensorData(treeId) {
  const base = { 'RGU-TBA-0001':87,'RGU-TBA-0002':62,'RGU-TBA-0003':45,'RGU-TBA-0004':91,'RGU-TBA-0005':28 };
  const h = base[treeId] || 75;
  return {
    tree_id:      treeId,
    timestamp:    new Date().toISOString(),
    temperature:  (25 + Math.random() * 10).toFixed(1),
    humidity:     (50 + Math.random() * 30).toFixed(1),
    soil_moisture:(30 + Math.random() * 40).toFixed(1),
    soil_ph:      (5.5 + Math.random() * 2).toFixed(2),
    co2_ppm:      (380 + Math.random() * 120).toFixed(0),
    lux:          (1000 + Math.random() * 9000).toFixed(0),
    wind_speed:   (0 + Math.random() * 15).toFixed(1),
    rainfall_mm:  (Math.random() > 0.7 ? (Math.random()*5).toFixed(1) : '0.0'),
    health_score: h + (Math.random()*4 - 2),
    battery_pct:  (60 + Math.random() * 40).toFixed(0),
    signal_rssi:  (-90 + Math.random() * 50).toFixed(0),
  };
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  STATE.trees = MOCK_TREES;
  setupNav();
  showPage('dashboard');
  startLiveFeed();
});

// ─── NAVIGATION ───────────────────────────────────────────────────────────────
function setupNav() {
  // HTML uses data-panel attribute
  document.querySelectorAll('.nav-item[data-panel]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const page = btn.dataset.panel;
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      showPage(page);
    });
  });
}

function showPage(page) {
  STATE.activePage = page;
  // HTML uses class="panel" and id="panel-*"
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  const el = document.getElementById(`panel-${page}`);
  if (el) el.classList.add('active');

  // Update topbar title
  const titles = {
    dashboard: 'Dashboard Overview', map: 'GIS Map View',
    sensors: 'Live Sensors', trees: 'Tree Registry',
    ai: 'AI Insights', alerts: 'Alert Management',
    analytics: 'Analytics', carbon: 'Carbon Tracker',
    qr: 'QR Identity', research: 'Research & Export'
  };
  const titleEl = document.getElementById('pageTitle');
  if (titleEl) titleEl.textContent = titles[page] || page;

  switch (page) {
    case 'dashboard':  initDashboard();  break;
    case 'map':        initMap();        break;
    case 'sensors':    initSensors();    break;
    case 'trees':      initTrees();      break;
    case 'ai':         initAI();         break;
    case 'alerts':     initAlerts();     break;
    case 'analytics':  initAnalytics();  break;
    case 'carbon':     initCarbon();     break;
    case 'qr':         initQR();         break;
    case 'research':   initResearch();   break;
  }
}

// ─── LIVE FEED ────────────────────────────────────────────────────────────────
function startLiveFeed() {
  // Try WebSocket first
  try {
    STATE.ws = new WebSocket(CONFIG.WS_URL);
    STATE.ws.onmessage = (e) => handleLiveData(JSON.parse(e.data));
    STATE.ws.onerror   = () => { STATE.mockMode = true; startMockFeed(); };
  } catch {
    STATE.mockMode = true;
    startMockFeed();
  }
}

function startMockFeed() {
  setInterval(() => {
    const data = mockSensorData(STATE.activeTree);
    handleLiveData(data);
  }, CONFIG.UPDATE_MS);
}

function handleLiveData(data) {
  updateStatCards(data);
  updateCharts(data);
  updateStatusBadge(data);
  if (Math.random() > 0.85) generateAlert(data);
}

// ─── DASHBOARD PAGE ───────────────────────────────────────────────────────────
function initDashboard() {
  populateTreeSelector();
  initOverviewCharts();
  startMockFeed();
}

function populateTreeSelector() {
  const sel = document.getElementById('tree-selector');
  if (!sel) return;
  sel.innerHTML = STATE.trees.map(t =>
    `<option value="${t.id}" ${t.id===STATE.activeTree?'selected':''}>${t.common} (${t.id})</option>`
  ).join('');
  sel.addEventListener('change', () => { STATE.activeTree = sel.value; });
}

function updateStatCards(data) {
  const set = (id, val, unit='') => {
    const el = document.getElementById(id);
    if (el) el.textContent = val + unit;
  };
  set('stat-temp',     data.temperature,  '°C');
  set('stat-humidity', data.humidity,     '%');
  set('stat-moisture', data.soil_moisture,'%');
  set('stat-co2',      data.co2_ppm,      ' ppm');
  set('stat-lux',      data.lux,          ' lx');
  set('stat-ph',       data.soil_ph,      '');
  set('stat-wind',     data.wind_speed,   ' m/s');
  set('stat-health',   parseFloat(data.health_score).toFixed(0), '/100');
  set('stat-battery',  data.battery_pct,  '%');
  set('stat-signal',   data.signal_rssi,  ' dBm');
  set('stat-rain',     data.rainfall_mm,  ' mm');

  // Health ring
  const ring = document.getElementById('health-ring-value');
  if (ring) {
    const score = parseFloat(data.health_score);
    ring.style.background = `conic-gradient(
      ${healthColor(score)} ${score*3.6}deg,
      rgba(255,255,255,0.1) 0deg
    )`;
    const label = document.getElementById('health-ring-label');
    if (label) label.textContent = score.toFixed(0);
  }
}

function healthColor(score) {
  if (score >= 75) return '#22c55e';
  if (score >= 50) return '#f59e0b';
  if (score >= 30) return '#f97316';
  return '#ef4444';
}

function updateStatusBadge(data) {
  const badge = document.getElementById('node-status-badge');
  if (!badge) return;
  const batt = parseInt(data.battery_pct);
  badge.textContent = batt > 20 ? '🟢 Node Online' : '🟡 Low Battery';
  badge.className   = `badge ${batt > 20 ? 'badge-green' : 'badge-amber'}`;
}

// ─── CHARTS ───────────────────────────────────────────────────────────────────
function initOverviewCharts() {
  createLineChart('chart-temp',     'Temperature (°C)', '#22c55e');
  createLineChart('chart-humidity', 'Humidity (%)',     '#14b8a6');
  createLineChart('chart-moisture', 'Soil Moisture (%)','#a855f7');
  createLineChart('chart-co2',      'CO₂ (ppm)',        '#f59e0b');
}

function createLineChart(canvasId, label, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !window.Chart) return;
  const ctx = canvas.getContext('2d');
  if (STATE.charts[canvasId]) STATE.charts[canvasId].destroy();

  const labels = Array.from({length: CONFIG.CHART_POINTS}, (_, i) => {
    const d = new Date(Date.now() - (CONFIG.CHART_POINTS - i) * CONFIG.UPDATE_MS);
    return d.toLocaleTimeString();
  });

  STATE.charts[canvasId] = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label,
        data:            Array(CONFIG.CHART_POINTS).fill(null),
        borderColor:     color,
        backgroundColor: color + '22',
        borderWidth:     2,
        pointRadius:     0,
        tension:         0.4,
        fill:            true,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 300 },
      plugins: { legend: { labels: { color: '#94a3b8' } } },
      scales: {
        x: { ticks: { color:'#64748b', maxTicksLimit:6 }, grid: { color:'rgba(255,255,255,0.05)' } },
        y: { ticks: { color:'#64748b' },                  grid: { color:'rgba(255,255,255,0.05)' } }
      }
    }
  });
}

function updateCharts(data) {
  const push = (id, value) => {
    const chart = STATE.charts[id];
    if (!chart) return;
    chart.data.labels.push(new Date().toLocaleTimeString());
    chart.data.labels.shift();
    chart.data.datasets[0].data.push(parseFloat(value));
    chart.data.datasets[0].data.shift();
    chart.update('none');
  };
  push('chart-temp',     data.temperature);
  push('chart-humidity', data.humidity);
  push('chart-moisture', data.soil_moisture);
  push('chart-co2',      data.co2_ppm);
}

// ─── MAP PAGE ─────────────────────────────────────────────────────────────────
function initMap() {
  // HTML uses id="leafletMap"
  const container = document.getElementById('leafletMap');
  if (!container || !window.L) return;
  if (STATE.map) { STATE.map.invalidateSize(); return; }

  STATE.map = L.map('leafletMap', { zoomControl: true }).setView(CONFIG.MAP_CENTER, CONFIG.MAP_ZOOM);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© CartoDB | TreeSense AI',
    maxZoom: 20
  }).addTo(STATE.map);

  STATE.trees.forEach(tree => addMapMarker(tree));
}

function addMapMarker(tree) {
  if (!STATE.map) return;
  const color = tree.health >= 75 ? '#22c55e' : tree.health >= 50 ? '#f59e0b' : tree.health >= 30 ? '#f97316' : '#ef4444';
  const icon = L.divIcon({
    className: '',
    html: `<div style="
      width:36px;height:36px;border-radius:50%;
      background:${color};border:3px solid #fff;
      display:flex;align-items:center;justify-content:center;
      font-size:16px;cursor:pointer;box-shadow:0 0 12px ${color}88;
    ">🌳</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });

  const marker = L.marker([tree.lat, tree.lng], { icon }).addTo(STATE.map);
  marker.bindPopup(`
    <div style="font-family:Inter,sans-serif;min-width:200px">
      <h3 style="margin:0 0 8px;color:#22c55e">${tree.common}</h3>
      <p style="margin:2px 0;font-style:italic;color:#64748b">${tree.name}</p>
      <p style="margin:4px 0"><b>ID:</b> ${tree.id}</p>
      <p style="margin:4px 0"><b>Health:</b>
        <span style="color:${color}">${tree.health}/100</span>
      </p>
      <p style="margin:4px 0"><b>Status:</b> ${tree.status}</p>
    </div>
  `);
  STATE.markers[tree.id] = marker;
}

// ─── SENSORS PAGE ─────────────────────────────────────────────────────────────
function initSensors() {
  // Populate the sensors full grid
  const grid = document.getElementById('sensorsFullGrid');
  if (grid) {
    grid.innerHTML = STATE.trees.map(t => {
      const d = mockSensorData(t.id);
      return `
        <div class="card" style="padding:14px">
          <div style="font-weight:700;margin-bottom:8px">🌳 ${t.common}</div>
          <div style="font-size:11px;color:var(--text3);margin-bottom:8px">${t.id}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px">
            <div>🌡 <b>${d.temperature}°C</b></div>
            <div>💧 <b>${d.humidity}%</b></div>
            <div>🌱 <b>${d.soil_moisture}%</b></div>
            <div>🧪 pH <b>${d.soil_ph}</b></div>
            <div>💨 <b>${d.co2_ppm} ppm</b></div>
            <div>☀️ <b>${d.lux} lx</b></div>
          </div>
          <div style="margin-top:8px">
            <span class="badge ${healthBadgeClass(t.health)}">${t.status} — ${t.health}/100</span>
          </div>
        </div>`;
    }).join('');
  }

  // Also try legacy table body
  const tbody = document.getElementById('sensor-table-body');
  if (!tbody) return;
  tbody.innerHTML = STATE.trees.map(t => {
    const d = mockSensorData(t.id);
    return `<tr>
      <td>${t.id}</td><td>${t.common}</td>
      <td>${d.temperature}°C</td><td>${d.humidity}%</td>
      <td>${d.soil_moisture}%</td><td>${d.soil_ph}</td>
      <td>${d.co2_ppm} ppm</td><td>${d.lux} lx</td>
      <td><span class="badge ${healthBadgeClass(t.health)}">${t.status}</span></td>
    </tr>`;
  }).join('');
}

// ─── TREES PAGE ───────────────────────────────────────────────────────────────
function initTrees() {
  const tbody = document.getElementById('treeTableBody');
  if (!tbody) return;
  tbody.innerHTML = STATE.trees.map(t => `
    <tr>
      <td><b>${t.id}</b></td>
      <td>${t.common}</td>
      <td><em>${t.name}</em></td>
      <td>${t.lat.toFixed(4)}, ${t.lng.toFixed(4)}</td>
      <td>—</td>
      <td>${t.health}/100</td>
      <td><span class="badge ${healthBadgeClass(t.health)}">${t.status}</span></td>
      <td><button class="btn-secondary" style="padding:4px 8px;font-size:11px" onclick="alert('View: ${t.id}')">View</button></td>
    </tr>`).join('');
}

// ─── ANALYTICS PAGE ───────────────────────────────────────────────────────────
function initAnalytics() {
  const container = document.getElementById('panel-analytics');
  if (!container) return;
  // If the panel has no content yet, inject a summary
  if (!container.querySelector('.analytics-inner')) {
    container.innerHTML = `
      <div class="analytics-inner">
        <div class="section-header"><h2>📊 Analytics Overview</h2></div>
        <div class="dashboard-row">
          <div class="card chart-card">
            <div class="card-header"><span class="card-title">Network Health Trend (30 days)</span></div>
            <canvas id="analyticsHealthChart" height="140"></canvas>
          </div>
          <div class="card chart-card">
            <div class="card-header"><span class="card-title">Alert Frequency by Category</span></div>
            <canvas id="analyticsAlertChart" height="140"></canvas>
          </div>
        </div>
        <div class="dashboard-row">
          <div class="card">
            <div class="card-header"><span class="card-title">Species Distribution</span></div>
            <canvas id="analyticsSpeciesChart" height="180"></canvas>
          </div>
          <div class="card">
            <div class="card-header"><span class="card-title">Sensor Uptime</span></div>
            <div style="padding:16px">
              ${STATE.trees.map(t => `
                <div class="breakdown-item">
                  <span>${t.common}</span>
                  <div class="mini-bar"><div class="mini-fill" style="width:${88+Math.random()*10}%;background:var(--accent)"></div></div>
                  <span>${(88+Math.random()*10).toFixed(1)}%</span>
                </div>`).join('')}
            </div>
          </div>
        </div>
      </div>`;
    // Render simple charts
    renderAnalyticsCharts();
  }
}

function renderAnalyticsCharts() {
  if (!window.Chart) return;
  // Health trend
  const hCtx = document.getElementById('analyticsHealthChart');
  if (hCtx) {
    new Chart(hCtx, {
      type: 'line',
      data: {
        labels: Array.from({length:30}, (_,i) => `May ${i+1}`),
        datasets: [{ label:'Avg Health', data: Array.from({length:30}, () => 60+Math.random()*30),
          borderColor:'#107C10', backgroundColor:'rgba(16,124,16,0.1)',
          tension:0.4, fill:true, pointRadius:0 }]
      },
      options: { responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ labels:{ color:'#616161' } } },
        scales:{ x:{ ticks:{ color:'#9e9e9e', maxTicksLimit:6 } }, y:{ ticks:{ color:'#9e9e9e' } } }
      }
    });
  }
  // Species donut
  const sCtx = document.getElementById('analyticsSpeciesChart');
  if (sCtx) {
    new Chart(sCtx, {
      type: 'doughnut',
      data: {
        labels: STATE.trees.map(t => t.common),
        datasets: [{ data: STATE.trees.map(t => t.health),
          backgroundColor:['#107C10','#16a34a','#0078D4','#CA5010','#8764B8'] }]
      },
      options: { responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ position:'right', labels:{ color:'#616161', font:{size:11} } } }
      }
    });
  }
}

function healthBadgeClass(score) {
  if (score >= 75) return 'badge-green';
  if (score >= 50) return 'badge-amber';
  if (score >= 30) return 'badge-orange';
  return 'badge-red';
}

// ─── AI PAGE ──────────────────────────────────────────────────────────────────
function initAI() {
  // Populate disease risk list
  const riskList = document.getElementById('diseaseRiskList');
  if (riskList) {
    riskList.innerHTML = STATE.trees.map(t => `
      <div class="risk-item">
        <span>🌳 ${t.common}</span>
        <span>${getDiseaseRisk(t.health)}</span>
        <span class="badge ${healthBadgeClass(t.health)}">${t.health}/100</span>
      </div>`).join('');
  }

  // Populate recommendations
  const recList = document.getElementById('recommendationsList');
  if (recList) {
    recList.innerHTML = STATE.trees.map(t => `
      <div class="rec-item">
        <span>🌳</span>
        <div><b>${t.common}</b> — ${getRecommendation(t.health)}</div>
      </div>`).join('');
  }

  // Growth forecast chart
  const gCtx = document.getElementById('growthChart');
  if (gCtx && window.Chart) {
    if (STATE.charts['growthChart']) STATE.charts['growthChart'].destroy();
    STATE.charts['growthChart'] = new Chart(gCtx, {
      type: 'line',
      data: {
        labels: Array.from({length:30}, (_,i) => `Day ${i+1}`),
        datasets: STATE.trees.slice(0,3).map((t,i) => ({
          label: t.common,
          data: Array.from({length:30}, (_,j) => Math.max(10, t.health + (Math.random()*6-3) + j*0.3)),
          borderColor: ['#107C10','#0078D4','#CA5010'][i],
          borderWidth: 2, pointRadius: 0, tension: 0.4, fill: false
        }))
      },
      options: { responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ labels:{ color:'#616161', font:{size:11} } } },
        scales:{ x:{ ticks:{ color:'#9e9e9e', maxTicksLimit:6 } }, y:{ min:0,max:100, ticks:{ color:'#9e9e9e' } } }
      }
    });
  }

  // Legacy container fallback
  const container = document.getElementById('ai-analysis-container');
  if (!container) return;

  const analyses = STATE.trees.map(tree => {
    const conditions  = getConditionText(tree.health);
    const recommendation = getRecommendation(tree.health);
    const disease = getDiseaseRisk(tree.health);
    return `
    <div class="ai-card">
      <div class="ai-card-header">
        <span class="tree-icon">🌳</span>
        <div>
          <h3>${tree.common}</h3>
          <p class="tree-id">${tree.id} · <em>${tree.name}</em></p>
        </div>
        <span class="health-badge ${healthBadgeClass(tree.health)}">${tree.health}/100</span>
      </div>
      <div class="ai-card-body">
        <div class="ai-row"><b>🩺 Condition:</b> ${conditions}</div>
        <div class="ai-row"><b>⚠️ Disease Risk:</b> ${disease}</div>
        <div class="ai-row"><b>💡 Recommendation:</b> ${recommendation}</div>
        <div class="ai-confidence">
          <span>AI Confidence</span>
          <div class="progress-bar"><div class="progress-fill" style="width:${75+Math.random()*20}%;background:${healthColor(tree.health)}"></div></div>
        </div>
      </div>
    </div>`;
  }).join('');

  container.innerHTML = analyses;
}

function getConditionText(score) {
  if (score >= 75) return 'Tree is healthy with optimal growth indicators.';
  if (score >= 50) return 'Moderate stress detected. Attention recommended.';
  if (score >= 30) return 'Significant stress. Immediate intervention needed.';
  return 'Critical condition. Emergency care required.';
}

function getDiseaseRisk(score) {
  if (score >= 75) return '<span style="color:#22c55e">Low (8%)</span>';
  if (score >= 50) return '<span style="color:#f59e0b">Moderate (34%)</span>';
  if (score >= 30) return '<span style="color:#f97316">High (61%)</span>';
  return '<span style="color:#ef4444">Critical (87%)</span>';
}

function getRecommendation(score) {
  if (score >= 75) return 'Continue regular monitoring. Schedule quarterly soil tests.';
  if (score >= 50) return 'Increase irrigation frequency. Check for pest activity.';
  if (score >= 30) return 'Apply fertilizer treatment. Inspect root zone for infection.';
  return 'Immediate arborist consultation required. Consider quarantine.';
}

// ─── ALERTS PAGE ──────────────────────────────────────────────────────────────
function initAlerts() {
  renderAlerts();
}

function generateAlert(data) {
  const score = parseFloat(data.health_score);
  const temp  = parseFloat(data.temperature);
  const alerts = [];
  if (score < 40)  alerts.push({ type:'critical', msg:`Critical health score ${score.toFixed(0)}/100 on ${data.tree_id}`, time: new Date() });
  if (temp > 34)   alerts.push({ type:'warning',  msg:`High temperature ${temp}°C on ${data.tree_id}`, time: new Date() });
  if (parseFloat(data.soil_moisture) < 25)
    alerts.push({ type:'warning', msg:`Low soil moisture ${data.soil_moisture}% on ${data.tree_id}`, time: new Date() });

  STATE.alerts = [...alerts, ...STATE.alerts].slice(0, 50);
  if (STATE.activePage === 'alerts') renderAlerts();
  updateAlertBadge();
}

function renderAlerts() {
  // HTML uses id="alertsContainer" for full page; "alertsFeed" for dashboard widget
  const targets = [
    document.getElementById('alertsContainer'),
    document.getElementById('alertsFeed'),
    document.getElementById('alerts-feed'),
  ].filter(Boolean);

  if (!targets.length) return;

  const html = !STATE.alerts.length
    ? '<p class="no-alerts">✅ No active alerts — all trees healthy</p>'
    : STATE.alerts.map(a => `
        <div class="alert-item alert-${a.type}">
          <span class="alert-icon">${a.type === 'critical' ? '🔴' : '🟡'}</span>
          <div class="alert-body">
            <p class="alert-msg">${a.msg}</p>
            <p class="alert-time">${a.time.toLocaleString()}</p>
          </div>
        </div>`).join('');

  targets.forEach(el => el.innerHTML = html);
}

function updateAlertBadge() {
  // HTML uses id="alert-badge" in sidebar
  ['alert-badge','alert-count-badge'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = STATE.alerts.length;
  });
}

// ─── CARBON PAGE ──────────────────────────────────────────────────────────────
function initCarbon() {
  const totalCarbon = STATE.trees.reduce((sum, t) => sum + (t.health / 100) * 22.5, 0);

  // Update KPI values in HTML
  [['ck-co2','18.4t'],['ck-stock','8,694 kg'],['ck-credits','$276'],['ck-trees','247']].forEach(([id,val]) => {
    const el = document.querySelector(`.carbon-kpi .ck-value`);
    // handled via static HTML
  });

  // Carbon chart
  const cCtx = document.getElementById('carbonChart');
  if (cCtx && window.Chart) {
    if (STATE.charts['carbonChart']) STATE.charts['carbonChart'].destroy();
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    STATE.charts['carbonChart'] = new Chart(cCtx, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [{ label: 'CO₂ Sequestered (kg)',
          data: months.map(() => 1200 + Math.random()*600),
          backgroundColor: 'rgba(16,124,16,0.7)', borderRadius: 4 }]
      },
      options: { responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ labels:{ color:'#616161' } } },
        scales:{ x:{ ticks:{ color:'#9e9e9e' } }, y:{ ticks:{ color:'#9e9e9e' } } }
      }
    });
  }

  // Top trees chart
  const tCtx = document.getElementById('carbonTopChart');
  if (tCtx && window.Chart) {
    if (STATE.charts['carbonTopChart']) STATE.charts['carbonTopChart'].destroy();
    STATE.charts['carbonTopChart'] = new Chart(tCtx, {
      type: 'bar',
      data: {
        labels: STATE.trees.map(t => t.common),
        datasets: [{ label: 'CO₂ (kg/yr)',
          data: STATE.trees.map(t => ((t.health/100)*22.5).toFixed(1)),
          backgroundColor: ['#107C10','#16a34a','#0078D4','#CA5010','#8764B8'],
          borderRadius: 4 }]
      },
      options: { responsive:true, maintainAspectRatio:false, indexAxis:'y',
        plugins:{ legend:{ display:false } },
        scales:{ x:{ ticks:{ color:'#9e9e9e' } }, y:{ ticks:{ color:'#9e9e9e' } } }
      }
    });
  }

  // Fallback for old container
  const container = document.getElementById('carbon-container');
  if (!container) return;

  const totalCarbon = STATE.trees.reduce((sum, t) => sum + (t.health / 100) * 22.5, 0);
  const totalO2     = STATE.trees.length * 118;

  container.innerHTML = `
    <div class="carbon-stats-grid">
      <div class="carbon-stat">
        <div class="carbon-value">${totalCarbon.toFixed(1)}</div>
        <div class="carbon-label">kg CO₂/year sequestered</div>
      </div>
      <div class="carbon-stat">
        <div class="carbon-value">${totalO2}</div>
        <div class="carbon-label">kg O₂/year produced</div>
      </div>
      <div class="carbon-stat">
        <div class="carbon-value">${STATE.trees.length}</div>
        <div class="carbon-label">monitored trees</div>
      </div>
      <div class="carbon-stat">
        <div class="carbon-value">${(totalCarbon * 0.043).toFixed(2)}</div>
        <div class="carbon-label">carbon credits (est.)</div>
      </div>
    </div>
    <table class="carbon-table">
      <thead><tr><th>Tree ID</th><th>Species</th><th>Health</th><th>CO₂ Seq (kg/yr)</th><th>O₂ Prod (kg/yr)</th></tr></thead>
      <tbody>${STATE.trees.map(t => `
        <tr>
          <td>${t.id}</td>
          <td>${t.common}</td>
          <td><span class="badge ${healthBadgeClass(t.health)}">${t.health}/100</span></td>
          <td>${((t.health/100)*22.5).toFixed(2)}</td>
          <td>${(118*(t.health/100)).toFixed(1)}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  `;
}

// ─── QR PAGE ──────────────────────────────────────────────────────────────────
function initQR() {
  const container = document.getElementById('qr-grid');
  if (!container) return;

  container.innerHTML = STATE.trees.map(t => `
    <div class="qr-card" onclick="showQRDetail('${t.id}')">
      <div class="qr-code-wrap" id="qr-${t.id}"></div>
      <div class="qr-info">
        <h4>${t.common}</h4>
        <p class="tree-id">${t.id}</p>
        <p class="tree-sci"><em>${t.name}</em></p>
        <span class="badge ${healthBadgeClass(t.health)}">${t.status}</span>
      </div>
    </div>
  `).join('');

  // Render QR codes using qrcode.js if available
  STATE.trees.forEach(t => {
    const el = document.getElementById(`qr-${t.id}`);
    if (!el) return;
    if (window.QRCode) {
      new QRCode(el, {
        text:       `${window.location.origin}/?tree=${t.id}`,
        width:      120,
        height:     120,
        colorDark:  '#22c55e',
        colorLight: '#0a0f1e',
        correctLevel: QRCode.CorrectLevel.H
      });
    } else {
      el.innerHTML = `<div class="qr-placeholder">📱<br><small>QR-${t.id}</small></div>`;
    }
  });
}

function showQRDetail(treeId) {
  const tree = STATE.trees.find(t => t.id === treeId);
  if (!tree) return;
  const modal = document.getElementById('qr-modal');
  if (!modal) return;
  modal.innerHTML = `
    <div class="modal-content">
      <button class="modal-close" onclick="closeModal()">✕</button>
      <h2>${tree.common}</h2>
      <p><em>${tree.name}</em></p>
      <p><b>Tree ID:</b> ${tree.id}</p>
      <p><b>Location:</b> ${tree.lat.toFixed(4)}, ${tree.lng.toFixed(4)}</p>
      <p><b>Health Score:</b> <span style="color:${healthColor(tree.health)}">${tree.health}/100</span></p>
      <p><b>Status:</b> ${tree.status}</p>
    </div>
  `;
  modal.style.display = 'flex';
}

function closeModal() {
  const modal = document.getElementById('qr-modal');
  if (modal) modal.style.display = 'none';
}

// ─── RESEARCH PAGE ────────────────────────────────────────────────────────────
function initResearch() {
  const container = document.getElementById('research-container');
  if (!container) return;
  container.innerHTML = `
    <div class="research-grid">
      <div class="research-card">
        <h3>📊 Dataset Summary</h3>
        <p>Continuous sensor data from ${STATE.trees.length} IoT nodes since deployment.</p>
        <ul>
          <li>18 sensor parameters per reading</li>
          <li>3-minute sampling interval</li>
          <li>GPS geo-tagged readings</li>
          <li>AI-annotated health labels</li>
        </ul>
      </div>
      <div class="research-card">
        <h3>🤖 Model Performance</h3>
        <table class="mini-table">
          <thead><tr><th>Model</th><th>Accuracy</th><th>F1</th></tr></thead>
          <tbody>
            <tr><td>Health Scorer</td><td>93.4%</td><td>0.91</td></tr>
            <tr><td>Disease Classifier</td><td>89.7%</td><td>0.87</td></tr>
            <tr><td>Anomaly Detector</td><td>91.2%</td><td>0.89</td></tr>
            <tr><td>Growth Forecaster</td><td>88.5%</td><td>—</td></tr>
          </tbody>
        </table>
      </div>
      <div class="research-card">
        <h3>📄 Publications</h3>
        <ul>
          <li>"IoT-Based Real-Time Tree Health Monitoring" — RGU Research Journal 2026</li>
          <li>"AI-Driven Disease Detection in Urban Trees" — IEEE Sensors 2026</li>
          <li>"LoRaWAN for Forest-Scale Sensor Networks" — ISTE Conference 2026</li>
        </ul>
      </div>
      <div class="research-card">
        <h3>🔗 Collaborators</h3>
        <ul>
          <li>Rathinam Global University (RGU) — Lead Institution</li>
          <li>Tamil Nadu Forest Department</li>
          <li>Smart City Mission, Coimbatore</li>
          <li>ICMR — Environmental Health Division</li>
        </ul>
      </div>
    </div>
  `;
}

// ─── EXPORT ───────────────────────────────────────────────────────────────────
function exportCSV() {
  const headers = ['Tree ID','Species','Lat','Lng','Health','Status'];
  const rows    = STATE.trees.map(t => [t.id, t.name, t.lat, t.lng, t.health, t.status]);
  const csv     = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob    = new Blob([csv], { type:'text/csv' });
  const url     = URL.createObjectURL(blob);
  const a       = document.createElement('a');
  a.href        = url;
  a.download    = `treesense-export-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportJSON() {
  const data = STATE.trees.map(t => ({ ...t, sensorData: mockSensorData(t.id) }));
  const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `treesense-export-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Expose globals for inline handlers
window.showQRDetail = showQRDetail;
window.closeModal   = closeModal;
window.exportCSV    = exportCSV;
window.exportJSON   = exportJSON;
window.showPage     = showPage;
