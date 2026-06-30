const API_BASE = '/api';
let token = localStorage.getItem('token');

// ============================================
// ROUTES DEFINITION (must be defined early)
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

// ============================================
// AUTH & NAV
// ============================================
if (!token) {
    const password = prompt('Enter admin password:');
    if (password) {
        fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        })
        .then(r => r.json())
        .then(data => {
            if (data.token) {
                localStorage.setItem('token', data.token);
                token = data.token;
                loadPage('dashboard');
            } else {
                alert('Invalid password');
                location.reload();
            }
        });
    }
} else {
    loadPage('dashboard');
}

function logout() {
    localStorage.removeItem('token');
    token = null;
    location.reload();
}
document.getElementById('logoutBtn').addEventListener('click', logout);

// ============================================
// NAV LINKS
// ============================================
document.querySelectorAll('.nav-links a[data-page]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        loadPage(link.dataset.page);
    });
});

// ============================================
// PNG DOWNLOAD FUNCTION
// ============================================
window.downloadPNG = function(svgId, filename) {
    const svg = document.getElementById(svgId);
    if (!svg) {
        alert('Barcode not found');
        return;
    }
    const clone = svg.cloneNode(true);
    const bbox = svg.getBBox();
    clone.setAttribute('width', bbox.width + 20);
    clone.setAttribute('height', bbox.height + 20);
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', '100%');
    rect.setAttribute('height', '100%');
    rect.setAttribute('fill', 'white');
    clone.insertBefore(rect, clone.firstChild);

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clone);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = function() {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        const link = document.createElement('a');
        link.download = `${filename}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };
    img.src = url;
};

// ============================================
// DELETE FUNCTIONS
// ============================================
window.deleteBarcode = async function(barcode) {
    if (!confirm(`Delete barcode ${barcode}?`)) return;
    try {
        const res = await fetch(`${API_BASE}/barcode/${barcode}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
            alert(`✅ ${data.message}`);
            loadPage('barcodes');
        } else {
            alert('❌ ' + (data.message || 'Delete failed'));
        }
    } catch (err) {
        alert('❌ Error: ' + err.message);
    }
};

window.deleteAllBarcodes = async function() {
    if (!confirm('⚠️ Delete ALL barcodes? This cannot be undone!')) return;
    if (!confirm('Are you sure?')) return;
    try {
        const res = await fetch(`${API_BASE}/barcodes/all`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
            alert(`✅ ${data.message}`);
            loadPage('barcodes');
        } else {
            alert('❌ ' + (data.message || 'Delete failed'));
        }
    } catch (err) {
        alert('❌ Error: ' + err.message);
    }
};

// ============================================
// DASHBOARD
// ============================================
async function loadDashboard() {
    const res = await fetch(`${API_BASE}/stats`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) { logout(); return; }
    const data = await res.json();
    const stats = data.stats;
    document.getElementById('page-dashboard').innerHTML = `
        <div class="page active" id="page-dashboard">
            <h1>Dashboard</h1>
            <div class="grid-2">
                <div class="stat"><div class="number">${stats.total}</div><div class="label">Total Barcodes</div></div>
                <div class="stat"><div class="number">${stats.sold}</div><div class="label">Sold</div></div>
            </div>
            <div class="card">
                <h3>Origin Distribution</h3>
                <ul>${stats.origins.map(o => `<li>${o.origin}: ${o.count}</li>`).join('')}</ul>
            </div>
        </div>
    `;
}

// ============================================
// GENERATE BARCODES
// ============================================
async function loadGenerate() {
    document.getElementById('page-generate').innerHTML = `
        <div class="page active" id="page-generate">
            <h1>📦 Generate Barcodes</h1>
            <div class="card">
                <div class="grid-2">
                    <div class="form-group"><label>Prefix</label><input type="text" id="prefix" value="LBN-500-" /></div>
                    <div class="form-group"><label>Start</label><input type="number" id="startNum" value="1" /></div>
                    <div class="form-group"><label>End</label><input type="number" id="endNum" value="100" /></div>
                    <div class="form-group"><label>Pad Zeros</label><input type="number" id="padZeros" value="5" /></div>
                </div>
                <button class="btn" onclick="generateBarcodes()">🚀 Generate</button>
                <div id="genResult"></div>
                <div id="barcodePreview" class="barcode-grid"></div>
            </div>
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
        document.getElementById('genResult').innerHTML = data.success ? `<div class="alert alert-success">✅ ${data.count} barcodes generated</div>` : `<div class="alert alert-error">❌ ${data.error}</div>`;
        const preview = document.getElementById('barcodePreview');
        preview.innerHTML = '';
        const limit = Math.min(start+9, end);
        for (let i = start; i <= limit; i++) {
            const num = String(i).padStart(pad, '0');
            const barcode = prefix + num;
            const div = document.createElement('div');
            div.className = 'barcode-item';
            div.innerHTML = `
                <svg id="preview-${i}"></svg>
                <div class="code">${barcode}</div>
                <div style="margin-top:8px; display:flex; gap:6px; justify-content:center; flex-wrap:wrap;">
                    <button class="btn btn-secondary" style="padding:4px 12px; font-size:12px;" onclick="downloadPNG('preview-${i}', '${barcode}')">📥 PNG</button>
                    <button class="btn btn-danger" style="padding:4px 12px; font-size:12px; background:#c0392b; color:white;" onclick="deleteBarcode('${barcode}')">🗑️ Delete</button>
                </div>
            `;
            preview.appendChild(div);
            try {
                JsBarcode(`#preview-${i}`, barcode, { format: 'CODE128', width: 2.0, height: 60, displayValue: false, margin: 8 });
            } catch(e) {}
        }
    };
}

