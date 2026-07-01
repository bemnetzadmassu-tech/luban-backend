const pool = require('./_lib/db');

module.exports = async (req, res) => {
    const { barcode } = req.params;
    if (!barcode) return res.status(400).json({ error: 'Barcode required' });

    try {
        const result = await pool.query(`
            SELECT 
                barcode_value, 
                origin, 
                batch_info, 
                weight_grams, 
                roast_level,
                is_sold, 
                is_revoked, 
                verification_count, 
                created_at,
                COALESCE(farm_name, '') as farm_name,
                COALESCE(farmer_name, '') as farmer_name,
                COALESCE(plot_name, '') as plot_name,
                COALESCE(latitude, 0) as latitude,
                COALESCE(longitude, 0) as longitude,
                COALESCE(harvest_date, NULL) as harvest_date,
                COALESCE(processing_method, '') as processing_method,
                COALESCE(certificates, '{}') as certificates,
                COALESCE(country, 'Ethiopia') as country,
                COALESCE(region, '') as region,
                COALESCE(altitude, 0) as altitude
            FROM serialized_barcodes 
            WHERE barcode_value = $1
        `, [barcode]);

        if (result.rows.length === 0) {
            return res.status(404).json({ valid: false, message: 'Barcode not found' });
        }
        const row = result.rows[0];
        if (row.is_revoked) {
            return res.json({ valid: false, message: 'This product has been revoked' });
        }

        // Update verification count
        await pool.query(
            `UPDATE serialized_barcodes
             SET verification_count = verification_count + 1, last_verified = CURRENT_TIMESTAMP
             WHERE barcode_value = $1`,
            [barcode]
        );

        // Log scan history
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'] || 'unknown';
        await pool.query(
            `INSERT INTO scan_history (barcode_value, scan_type, ip_address, user_agent)
             VALUES ($1, 'api', $2, $3)`,
            [barcode, ip, userAgent]
        );

        res.json({
            valid: true,
            product: {
                barcode: row.barcode_value,
                origin: row.origin || 'Unknown',
                batch: row.batch_info || 'N/A',
                weight: row.weight_grams,
                roast: row.roast_level,
                is_sold: row.is_sold,
                verified_count: row.verification_count + 1,
                farm_name: row.farm_name || '',
                farmer_name: row.farmer_name || '',
                plot_name: row.plot_name || '',
                latitude: row.latitude || 0,
                longitude: row.longitude || 0,
                harvest_date: row.harvest_date || null,
                processing_method: row.processing_method || '',
                certificates: row.certificates || [],
                country: row.country || 'Ethiopia',
                region: row.region || '',
                altitude: row.altitude || 0
            }
        });
    } catch (err) {
        console.error('Verify error:', err);
        res.status(500).json({ error: 'Database error' });
    }
};