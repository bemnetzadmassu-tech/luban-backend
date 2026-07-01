const path = require('path');

// ============================================
// ROOT LANDING PAGE (served as static file)
// ============================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});