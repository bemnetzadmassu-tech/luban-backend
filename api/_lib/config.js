// api/_lib/config.js
const fs = require('fs');
const path = require('path');

function getLubanConfig() {
    try {
        // Read config.js from public folder
        const configPath = path.join(__dirname, '../../public/config.js');
        const configContent = fs.readFileSync(configPath, 'utf8');
        
        // Extract the DEFAULTS object using regex
        const match = configContent.match(/const DEFAULTS = ({[^}]+})/s);
        if (match) {
            // Parse the defaults
            const defaultsStr = match[1]
                .replace(/'/g, '"')
                .replace(/\/\/.*$/gm, '')
                .replace(/\n/g, '');
            const defaults = JSON.parse(defaultsStr);
            return defaults;
        }
    } catch (err) {
        console.warn('Could not load config.js, using fallback:', err.message);
    }
    
    // Fallback values
    return {
        BACKEND_URL: 'https://luban-backend.vercel.app',
        FRONTEND_URL: 'https://luban-coffeee.vercel.app',
        VERIFY_PAGE: '/verify-public.html'
    };
}

module.exports = { getLubanConfig };