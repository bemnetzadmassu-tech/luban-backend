const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false,          // ← CHANGE: disable SSL
    max: 10,
});

module.exports = pool;

module.exports = pool;