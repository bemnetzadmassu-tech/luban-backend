// public/config.js
(function() {
    // ============================================
    // DEFAULT VALUES – Change these when moving hosts
    // ============================================
    const DEFAULTS = {
        API_BASE: 'https://luban-backend.vercel.app/api',
        BACKEND_URL: 'https://luban-backend.vercel.app',
        FRONTEND_URL: 'https://luban-coffee.vercel.app',
        APP_NAME: 'Luban Coffee',
        ENVIRONMENT: 'production'
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
        APP_NAME: userConfig.APP_NAME || DEFAULTS.APP_NAME,
        ENVIRONMENT: userConfig.ENVIRONMENT || DEFAULTS.ENVIRONMENT
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