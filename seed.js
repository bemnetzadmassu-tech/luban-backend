const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

const samples = [
    {
        barcode: 'LBN-500-00001',
        origin: 'Yirgacheffe',
        batch_info: 'G1 Natural 2025',
        farm_name: 'Buku Ababa',
        farmer_name: 'Tadese Gebre',
        latitude: 9.12345678,
        longitude: 38.56789012,
        harvest_date: '2025-03-15',
        processing_method: 'Washed',
        certificates: ['Organic', 'Rainforest'],
        region: 'Sidama',
        altitude: 1850,
        weight_grams: 250,
        roast_level: 'LR'
    },
    // add more if needed
];

(async () => {
    try {
        const client = await pool.connect();
        for (const item of samples) {
            await client.query(`
                INSERT INTO serialized_barcodes (
                    barcode_value, origin, batch_info, farm_name, farmer_name,
                    latitude, longitude, harvest_date, processing_method,
                    certificates, region, altitude, weight_grams, roast_level
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                ON CONFLICT (barcode_value) DO NOTHING
            `, [
                item.barcode, item.origin, item.batch_info, item.farm_name, item.farmer_name,
                item.latitude, item.longitude, item.harvest_date, item.processing_method,
                item.certificates, item.region, item.altitude, item.weight_grams, item.roast_level
            ]);
        }
        client.release();
        console.log('✅ Sample data inserted');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err.message);
        process.exit(1);
    }
})();