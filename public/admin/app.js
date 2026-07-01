const API_BASE = window.LUBAN_CONFIG?.API_BASE || '/api';
let token = localStorage.getItem('token');

// ============================================
// AUTH CHECK – Redirect to login if no token
// ============================================
if (!token) {
    window.location.href = '/admin/login.html';
}

// ============================================
// LOGOUT
// ============================================
function logout() {
    localStorage.removeItem('token');
    window.location.href = '/admin/login.html';
}
document.getElementById('logoutBtn').addEventListener('click', logout);

// ============================================
// ROUTES
// ============================================
const routes = {
    dashboard: loadDashboard,
    generate: loadGenerate,
    assign: loadAssign,
    verify: loadVerify,
    barcodes: loadBarcodes
};

// ============================================
// PAGE LOADER
// ============================================
async function loadPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const content = document.getElementById('content');
    content.innerHTML = `<div class="page active" id="page-${page}">Loading...</div>`;
    if (routes[page]) await routes[page]();
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
    document.querySelector(`.nav-links a[data-page="${page}"]`)?.classList.add('active');
}

// Navigation
document.querySelectorAll('.nav-links a[data-page]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        loadPage(link.dataset.page);
    });
});

// ============================================
// DASHBOARD
// ============================================
async function loadDashboard() {
    try {
        const res = await fetch(`${API_BASE}/stats`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) { logout(); return; }
        const data = await res.json();
        const stats = data.stats;
        document.getElementById('page-dashboard').innerHTML = `
            <h1>📊 Dashboard</h1>
            <div class="grid-2">
                <div class="stat"><div class="number">${stats.total}</div><div class="label">Total Barcodes</div></div>
                <div class="stat"><div class="number">${stats.sold}</div><div class="label">Sold</div></div>
            </div>
            <div class="card">
                <h3>Origin Distribution</h3>
                <ul>${stats.origins.map(o => `<li>${o.origin}: ${o.count}</li>`).join('')}</ul>
            </div>
        `;
    } catch (err) {
        console.error('Dashboard error:', err);
        document.getElementById('page-dashboard').innerHTML = `
            <h1>📊 Dashboard</h1>
            <div class="alert alert-error">Error loading dashboard. Please try again.</div>
        `;
    }
}

// ============================================
// GENERATE BARCODES
// ============================================
async function loadGenerate() {
    document.getElementById('page-generate').innerHTML = `
        <div class="card">
            <h1>📦 Generate Barcodes</h1>
            <div class="grid-2">
                <div class="form-group"><label>Prefix</label><input type="text" id="prefix" value="LBN-500-" /></div>
                <div class="form-group"><label>Start</label><input type="number" id="startNum" value="1" /></div>
                <div class="form-group"><label>End</label><input type="number" id="endNum" value="10" /></div>
                <div class="form-group"><label>Pad Zeros</label><input type="number" id="padZeros" value="5" /></div>
            </div>
            <button class="btn" onclick="generateBarcodes()">🚀 Generate</button>
            <div id="genResult"></div>
            <div id="barcodePreview" class="barcode-grid"></div>
        </div>
    `;
    window.generateBarcodes = async function() {
        const prefix = document.getElementById('prefix').value.trim();
        const start = parseInt(document.getElementById('startNum').value);
        const end = parseInt(document.getElementById('endNum').value);
        const pad = parseInt(document.getElementById('padZeros').value);
        if (isNaN(start) || isNaN(end) || start > end) { alert('Invalid range'); return; }
        const res = await fetch(`${API_BASE}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ prefix, start, end, pad })
        });
        const data = await res.json();
        document.getElementById('genResult').innerHTML = data.success ? `<div class="alert alert-success">✅ ${data.count} generated</div>` : `<div class="alert alert-error">❌ ${data.error}</div>`;
    };
}

// ============================================
// ASSIGN ORIGIN (EUDR)
// ============================================
async function loadAssign() {
    document.getElementById('page-assign').innerHTML = `
        <div class="card">
            <h1>📋 Register Batch (EUDR)</h1>
            <div class="grid-2">
                <div class="form-group"><label>Prefix</label><input type="text" id="regPrefix" value="LBN-500-" /></div>
                <div class="form-group"><label>Start</label><input type="number" id="regStart" value="1" /></div>
                <div class="form-group"><label>End</label><input type="number" id="regEnd" value="10" /></div>
                <div class="form-group"><label>Origin</label>
                    <select id="regOrigin">
                        <option value="Yirgacheffe">Yirgacheffe</option>
                        <option value="Harar">Harar</option>
                        <option value="Sidama">Sidama</option>
                        <option value="Guji">Guji</option>
                    </select>
                </div>
            </div>
            <div class="form-group"><label>Batch Info</label><input type="text" id="regBatch" placeholder="G1 Natural 2025" /></div>
            <div class="grid-2">
                <div class="form-group"><label>Farm Name</label><input type="text" id="regFarm" placeholder="e.g., Buku Ababa" /></div>
                <div class="form-group"><label>Farmer Name</label><input type="text" id="regFarmer" placeholder="e.g., Tadese Gebre" /></div>
                <div class="form-group"><label>Plot Name</label><input type="text" id="regPlot" placeholder="e.g., Plot 12A" /></div>
                <div class="form-group"><label>Harvest Date</label><input type="date" id="regHarvest" /></div>
                <div class="form-group"><label>Processing Method</label>
                    <select id="regProcessing">
                        <option value="Washed">Washed</option>
                        <option value="Natural">Natural</option>
                        <option value="Honey">Honey</option>
                    </select>
                </div>
                <div class="form-group"><label>Certificates</label>
                    <select id="regCertificates" multiple style="height:60px;">
                        <option value="Organic">Organic</option>
                        <option value="Rainforest">Rainforest</option>
                        <option value="Fair Trade">Fair Trade</option>
                    </select>
                    <small>Hold Ctrl/Cmd to select multiple</small>
                </div>
            </div>
            <div class="grid-2">
                <div class="form-group"><label>Latitude</label><input type="number" id="regLat" step="0.00000001" placeholder="9.12345678" /></div>
                <div class="form-group"><label>Longitude</label><input type="number" id="regLng" step="0.00000001" placeholder="38.12345678" /></div>
                <div class="form-group"><label>Region</label><input type="text" id="regRegion" placeholder="e.g., Sidama" /></div>
                <div class="form-group"><label>Altitude (m)</label><input type="number" id="regAltitude" placeholder="e.g., 1800" /></div>
            </div>
            <button class="btn" onclick="registerBatch()">📋 Register Batch</button>
            <div id="registerResult"></div>
        </div>
    `;
    window.registerBatch = async function() {
        const prefix = document.getElementById('regPrefix').value.trim();
        const start = parseInt(document.getElementById('regStart').value);
        const end = parseInt(document.getElementById('regEnd').value);
        const origin = document.getElementById('regOrigin').value;
        const batchInfo = document.getElementById('regBatch').value.trim();
        const farmName = document.getElementById('regFarm').value.trim();
        const farmerName = document.getElementById('regFarmer').value.trim();
        const plotName = document.getElementById('regPlot').value.trim();
        const harvestDate = document.getElementById('regHarvest').value;
        const processingMethod = document.getElementById('regProcessing').value;
        const certificates = Array.from(document.getElementById('regCertificates').selectedOptions).map(o => o.value);
        const latitude = parseFloat(document.getElementById('regLat').value);
        const longitude = parseFloat(document.getElementById('regLng').value);
        const region = document.getElementById('regRegion').value.trim();
        const altitude = parseInt(document.getElementById('regAltitude').value);

        if (!prefix || isNaN(start) || isNaN(end) || start > end) { alert('Invalid range'); return; }

        const body = {
            prefix, start, end, origin, batchInfo,
            farmName, farmerName, plotName,
            latitude: isNaN(latitude) ? null : latitude,
            longitude: isNaN(longitude) ? null : longitude,
            harvestDate: harvestDate || null,
            processingMethod,
            certificates,
            country: 'Ethiopia',
            region,
            altitude: isNaN(altitude) ? null : altitude
        };

        try {
            const res = await fetch(`${API_BASE}/register-batch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            document.getElementById('registerResult').innerHTML = data.success ? `<div class="alert alert-success">✅ ${data.message}</div>` : `<div class="alert alert-error">❌ ${data.error}</div>`;
        } catch (err) {
            document.getElementById('registerResult').innerHTML = `<div class="alert alert-error">❌ ${err.message}</div>`;
        }
    };
}

