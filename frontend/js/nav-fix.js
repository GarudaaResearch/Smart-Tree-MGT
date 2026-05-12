/**
 * TreeSense AI — Navigation Fix (standalone, overrides dashboard.js nav)
 * Handles all panel switching cleanly.
 */
(function () {
  'use strict';

  function switchPanel(panelId) {
    // Hide all panels
    document.querySelectorAll('.panel').forEach(function (p) {
      p.classList.remove('active');
      p.style.display = 'none';
    });

    // Show target panel
    var target = document.getElementById('panel-' + panelId);
    if (target) {
      target.classList.add('active');
      target.style.display = 'block';
    }

    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(function (n) {
      n.classList.remove('active');
    });
    var navItem = document.querySelector('.nav-item[data-panel="' + panelId + '"]');
    if (navItem) navItem.classList.add('active');

    // Update topbar title
    var titles = {
      dashboard: 'Dashboard Overview',
      map:       'GIS Map View',
      sensors:   'Live Sensors',
      trees:     'Tree Registry',
      ai:        'AI Insights',
      alerts:    'Alert Management',
      analytics: 'Analytics',
      carbon:    'Carbon Tracker',
      qr:        'QR Identity',
      research:  'Research & Export'
    };
    var titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = titles[panelId] || panelId;

    // Run panel-specific initialiser if available
    if (window.TREESENSE && typeof window.TREESENSE[panelId] === 'function') {
      try { window.TREESENSE[panelId](); } catch (e) { console.warn('Panel init error:', e); }
    }
  }

  function initNav() {
    document.querySelectorAll('.nav-item[data-panel]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        switchPanel(btn.getAttribute('data-panel'));
      });
    });

    // Also fix "View All" links
    document.querySelectorAll('[data-panel]').forEach(function (el) {
      if (!el.classList.contains('nav-item')) {
        el.addEventListener('click', function (e) {
          e.preventDefault();
          switchPanel(el.getAttribute('data-panel'));
          // Sync nav highlight
          var target = document.querySelector('.nav-item[data-panel="' + el.getAttribute('data-panel') + '"]');
          if (target) target.click();
        });
      }
    });

    // Show dashboard by default
    switchPanel('dashboard');
  }

  // Panel content initialisers (simple, self-contained)
  window.TREESENSE = {
    map: function () {
      if (!window.L) return;
      var el = document.getElementById('leafletMap');
      if (!el) return;
      if (el._leaflet_id) return; // already initialised
      var map = L.map('leafletMap').setView([11.0168, 76.9558], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap | TreeSense AI'
      }).addTo(map);
      var trees = [
        { lat:11.0168, lng:76.9558, name:'Banyan Tree',      health:87, status:'Healthy',  color:'#107C10' },
        { lat:11.0182, lng:76.9571, name:'Teak Tree',        health:62, status:'Moderate', color:'#CA5010' },
        { lat:11.0155, lng:76.9545, name:'Mango Tree',       health:45, status:'Stressed', color:'#CA5010' },
        { lat:11.0175, lng:76.9532, name:'Neem Tree',        health:91, status:'Healthy',  color:'#107C10' },
        { lat:11.0161, lng:76.9580, name:'Royal Poinciana',  health:28, status:'Critical', color:'#D13438' },
      ];
      trees.forEach(function (t) {
        var icon = L.divIcon({
          className: '',
          html: '<div style="width:34px;height:34px;border-radius:50%;background:' + t.color +
                ';border:3px solid #fff;display:flex;align-items:center;justify-content:center;' +
                'font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.25)">🌳</div>',
          iconSize: [34, 34], iconAnchor: [17, 17]
        });
        L.marker([t.lat, t.lng], { icon: icon }).addTo(map)
          .bindPopup('<b>' + t.name + '</b><br>Health: ' + t.health + '/100<br>Status: ' + t.status);
      });
    },

    sensors: function () {
      var grid = document.getElementById('sensorsFullGrid');
      if (!grid || grid.children.length > 0) return;
      var trees = [
        { id:'RGU-TBA-0001', name:'Banyan Tree',     health:87, status:'Healthy' },
        { id:'RGU-TBA-0002', name:'Teak Tree',        health:62, status:'Moderate' },
        { id:'RGU-TBA-0003', name:'Mango Tree',       health:45, status:'Stressed' },
        { id:'RGU-TBA-0004', name:'Neem Tree',        health:91, status:'Healthy' },
        { id:'RGU-TBA-0005', name:'Royal Poinciana',  health:28, status:'Critical' },
      ];
      grid.innerHTML = trees.map(function (t) {
        var bc = t.health >= 75 ? 'badge-green' : t.health >= 50 ? 'badge-amber' : t.health >= 30 ? 'badge-orange' : 'badge-red';
        return '<div class="card" style="padding:14px">' +
          '<div style="font-weight:700;margin-bottom:6px">🌳 ' + t.name + '</div>' +
          '<div style="font-size:11px;color:var(--text3);margin-bottom:8px">' + t.id + '</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px">' +
            '<div>🌡 <b>' + (25 + Math.random() * 10).toFixed(1) + '°C</b></div>' +
            '<div>💧 <b>' + (50 + Math.random() * 30).toFixed(1) + '%</b></div>' +
            '<div>🌱 <b>' + (30 + Math.random() * 40).toFixed(1) + '%</b></div>' +
            '<div>🧪 pH <b>' + (5.5 + Math.random() * 2).toFixed(2) + '</b></div>' +
            '<div>💨 <b>' + (380 + Math.random() * 120).toFixed(0) + ' ppm</b></div>' +
            '<div>☀️ <b>' + (1000 + Math.random() * 9000).toFixed(0) + ' lx</b></div>' +
          '</div>' +
          '<div style="margin-top:8px"><span class="badge ' + bc + '">' + t.status + ' — ' + t.health + '/100</span></div>' +
          '</div>';
      }).join('');
    },

    trees: function () {
      var tbody = document.getElementById('treeTableBody');
      if (!tbody || tbody.children.length > 0) return;
      var trees = [
        { id:'RGU-TBA-0001', common:'Banyan Tree',    name:'Ficus benghalensis',  lat:11.0168, lng:76.9558, health:87, status:'Healthy' },
        { id:'RGU-TBA-0002', common:'Teak Tree',       name:'Tectona grandis',     lat:11.0182, lng:76.9571, health:62, status:'Moderate' },
        { id:'RGU-TBA-0003', common:'Mango Tree',      name:'Mangifera indica',    lat:11.0155, lng:76.9545, health:45, status:'Stressed' },
        { id:'RGU-TBA-0004', common:'Neem Tree',       name:'Azadirachta indica',  lat:11.0175, lng:76.9532, health:91, status:'Healthy' },
        { id:'RGU-TBA-0005', common:'Royal Poinciana', name:'Delonix regia',       lat:11.0161, lng:76.9580, health:28, status:'Critical' },
      ];
      tbody.innerHTML = trees.map(function (t) {
        var bc = t.health >= 75 ? 'badge-green' : t.health >= 50 ? 'badge-amber' : t.health >= 30 ? 'badge-orange' : 'badge-red';
        return '<tr>' +
          '<td><b>' + t.id + '</b></td>' +
          '<td>' + t.common + '</td>' +
          '<td><em>' + t.name + '</em></td>' +
          '<td>' + t.lat.toFixed(4) + ', ' + t.lng.toFixed(4) + '</td>' +
          '<td>~20 yrs</td>' +
          '<td>' + t.health + '/100</td>' +
          '<td><span class="badge ' + bc + '">' + t.status + '</span></td>' +
          '<td><button class="btn-secondary" style="padding:4px 8px;font-size:11px">View</button></td>' +
          '</tr>';
      }).join('');
    },

    ai: function () {
      var riskList = document.getElementById('diseaseRiskList');
      if (riskList && riskList.children.length === 0) {
        var trees = [
          { name:'Banyan Tree', health:87 }, { name:'Teak Tree', health:62 },
          { name:'Mango Tree', health:45 }, { name:'Neem Tree', health:91 },
          { name:'Royal Poinciana', health:28 }
        ];
        riskList.innerHTML = trees.map(function (t) {
          var risk = t.health >= 75 ? '<span style="color:#107C10">Low (8%)</span>' :
                     t.health >= 50 ? '<span style="color:#CA5010">Moderate (34%)</span>' :
                     t.health >= 30 ? '<span style="color:#CA5010">High (61%)</span>' :
                     '<span style="color:#D13438">Critical (87%)</span>';
          var bc = t.health >= 75 ? 'badge-green' : t.health >= 50 ? 'badge-amber' : 'badge-red';
          return '<div class="risk-item"><span>🌳 ' + t.name + '</span>' + risk +
                 '<span class="badge ' + bc + '">' + t.health + '/100</span></div>';
        }).join('');
      }
      var recList = document.getElementById('recommendationsList');
      if (recList && recList.children.length === 0) {
        var recs = [
          { name:'Banyan Tree', rec:'Continue regular monitoring. Schedule quarterly soil tests.' },
          { name:'Teak Tree', rec:'Increase irrigation frequency. Check for pest activity.' },
          { name:'Mango Tree', rec:'Apply fertilizer. Inspect root zone for infection.' },
          { name:'Neem Tree', rec:'Optimal. Maintain current schedule.' },
          { name:'Royal Poinciana', rec:'URGENT: Arborist consultation required immediately.' },
        ];
        recList.innerHTML = recs.map(function (r) {
          return '<div class="rec-item"><span>🌳</span><div><b>' + r.name + '</b> — ' + r.rec + '</div></div>';
        }).join('');
      }
    },

    alerts: function () {
      var container = document.getElementById('alertsContainer');
      if (!container) return;
      var items = [
        { type:'critical', msg:'Critical health score 28/100 — Royal Poinciana requires emergency intervention.' },
        { type:'warning',  msg:'Low soil moisture 18% — Mango Tree needs irrigation.' },
        { type:'critical', msg:'Disease risk 76% detected — Royal Poinciana (fungal infection suspected).' },
        { type:'warning',  msg:'Battery 14% on Teak Node — recharge required.' },
      ];
      container.innerHTML = items.map(function (a) {
        return '<div class="alert-item alert-' + a.type + '">' +
          '<span>' + (a.type === 'critical' ? '🔴' : '🟡') + '</span>' +
          '<div class="alert-body"><p class="alert-msg">' + a.msg + '</p>' +
          '<p class="alert-time">' + new Date().toLocaleString() + '</p></div></div>';
      }).join('');
    },

    carbon: function () {
      if (!window.Chart) return;
      var cCtx = document.getElementById('carbonChart');
      if (cCtx && !cCtx._chartInstance) {
        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        cCtx._chartInstance = new Chart(cCtx, {
          type: 'bar',
          data: { labels: months, datasets: [{
            label: 'CO₂ Sequestered (kg)',
            data: months.map(function () { return 1200 + Math.random() * 600; }),
            backgroundColor: 'rgba(16,124,16,0.7)', borderRadius: 4
          }]},
          options: { responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#616161' } } },
            scales: { x: { ticks: { color: '#9e9e9e' } }, y: { ticks: { color: '#9e9e9e' } } }
          }
        });
      }
    },

    qr: function () {
      var container = document.getElementById('qrCardDisplay');
      if (!container) return;
      var sel = document.getElementById('qrTreeSelect');
      var treeId = sel ? sel.value : 'TBA-RGU-0001';
      var trees = {
        'TBA-RGU-0001': { common:'Banyan Tree', name:'Ficus benghalensis', health:87, status:'Healthy' },
        'TBA-RGU-0002': { common:'Teak Tree',   name:'Tectona grandis',    health:62, status:'Moderate' },
        'TBA-RGU-0003': { common:'Mango Tree',  name:'Mangifera indica',   health:45, status:'Stressed' },
        'TBA-RGU-0004': { common:'Neem Tree',   name:'Azadirachta indica', health:91, status:'Healthy' },
        'TBA-RGU-0005': { common:'Royal Poinciana', name:'Delonix regia',  health:28, status:'Critical' },
      };
      var t = trees[treeId] || trees['TBA-RGU-0001'];
      container.innerHTML = '<div style="text-align:center;padding:16px">' +
        '<div style="font-size:48px;margin-bottom:12px">📱</div>' +
        '<div id="qrCodeBox" style="margin:0 auto 12px;width:150px;height:150px;border:2px dashed var(--accent);' +
        'display:flex;align-items:center;justify-content:center;border-radius:8px;font-size:12px;color:var(--text3)">' +
        'QR: ' + treeId + '</div>' +
        '<h3 style="font-size:16px">' + t.common + '</h3>' +
        '<p style="font-size:12px;color:var(--text3);margin:4px 0"><em>' + t.name + '</em></p>' +
        '<p style="font-size:12px;margin:4px 0"><b>' + treeId + '</b></p>' +
        '</div>';
      if (window.QRCode) {
        var box = document.getElementById('qrCodeBox');
        if (box) { box.innerHTML = ''; new QRCode(box, { text: window.location.origin + '/?tree=' + treeId, width:140, height:140 }); }
      }
      var details = document.getElementById('qrDetails');
      if (details) {
        details.innerHTML = '<table style="width:100%;font-size:13px;border-collapse:collapse">' +
          ['Tree ID:' + treeId, 'Species:' + t.name, 'Common:' + t.common,
           'Health:' + t.health + '/100', 'Status:' + t.status].map(function (row) {
            var parts = row.split(':');
            return '<tr><td style="padding:6px 0;color:var(--text3);width:40%">' + parts[0] +
                   '</td><td style="padding:6px 0;font-weight:500">' + parts.slice(1).join(':') + '</td></tr>';
          }).join('') + '</table>';
      }
      if (sel) sel.onchange = function () { window.TREESENSE.qr(); };
    },

    research: function () {
      var exportBtn = document.getElementById('exportBtn');
      if (exportBtn && !exportBtn._bound) {
        exportBtn._bound = true;
        exportBtn.addEventListener('click', function () {
          alert('Export functionality — connect to the FastAPI backend for live data export.');
        });
      }
    }
  };

  // Bootstrap when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNav);
  } else {
    initNav();
  }
})();
