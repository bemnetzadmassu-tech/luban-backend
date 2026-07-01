// ============================================
// GET CONFIG
// ============================================
function getConfig() {
    return window.LUBAN_CONFIG || {
        API_BASE: 'https://luban-backend.vercel.app/api',
        BACKEND_URL: 'https://luban-backend.vercel.app',
        FRONTEND_URL: 'https://luban-coffee.vercel.app',
        VERIFY_PAGE: '/verify-public.html'
    };
}

const CONFIG = getConfig();
const API_BASE = CONFIG.API_BASE;
let token = localStorage.getItem('token');

if (!token) {
    window.location.href = '/admin/login.html';
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = '/admin/login.html';
}
document.getElementById('logoutBtn').addEventListener('click', logout);

const routes = {
    dashboard: loadDashboard,
    generate: loadGenerate,
    assign: loadAssign,
    verify: loadVerify,
    barcodes: loadBarcodes
};

async function loadPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const content = document.getElementById('content');
    content.innerHTML = `<div class="page active" id="page-${page}">Loading...</div>`;
    if (routes[page]) await routes[page]();
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
    document.querySelector(`.nav-links a[data-page="${page}"]`)?.classList.add('active');
}

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
                <div class="form-group"><label>End</label><input type="number" id="endNum" value="5" /></div>
                <div class="form-group"><label>Pad Zeros</label><input type="number" id="padZeros" value="5" /></div>
                <div class="form-group"><label>Weight (g)</label><input type="number" id="weight" value="250" /></div>
                <div class="form-group"><label>Roast Level</label>
                    <select id="roast">
                        <option value="LR">Light Roast</option>
                        <option value="MR" selected>Medium Roast</option>
                        <option value="DR">Dark Roast</option>
                    </select>
                </div>
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
        const weight = parseInt(document.getElementById('weight').value);
        const roast = document.getElementById('roast').value;

        if (isNaN(start) || isNaN(end) || start > end) { alert('Invalid range'); return; }

        const res = await fetch(`${API_BASE}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ prefix, start, end, pad, weight, roast })
        });
        const data = await res.json();
        document.getElementById('genResult').innerHTML = data.success ? `<div class="alert alert-success">✅ ${data.count} generated</div>` : `<div class="alert alert-error">❌ ${data.error}</div>`;
        displayBarcodes(prefix, start, end, pad);
    };
}

function displayBarcodes(prefix, start, end, pad) {
    const container = document.getElementById('barcodePreview');
    container.innerHTML = '';
    const limit = Math.min(start + 9, end);
    for (let i = start; i <= limit; i++) {
        const num = String(i).padStart(pad, '0');
        const barcode = prefix + num;
        const svgId = `preview-${i}`;
        const div = document.createElement('div');
        div.className = 'barcode-item';
        div.innerHTML = `
            <svg id="${svgId}"></svg>
            <div class="code">${barcode}</div>
            <div style="margin-top:8px; display:flex; gap:6px; justify-content:center; flex-wrap:wrap;">
                <button class="btn btn-secondary" style="padding:4px 12px; font-size:12px;" onclick="downloadPNG('${svgId}', '${barcode}')">📥 PNG</button>
                <button class="btn btn-secondary" style="padding:4px 12px; font-size:12px;" onclick="downloadQR('${barcode}')">📱 QR</button>
                <button class="btn btn-danger" style="padding:4px 12px; font-size:12px; background:#c0392b; color:white;" onclick="deleteBarcode('${barcode}')">🗑️ Delete</button>
                <button class="btn btn-secondary" style="padding:4px 12px; font-size:12px;" onclick="editBarcode('${barcode}')">✏️ Edit</button>
            </div>
        `;
        container.appendChild(div);
        try {
            JsBarcode(`#${svgId}`, barcode, {
                format: 'CODE128',
                width: 2.0,
                height: 60,
                displayValue: false,
                margin: 8,
                background: '#ffffff',
                lineColor: '#1a3a32'
            });
        } catch(e) {}
    }
}

// ============================================
// DOWNLOAD PNG (dynamic from config)
// ============================================
window.downloadPNG = async function(svgId, barcode) {
    const API_BASE = getConfig().API_BASE;
    try {
        const res = await fetch(`${API_BASE}/image/${barcode}/png`);
        const data = await res.json();
        if (data.success && data.image) {
            const link = document.createElement('a');
            link.href = data.image;
            link.download = `${barcode}.png`;
            link.click();
            return;
        }
        fallbackDownloadPNG(svgId, barcode);
    } catch (err) {
        fallbackDownloadPNG(svgId, barcode);
    }
};