// ============================================
// VERIFY (Admin)
// ============================================
async function loadVerify() {
    document.getElementById('page-verify').innerHTML = `
        <div class="card">
            <h1>🔍 Verify Barcode</h1>
            <div class="form-group"><label>Barcode</label><input type="text" id="verifyInput" placeholder="LBN-500-00001" /></div>
            <button class="btn" onclick="verifyBarcode()">Verify</button>
            <div id="verifyResult"></div>
        </div>
    `;
    window.verifyBarcode = async function() {
        const barcode = document.getElementById('verifyInput').value.trim();
        if (!barcode) { alert('Enter a barcode'); return; }
        const res = await fetch(`${API_BASE}/verify/${barcode}`);
        const data = await res.json();
        const div = document.getElementById('verifyResult');
        if (data.valid) {
            const p = data.product;
            div.innerHTML = `<div class="alert alert-success">✅ AUTHENTIC<br>Origin: ${p.origin}<br>Farm: ${p.farm_name || 'N/A'}<br>GPS: ${p.latitude ? `${p.latitude}, ${p.longitude}` : 'N/A'}</div>`;
        } else {
            div.innerHTML = `<div class="alert alert-error">❌ ${data.message || 'Invalid barcode'}</div>`;
        }
    };
}

// ============================================
// ALL BARCODES
// ============================================
async function loadBarcodes() {
    const res = await fetch(`${API_BASE}/barcodes?limit=100`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) { logout(); return; }
    const data = await res.json();
    let rows = data.data.map(b => `
        <tr>
            <td>${b.barcode_value}</td>
            <td>${b.origin || '-'}</td>
            <td>${b.batch_info || '-'}</td>
            <td>${b.is_sold ? '✅ Sold' : 'Available'}</td>
        </tr>
    `).join('');
    document.getElementById('page-barcodes').innerHTML = `
        <div class="card">
            <h1>📋 All Barcodes (${data.total})</h1>
            <div style="overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse;">
                    <thead><tr><th>Barcode</th><th>Origin</th><th>Batch</th><th>Status</th></tr></thead>
                    <tbody>${rows || '<tr><td colspan="4">No barcodes found</td></tr>'}</tbody>
                </table>
            </div>
            <button class="btn btn-secondary" onclick="downloadPOSFeed()">📊 Supermarket Feed</button>
        </div>
    `;
}

// ============================================
// DOWNLOAD SUPERMARKET FEED
// ============================================
window.downloadPOSFeed = function() {
    window.open(`${API_BASE}/export-pos-feed`, '_blank');
};

// Load dashboard by default
loadPage('dashboard');