const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false,   // ← Change this
    max: 10,
});

module.exports = pool;