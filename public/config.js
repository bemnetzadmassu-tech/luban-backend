// public/config.js
(function() {
    // ============================================
    // DEFAULT VALUES – Change these when moving hosts
    // ============================================
    const DEFAULTS = {
        API_BASE: 'https://luban-backend.vercel.app/api',
        BACKEND_URL: 'https://luban-backend.vercel.app',
        FRONTEND_URL: 'https://luban-coffeee.vercel.app',
        VERIFY_PAGE: '/verify-public.html',
        SCAN_PAGE: '/scan.html',
        LANDING_PAGE: '/',
        ADMIN_LOGIN: '/admin/login.html',
        ADMIN_DASHBOARD: '/admin/dashboard.html'
    };

    // ============================================
    // LOAD FROM localStorage (overrides defaults)
    // ============================================
    const stored = localStorage.getItem('luban_config');
    let userConfig = {};

    if (stored) {
        try {
            userConfig = JSON.parse(stored);
        } catch (e) {
            console.warn('Invalid config in localStorage, using defaults');
        }
    }

    // ============================================
    // BUILD FINAL CONFIG
    // ============================================
    window.LUBAN_CONFIG = {
        API_BASE: userConfig.API_BASE || DEFAULTS.API_BASE,
        BACKEND_URL: userConfig.BACKEND_URL || DEFAULTS.BACKEND_URL,
        FRONTEND_URL: userConfig.FRONTEND_URL || DEFAULTS.FRONTEND_URL,
        VERIFY_PAGE: userConfig.VERIFY_PAGE || DEFAULTS.VERIFY_PAGE,
        SCAN_PAGE: userConfig.SCAN_PAGE || DEFAULTS.SCAN_PAGE,
        LANDING_PAGE: userConfig.LANDING_PAGE || DEFAULTS.LANDING_PAGE,
        ADMIN_LOGIN: userConfig.ADMIN_LOGIN || DEFAULTS.ADMIN_LOGIN,
        ADMIN_DASHBOARD: userConfig.ADMIN_DASHBOARD || DEFAULTS.ADMIN_DASHBOARD
    };

    console.log('🌐 Luban Config:', window.LUBAN_CONFIG);
})();

// ============================================
// HELPER: Save new config to localStorage
// ============================================
window.saveLubanConfig = function(newConfig) {
    const current = window.LUBAN_CONFIG || {};
    const updated = { ...current, ...newConfig };
    localStorage.setItem('luban_config', JSON.stringify(updated));
    window.LUBAN_CONFIG = updated;
    console.log('✅ Config updated:', updated);
    return updated;
};

// ============================================
// HELPER: Reset config to defaults
// ============================================
window.resetLubanConfig = function() {
    localStorage.removeItem('luban_config');
    window.location.reload();
};

// ============================================
// HELPER: Get full URL for a page
// ============================================
window.getPageUrl = function(pageKey) {
    const config = window.LUBAN_CONFIG || {};
    const baseUrl = config.FRONTEND_URL || 'https://luban-coffeee.vercel.app';
    const pageMap = {
        home: config.LANDING_PAGE || '/',
        verify: config.VERIFY_PAGE || '/verify-public.html',
        scan: config.SCAN_PAGE || '/scan.html',
        adminLogin: config.ADMIN_LOGIN || '/admin/login.html',
        adminDashboard: config.ADMIN_DASHBOARD || '/admin/dashboard.html'
    };
    return baseUrl + (pageMap[pageKey] || '/');
};

// ============================================
// HELPER: Get QR URL for a barcode
// ============================================
window.getQRUrl = function(barcode) {
    const config = window.LUBAN_CONFIG || {};
    const baseUrl = config.BACKEND_URL || 'https://luban-backend.vercel.app';
    const verifyPage = config.VERIFY_PAGE || '/verify-public.html';
    return `${baseUrl}${verifyPage}?barcode=${encodeURIComponent(barcode)}`;
};