// ============================================
// DOWNLOAD QR – Uses config for all routing
// ============================================
window.downloadQR = async function(barcode) {
    const config = getConfig();
    const API_BASE = config.API_BASE;
    
    try {
        const res = await fetch(`${API_BASE}/image/${barcode}/qr`);
        const data = await res.json();
        if (data.success && data.image) {
            const link = document.createElement('a');
            link.href = data.image;
            link.download = `${barcode}-qr.png`;
            link.click();
            return;
        }
        fallbackDownloadQR(barcode);
    } catch (err) {
        fallbackDownloadQR(barcode);
    }
};
// ============================================
// FALLBACK PNG
// ============================================
function fallbackDownloadPNG(svgId, barcode) {
    const svg = document.getElementById(svgId);
    if (!svg) return;
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
        link.download = `${barcode}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };
    img.src = url;
}

// ============================================
// FALLBACK QR – Uses BACKEND_URL (not frontend)
// ============================================
function fallbackDownloadQR(barcode) {
    const config = getConfig();
    // Use BACKEND_URL, not FRONTEND_URL
    const backendUrl = config.BACKEND_URL || 'https://luban-backend.vercel.app';
    const verifyPage = config.VERIFY_PAGE || '/verify-public.html';
    const url = `${backendUrl}${verifyPage}?barcode=${encodeURIComponent(barcode)}`;
    const qrApi = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
    const link = document.createElement('a');
    link.href = qrApi;
    link.download = `${barcode}-qr.png`;
    link.click();
}
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
// EDIT FUNCTIONS
// ============================================
window.editBarcode = function(barcode) {
    fetch(`${API_BASE}/verify/${barcode}`)
        .then(res => res.json())
        .then(data => {
            if (data.valid) {
                openEditModal(data.product);
            } else {
                alert('Barcode not found');
            }
        })
        .catch(err => alert('Error: ' + err.message));
};

function openEditModal(product) {
    const modal = document.createElement('div');
    modal.id = 'editModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.7); display: flex; justify-content: center;
        align-items: center; z-index: 1000; overflow-y: auto; padding: 20px;
    `;
    modal.innerHTML = `
        <div style="background: white; max-width: 600px; width: 100%; padding: 30px; border-radius: 24px; max-height: 90vh; overflow-y: auto;">
            <h2 style="color: #1a3a32; margin-bottom: 20px;">✏️ Edit Barcode: ${product.barcode}</h2>
            <form id="editForm">
                <div class="grid-2">
                    <div class="form-group"><label>Origin</label><input type="text" id="editOrigin" value="${product.origin || ''}" /></div>
                    <div class="form-group"><label>Batch</label><input type="text" id="editBatch" value="${product.batch || ''}" /></div>
                    <div class="form-group"><label>Farm Name</label><input type="text" id="editFarm" value="${product.farm_name || ''}" /></div>
                    <div class="form-group"><label>Farmer Name</label><input type="text" id="editFarmer" value="${product.farmer_name || ''}" /></div>
                    <div class="form-group"><label>Plot Name</label><input type="text" id="editPlot" value="${product.plot_name || ''}" /></div>
                    <div class="form-group"><label>Harvest Date</label><input type="date" id="editHarvest" value="${product.harvest_date || ''}" /></div>
                    <div class="form-group"><label>Latitude</label><input type="number" id="editLat" step="0.00000001" value="${product.latitude || ''}" /></div>
                    <div class="form-group"><label>Longitude</label><input type="number" id="editLng" step="0.00000001" value="${product.longitude || ''}" /></div>
                </div>
                <div class="form-group"><label>Processing Method</label>
                    <select id="editProcessing">
                        <option value="Washed" ${product.processing_method === 'Washed' ? 'selected' : ''}>Washed</option>
                        <option value="Natural" ${product.processing_method === 'Natural' ? 'selected' : ''}>Natural</option>
                        <option value="Honey" ${product.processing_method === 'Honey' ? 'selected' : ''}>Honey</option>
                    </select>
                </div>
                <div class="form-group"><label>Certificates</label>
                    <select id="editCertificates" multiple style="height:60px;">
                        <option value="Organic" ${product.certificates && product.certificates.includes('Organic') ? 'selected' : ''}>Organic</option>
                        <option value="Rainforest" ${product.certificates && product.certificates.includes('Rainforest') ? 'selected' : ''}>Rainforest</option>
                        <option value="Fair Trade" ${product.certificates && product.certificates.includes('Fair Trade') ? 'selected' : ''}>Fair Trade</option>
                    </select>
                    <small>Hold Ctrl/Cmd to select multiple</small>
                </div>
                <div style="display:flex; gap:12px; margin-top:20px;">
                    <button type="submit" class="btn" style="flex:1;">💾 Save</button>
                    <button type="button" class="btn btn-secondary" onclick="closeEditModal()" style="flex:1;">Cancel</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('editForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveBarcodeEdit(product.barcode);
    });
}

window.closeEditModal = function() {
    const modal = document.getElementById('editModal');
    if (modal) modal.remove();
};

async function saveBarcodeEdit(barcode) {
    const data = {
        barcode,
        origin: document.getElementById('editOrigin').value.trim(),
        batch_info: document.getElementById('editBatch').value.trim(),
        farm_name: document.getElementById('editFarm').value.trim(),
        farmer_name: document.getElementById('editFarmer').value.trim(),
        plot_name: document.getElementById('editPlot').value.trim(),
        harvest_date: document.getElementById('editHarvest').value || null,
        latitude: parseFloat(document.getElementById('editLat').value) || null,
        longitude: parseFloat(document.getElementById('editLng').value) || null,
        processing_method: document.getElementById('editProcessing').value,
        certificates: Array.from(document.getElementById('editCertificates').selectedOptions).map(o => o.value),
    };
    try {
        const res = await fetch(`${API_BASE}/barcode/${barcode}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (result.success) {
            alert('✅ Barcode updated successfully!');
            closeEditModal();
            loadPage('barcodes');
        } else {
            alert('❌ ' + (result.message || 'Update failed'));
        }
    } catch (err) {
        alert('❌ Error: ' + err.message);
    }
}

