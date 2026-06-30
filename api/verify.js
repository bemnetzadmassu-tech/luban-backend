const pool = require('./_lib/db');

module.exports = async (req, res) => {
    const { barcode } = req.params;
    if (!barcode) return res.status(400).json({ error: 'Barcode required' });

    try {
        const result = await pool.query(
            `SELECT barcode_value, origin, batch_info, weight_grams, roast_level,
                    is_sold, is_revoked, verification_count, created_at
             FROM serialized_barcodes WHERE barcode_value = $1`,
            [barcode]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ valid: false, message: 'Barcode not found' });
        }
        const row = result.rows[0];
        if (row.is_revoked) {
            return res.json({ valid: false, message: 'This product has been revoked' });
        }
        await pool.query(
            `UPDATE serialized_barcodes
             SET verification_count = verification_count + 1, last_verified = CURRENT_TIMESTAMP
             WHERE barcode_value = $1`,
            [barcode]
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
                verified_count: row.verification_count + 1
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
};
