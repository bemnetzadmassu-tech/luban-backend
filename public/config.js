(function() {
    const DEFAULT_API_BASE = 'https://luban-backend.vercel.app/api';
    const stored = localStorage.getItem('luban_api_base');
    window.LUBAN_CONFIG = {
        API_BASE: stored || DEFAULT_API_BASE
    };
    console.log(`🌐 API Base: ${window.LUBAN_CONFIG.API_BASE}`);
})();