const pool = require('./_lib/db');
const auth = require('./_lib/auth');

module.exports = async (req, res) => {
    await auth(req, res, async () => {
        const { limit = 100, offset = 0 } = req.query;
        try {
            const result = await pool.query(
                `SELECT barcode_value, origin, batch_info, is_sold, created_at
                 FROM serialized_barcodes
                 ORDER BY barcode_value
                 LIMIT $1 OFFSET $2`,
                [limit, offset]
            );
            const count = await pool.query('SELECT COUNT(*) FROM serialized_barcodes');
            res.json({
                success: true,
                data: result.rows,
                total: parseInt(count.rows[0].count)
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Database error' });
        }
    });
};
