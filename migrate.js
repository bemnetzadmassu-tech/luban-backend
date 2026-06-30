const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

const createTable = `
CREATE TABLE IF NOT EXISTS serialized_barcodes (
    id SERIAL PRIMARY KEY,
    barcode_value TEXT UNIQUE NOT NULL,
    origin TEXT,
    batch_info TEXT,
    weight_grams INTEGER DEFAULT 500,
    roast_level TEXT DEFAULT 'MR',
    is_activated BOOLEAN DEFAULT FALSE,
    is_sold BOOLEAN DEFAULT FALSE,
    is_revoked BOOLEAN DEFAULT FALSE,
    verification_count INTEGER DEFAULT 0,
    last_verified TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sold_at TIMESTAMP,
    sold_price DECIMAL(10,2),
    farm_name TEXT,
    farmer_name TEXT,
    plot_name TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    harvest_date DATE,
    processing_method TEXT,
    certificates TEXT[],
    country TEXT DEFAULT 'Ethiopia',
    region TEXT,
    altitude INTEGER
);

CREATE INDEX IF NOT EXISTS idx_barcode_value ON serialized_barcodes(barcode_value);
CREATE INDEX IF NOT EXISTS idx_origin ON serialized_barcodes(origin);
CREATE INDEX IF NOT EXISTS idx_farm_name ON serialized_barcodes(farm_name);
CREATE INDEX IF NOT EXISTS idx_harvest_date ON serialized_barcodes(harvest_date);
`;

(async () => {
    try {
        await pool.query(createTable);
        console.log('✅ Table created successfully');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
})();