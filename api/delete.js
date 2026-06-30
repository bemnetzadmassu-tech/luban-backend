const pool = require('./_lib/db');
const auth = require('./_lib/auth');
const Joi = require('joi');

// Delete a single barcode
module.exports = async (req, res) => {
    await auth(req, res, async () => {
        const { barcode } = req.params;
        if (!barcode) return res.status(400).json({ error: 'Barcode required' });

        try {
            const result = await pool.query(
                'DELETE FROM serialized_barcodes WHERE barcode_value = $1 RETURNING barcode_value',
                [barcode]
            );
            if (result.rowCount === 0) {
                return res.status(404).json({ success: false, message: 'Barcode not found' });
            }
            res.json({ success: true, message: `Deleted ${barcode}` });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Database error' });
        }
    });
};

// Delete all barcodes (with confirmation)
module.exports.deleteAll = async (req, res) => {
    await auth(req, res, async () => {
        try {
            const result = await pool.query('DELETE FROM serialized_barcodes RETURNING barcode_value');
            res.json({ success: true, count: result.rowCount, message: `Deleted ${result.rowCount} barcodes` });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Database error' });
        }
    });
};