// ============================================
// ASSIGN ORIGIN
// ============================================
async function loadAssign() {
    document.getElementById('page-assign').innerHTML = `
        <div class="page active" id="page-assign">
            <h1>📌 Assign Origin</h1>
            <div class="card">
                <div class="grid-2">
                    <div class="form-group"><label>Prefix</label><input type="text" id="assignPrefix" value="LBN-500-" /></div>
                    <div class="form-group"><label>Start</label><input type="number" id="assignStart" value="1" /></div>
                    <div class="form-group"><label>End</label><input type="number" id="assignEnd" value="100" /></div>
                    <div class="form-group"><label>Origin</label>
                        <select id="assignOrigin">
                            <option value="Yirgacheffe">Yirgacheffe</option>
                            <option value="Harar">Harar</option>
                            <option value="Sidama">Sidama</option>
                            <option value="Guji">Guji</option>
                        </select>
                    </div>
                </div>
                <div class="form-group"><label>Batch Info</label><input type="text" id="assignBatch" placeholder="G1 Natural 2025" /></div>
                <button class="btn" onclick="assignOrigin()">✅ Assign</button>
                <div id="assignResult"></div>
            </div>
        </div>
    `;
    window.assignOrigin = async function() {
        const prefix = document.getElementById('assignPrefix').value.trim();
        const start = parseInt(document.getElementById('assignStart').value);
        const end = parseInt(document.getElementById('assignEnd').value);
        const origin = document.getElementById('assignOrigin').value;
        const batchInfo = document.getElementById('assignBatch').value.trim();
        if (!prefix || isNaN(start) || isNaN(end) || start > end) { alert('Invalid range'); return; }
        const res = await fetch(`${API_BASE}/assign-origin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ prefix, start, end, origin, batchInfo })
        });
        const data = await res.json();
        document.getElementById('assignResult').innerHTML = data.success ? `<div class="alert alert-success">✅ ${data.count} barcodes updated to ${data.origin}</div>` : `<div class="alert alert-error">❌ ${data.error}</div>`;
    };
}

// ============================================
// VERIFY BARCODE
// ============================================
async function loadVerify() {
    document.getElementById('page-verify').innerHTML = `
        <div class="page active" id="page-verify">
            <h1>🔍 Verify Barcode</h1>
            <div class="card">
                <div class="form-group"><label>Barcode</label><input type="text" id="verifyInput" placeholder="LBN-500-00001" /></div>
                <button class="btn" onclick="verifyBarcode()">Verify</button>
                <div id="verifyResult"></div>
            </div>
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
            div.innerHTML = `<div class="alert alert-success">✅ AUTHENTIC<br>Origin: ${p.origin}<br>Batch: ${p.batch}<br>Weight: ${p.weight}g<br>Roast: ${p.roast}<br>Verifications: ${p.verified_count}</div>`;
        } else {
            div.innerHTML = `<div class="alert alert-error">❌ ${data.message || 'Invalid barcode'}</div>`;
        }
    };
}

// ============================================
// ALL BARCODES (with Download & Delete)
// ============================================
async function loadBarcodes() {
    const res = await fetch(`${API_BASE}/barcodes?limit=100`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) { logout(); return; }
    const data = await res.json();
    
    let rows = '';
    data.data.forEach((b, index) => {
        const svgId = `list-barcode-${index}`;
        rows += `
            <tr>
                <td>
                    <svg id="${svgId}" style="height:40px;"></svg>
                    <div style="font-size:11px; margin-top:4px;">${b.barcode_value}</div>
                </td>
                <td>${b.origin || '-'}</td>
                <td>${b.batch_info || '-'}</td>
                <td>${b.is_sold ? '✅ Sold' : 'Available'}</td>
                <td>
                    <button class="btn btn-secondary" style="padding:2px 10px; font-size:11px;" onclick="downloadPNG('${svgId}', '${b.barcode_value}')">📥</button>
                    <button class="btn btn-danger" style="padding:2px 10px; font-size:11px; background:#c0392b; color:white;" onclick="deleteBarcode('${b.barcode_value}')">🗑️</button>
                </td>
            </tr>
        `;
    });

    document.getElementById('page-barcodes').innerHTML = `
        <div class="page active" id="page-barcodes">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                <h1>📋 All Barcodes (${data.total})</h1>
                <button class="btn btn-danger" style="background:#c0392b; color:white;" onclick="deleteAllBarcodes()">🗑️ Delete All</button>
            </div>
            <div class="card" style="overflow-x:auto;">
                <table style="width:100%; border-collapse: collapse;">
                    <thead><tr><th>Barcode</th><th>Origin</th><th>Batch</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>${rows || '<tr><td colspan="5">No barcodes found</td></tr>'}</tbody>
                </table>
            </div>
        </div>
    `;

    data.data.forEach((b, index) => {
        const svgId = `list-barcode-${index}`;
        try {
            JsBarcode(`#${svgId}`, b.barcode_value, {
                format: 'CODE128',
                width: 1.5,
                height: 40,
                displayValue: false,
                margin: 4
            });
        } catch(e) {}
    });
}