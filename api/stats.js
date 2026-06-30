const pool = require('./_lib/db');

module.exports = async (req, res) => {
    try {
        const total = await pool.query('SELECT COUNT(*) FROM serialized_barcodes');
        const sold = await pool.query("SELECT COUNT(*) FROM serialized_barcodes WHERE is_sold = TRUE");
        const origins = await pool.query(
            `SELECT origin, COUNT(*) as count FROM serialized_barcodes WHERE origin IS NOT NULL GROUP BY origin`
        );
        res.json({
            success: true,
            stats: {
                total: parseInt(total.rows[0].count),
                sold: parseInt(sold.rows[0].count),
                origins: origins.rows
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
};