// ============================================
// REGISTER BATCH (EUDR)
// ============================================
async function loadAssign() {
    document.getElementById('page-assign').innerHTML = `
        <div class="card">
            <h1>📋 Register Batch (EUDR Traceability)</h1>
            <div class="grid-2">
                <div class="form-group"><label>Prefix</label><input type="text" id="regPrefix" value="LBN-500-" /></div>
                <div class="form-group"><label>Start</label><input type="number" id="regStart" value="1" /></div>
                <div class="form-group"><label>End</label><input type="number" id="regEnd" value="5" /></div>
                <div class="form-group"><label>Origin</label>
                    <select id="regOrigin">
                        <option value="Yirgacheffe">Yirgacheffe</option>
                        <option value="Harar">Harar</option>
                        <option value="Sidama">Sidama</option>
                        <option value="Guji">Guji</option>
                    </select>
                </div>
            </div>
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
    let rows = data.data.map((b, index) => `
        <tr>
            <td>
                <svg id="list-${index}" style="height:40px;"></svg>
                <div style="font-size:11px; margin-top:4px;">${b.barcode_value}</div>
            </td>
            <td>${b.origin || '-'}</td>
            <td>${b.batch_info || '-'}</td>
            <td>${b.is_sold ? '✅ Sold' : 'Available'}</td>
            <td>
                <button class="btn btn-secondary" style="padding:2px 10px; font-size:11px;" onclick="editBarcode('${b.barcode_value}')">✏️</button>
                <button class="btn btn-secondary" style="padding:2px 10px; font-size:11px;" onclick="downloadPNG('list-${index}', '${b.barcode_value}')">📥</button>
                <button class="btn btn-secondary" style="padding:2px 10px; font-size:11px;" onclick="downloadQR('${b.barcode_value}')">📱</button>
                <button class="btn btn-danger" style="padding:2px 10px; font-size:11px; background:#c0392b; color:white;" onclick="deleteBarcode('${b.barcode_value}')">🗑️</button>
            </td>
        </tr>
    `).join('');
    document.getElementById('page-barcodes').innerHTML = `
        <div class="card">
            <h1>📋 All Barcodes (${data.total})</h1>
            <div style="overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse;">
                    <thead><tr><th>Barcode</th><th>Origin</th><th>Batch</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>${rows || '<tr><td colspan="5">No barcodes found</td></tr>'}</tbody>
                </table>
            </div>
            <button class="btn btn-secondary" onclick="downloadPOSFeed()">📊 Supermarket Feed</button>
        </div>
    `;
    data.data.forEach((b, index) => {
        const svgId = `list-${index}`;
        setTimeout(() => {
            try {
                JsBarcode(`#${svgId}`, b.barcode_value, {
                    format: 'CODE128',
                    width: 1.5,
                    height: 40,
                    displayValue: false,
                    margin: 4
                });
            } catch(e) {}
        }, 100);
    });
}

// ============================================
// DOWNLOAD SUPERMARKET FEED
// ============================================
window.downloadPOSFeed = function() {
    window.open(`${API_BASE}/export-pos-feed`, '_blank');
};

// ============================================
// LOAD DEFAULT PAGE
// ============================================
loadPage('dashboard');