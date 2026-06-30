const pool = require('./_lib/db');
const auth = require('./_lib/auth');
const Joi = require('joi');

const schema = Joi.object({
    barcode: Joi.string().required(),
    price: Joi.number().positive().allow(null),
});

module.exports = async (req, res) => {
    await auth(req, res, async () => {
        const { error, value } = schema.validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });

        const { barcode, price } = value;
        try {
            const result = await pool.query(
                `UPDATE serialized_barcodes
                 SET is_sold = TRUE, sold_at = CURRENT_TIMESTAMP, sold_price = $1
                 WHERE barcode_value = $2 AND is_sold = FALSE`,
                [price || null, barcode]
            );
            if (result.rowCount === 0) {
                return res.status(404).json({ success: false, message: 'Barcode not found or already sold' });
            }
            res.json({ success: true, message: 'Product marked as sold' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Database error' });
        }
    });
};