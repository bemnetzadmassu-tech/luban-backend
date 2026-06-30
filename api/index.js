const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '10mb' }));

// Route handlers
const generateHandler = require('./generate');
const registerBatchHandler = require('./register-batch');
const verifyHandler = require('./verify');
const soldHandler = require('./sold');
const barcodesHandler = require('./barcodes');
const statsHandler = require('./stats');
const exportPosFeedHandler = require('./export-pos-feed');
const deleteHandler = require('./delete');
const deleteAllHandler = require('./delete').deleteAll;

// ============================================
// DEBUG: Check handler types
// ============================================
console.log('🔍 Checking handler types:');
console.log('generateHandler:', typeof generateHandler);
console.log('registerBatchHandler:', typeof registerBatchHandler);
console.log('verifyHandler:', typeof verifyHandler);
console.log('soldHandler:', typeof soldHandler);
console.log('barcodesHandler:', typeof barcodesHandler);
console.log('statsHandler:', typeof statsHandler);
console.log('exportPosFeedHandler:', typeof exportPosFeedHandler);
console.log('deleteHandler:', typeof deleteHandler);
console.log('deleteAllHandler:', typeof deleteAllHandler);
console.log('✅ All handlers loaded');

// ============================================
// AUTH & HEALTH ENDPOINTS
// ============================================
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected) return res.status(500).json({ error: 'Admin password not set' });
    if (password === expected) {
        const token = jwt.sign({ admin: true }, process.env.JWT_SECRET, { expiresIn: '24h' });
        return res.json({ success: true, token });
    }
    res.status(401).json({ error: 'Invalid password' });
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

// ============================================
// API ROUTES
// ============================================
app.post('/api/generate', generateHandler);
app.post('/api/register-batch', registerBatchHandler);
app.get('/api/verify/:barcode', verifyHandler);
app.post('/api/sold', soldHandler);
app.get('/api/barcodes', barcodesHandler);
app.get('/api/stats', statsHandler);
app.get('/api/export-pos-feed', exportPosFeedHandler);
app.delete('/api/barcode/:barcode', deleteHandler);
app.delete('/api/barcodes/all', deleteAllHandler);

module.exports = app;