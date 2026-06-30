const pool = require('./_lib/db');
const auth = require('./_lib/auth');
const Joi = require('joi');

const schema = Joi.object({
    prefix: Joi.string().required(),
    start: Joi.number().integer().min(1).required(),
    end: Joi.number().integer().min(1).required(),
    pad: Joi.number().integer().min(1).default(5),
    weight: Joi.number().integer().default(500),
    roast: Joi.string().default('MR'),
});

module.exports = async (req, res) => {
    await auth(req, res, async () => {
        const { error, value } = schema.validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });

        const { prefix, start, end, pad, weight, roast } = value;
        if (start > end) return res.status(400).json({ error: 'Start must be <= End' });

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            let inserted = 0;
            for (let i = start; i <= end; i++) {
                const num = String(i).padStart(pad, '0');
                const barcode = prefix + num;
                await client.query(
                    `INSERT INTO serialized_barcodes (barcode_value, weight_grams, roast_level)
                     VALUES ($1, $2, $3)
                     ON CONFLICT (barcode_value) DO NOTHING`,
                    [barcode, weight, roast]
                );
                inserted++;
            }
            await client.query('COMMIT');
            res.json({ success: true, count: inserted });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error(err);
            res.status(500).json({ error: 'Database error' });
        } finally {
            client.release();
        }
    });
};
