const pool = require('./_lib/db');

module.exports = async (req, res) => {
    const { barcode, type } = req.params;
    if (!barcode || !type) {
        return res.status(400).json({ error: 'Barcode and type required' });
    }

    try {
        const result = await pool.query(
            'SELECT image_data FROM barcode_media WHERE barcode_value = $1 AND media_type = $2',
            [barcode, type]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Image not found' });
        }

        res.json({
            success: true,
            image: result.rows[0].image_data
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
};