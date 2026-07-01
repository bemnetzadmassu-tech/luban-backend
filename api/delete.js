const pool = require('./_lib/db');
const auth = require('./_lib/auth');

// Delete single barcode
module.exports = async (req, res) => {
    await auth(req, res, async () => {
        const { barcode } = req.params;
        if (!barcode) return res.status(400).json({ error: 'Barcode required' });

        try {
            // Get barcode data before deletion (for audit)
            const barcodeData = await pool.query(
                'SELECT * FROM serialized_barcodes WHERE barcode_value = $1',
                [barcode]
            );

            const result = await pool.query(
                'DELETE FROM serialized_barcodes WHERE barcode_value = $1 RETURNING barcode_value',
                [barcode]
            );
            if (result.rowCount === 0) {
                return res.status(404).json({ success: false, message: 'Barcode not found' });
            }

            // Log user activity
            const userId = req.user?.admin ? 'admin' : 'unknown';
            await pool.query(
                `INSERT INTO user_activity (user_id, action, barcode_value, details)
                 VALUES ($1, 'delete', $2, $3)`,
                [userId, barcode, JSON.stringify(barcodeData.rows[0] || {})]
            );

            res.json({ success: true, message: `Deleted ${barcode}` });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Database error' });
        }
    });
};

// Delete all barcodes
module.exports.deleteAll = async (req, res) => {
    await auth(req, res, async () => {
        try {
            const result = await pool.query('DELETE FROM serialized_barcodes RETURNING barcode_value');
            
            const userId = req.user?.admin ? 'admin' : 'unknown';
            await pool.query(
                `INSERT INTO user_activity (user_id, action, details)
                 VALUES ($1, 'delete_all', $2)`,
                [userId, JSON.stringify({ count: result.rowCount })]
            );

            res.json({ success: true, count: result.rowCount, message: `Deleted ${result.rowCount} barcodes` });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Database error' });
        }
    });
};