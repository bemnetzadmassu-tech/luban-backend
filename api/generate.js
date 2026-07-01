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

// Helper: Generate PNG from external API (no canvas needed)
async function generateBarcodePNG(barcode) {
    const apiUrl = `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(barcode)}&code=Code128&dpi=120`;
    const response = await fetch(apiUrl);
    const buffer = await response.arrayBuffer();
    return `data:image/png;base64,${Buffer.from(buffer).toString('base64')}`;
}

// Helper: Generate QR code PNG
async function generateQRPNG(barcode) {
    const baseUrl = process.env.FRONTEND_URL || 'https://luban-coffee.vercel.app';
    const url = `${baseUrl}/verify-public.html?barcode=${encodeURIComponent(barcode)}`;
    const qrApi = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
    const response = await fetch(qrApi);
    const buffer = await response.arrayBuffer();
    return `data:image/png;base64,${Buffer.from(buffer).toString('base64')}`;
}

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

                // Insert into serialized_barcodes
                await client.query(
                    `INSERT INTO serialized_barcodes (barcode_value, weight_grams, roast_level)
                     VALUES ($1, $2, $3)
                     ON CONFLICT (barcode_value) DO NOTHING`,
                    [barcode, weight, roast]
                );

                // Generate and store PNG
                const pngData = await generateBarcodePNG(barcode);
                await client.query(
                    `INSERT INTO barcode_media (barcode_value, media_type, image_data)
                     VALUES ($1, 'png', $2)
                     ON CONFLICT (barcode_value, media_type) DO UPDATE SET image_data = $2`,
                    [barcode, pngData]
                );

                // Generate and store QR
                const qrData = await generateQRPNG(barcode);
                await client.query(
                    `INSERT INTO barcode_media (barcode_value, media_type, image_data)
                     VALUES ($1, 'qr', $2)
                     ON CONFLICT (barcode_value, media_type) DO UPDATE SET image_data = $2`,
                    [barcode, qrData]
                );

                // Log user activity
                const userId = req.user?.admin ? 'admin' : 'system';
                await client.query(
                    `INSERT INTO user_activity (user_id, action, barcode_value, details)
                     VALUES ($1, 'generate', $2, $3)`,
                    [userId, barcode, JSON.stringify({ weight, roast })]
                );

                inserted++;
            }
            await client.query('COMMIT');
            res.json({ success: true, count: inserted });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error(err);
            res.status(500).json({ error: err.message });
        } finally {
            client.release();
        }
    });
};