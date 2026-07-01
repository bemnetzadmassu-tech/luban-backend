const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
});

const createTables = `
-- 1. Barcode Media (images)
CREATE TABLE IF NOT EXISTS barcode_media (
    id SERIAL PRIMARY KEY,
    barcode_value TEXT NOT NULL REFERENCES serialized_barcodes(barcode_value) ON DELETE CASCADE,
    media_type TEXT CHECK (media_type IN ('png', 'qr', 'svg', 'pdf')),
    image_data TEXT,
    file_size INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_barcode_media_value ON barcode_media(barcode_value);
CREATE INDEX IF NOT EXISTS idx_barcode_media_type ON barcode_media(media_type);

-- 2. Scan History
CREATE TABLE IF NOT EXISTS scan_history (
    id SERIAL PRIMARY KEY,
    barcode_value TEXT NOT NULL REFERENCES serialized_barcodes(barcode_value) ON DELETE CASCADE,
    scan_type TEXT CHECK (scan_type IN ('qr', 'barcode', 'manual', 'api')),
    ip_address TEXT,
    user_agent TEXT,
    location_city TEXT,
    location_country TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scan_history_barcode ON scan_history(barcode_value);
CREATE INDEX IF NOT EXISTS idx_scan_history_date ON scan_history(scanned_at);

-- 3. Batch Metadata
CREATE TABLE IF NOT EXISTS batch_metadata (
    id SERIAL PRIMARY KEY,
    batch_id TEXT UNIQUE NOT NULL,
    barcode_prefix TEXT,
    barcode_start INTEGER,
    barcode_end INTEGER,
    total_count INTEGER,
    origin TEXT,
    farm_name TEXT,
    farmer_name TEXT,
    plot_name TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    harvest_date DATE,
    processing_method TEXT,
    certificates TEXT[],
    region TEXT,
    altitude INTEGER,
    created_by TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_batch_metadata_id ON batch_metadata(batch_id);

-- 4. User Activity
CREATE TABLE IF NOT EXISTS user_activity (
    id SERIAL PRIMARY KEY,
    user_id TEXT,
    action TEXT,
    barcode_value TEXT,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_activity_user ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_date ON user_activity(created_at);

-- 5. Customer Feedback
CREATE TABLE IF NOT EXISTS customer_feedback (
    id SERIAL PRIMARY KEY,
    barcode_value TEXT NOT NULL REFERENCES serialized_barcodes(barcode_value) ON DELETE CASCADE,
    customer_name TEXT,
    customer_email TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customer_feedback_barcode ON customer_feedback(barcode_value);

-- 6. Product Prices
CREATE TABLE IF NOT EXISTS product_prices (
    id SERIAL PRIMARY KEY,
    barcode_value TEXT NOT NULL REFERENCES serialized_barcodes(barcode_value) ON DELETE CASCADE,
    price DECIMAL(10,2),
    currency TEXT DEFAULT 'USD',
    effective_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    effective_to TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_prices_barcode ON product_prices(barcode_value);
`;

(async () => {
    try {
        await pool.query(createTables);
        console.log('✅ All new tables created successfully');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
})();