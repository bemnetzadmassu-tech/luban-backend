const pool = require('./_lib/db');
const auth = require('./_lib/auth');
const Joi = require('joi');
const { createCanvas } = require('canvas');
const JsBarcode = require('jsbarcode');

const schema = Joi.object({
    prefix: Joi.string().required(),
    start: Joi.number().integer().min(1).required(),
    end: Joi.number().integer().min(1).required(),
    pad: Joi.number().integer().min(1).default(5),
    weight: Joi.number().integer().default(500),
    roast: Joi.string().default('MR'),
});

// Helper: Generate barcode PNG
async function generateBarcodePNG(barcode) {
    const canvas = createCanvas(300, 100);
    JsBarcode(canvas, barcode, {
        format: 'CODE128',
        width: 2,
        height: 80,
        displayValue: true,
        font: 'monospace',
        fontSize: 20,
        margin: 10,
    });
    return canvas.toDataURL('image/png');
}

// ============================================
// FIXED: Generate QR code PNG using BACKEND_URL
// ============================================
async function generateQRPNG(barcode) {
    // Use BACKEND_URL from environment variable (set in Vercel)
    const backendUrl = process.env.BACKEND_URL || 'https://luban-backend.vercel.app';
    const verifyPage = '/verify-public.html';
    const url = `${backendUrl}${verifyPage}?barcode=${encodeURIComponent(barcode)}`;
    const qrApi = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
    const response = await fetch(qrApi);
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    return `data:image/png;base64,${base64}`;
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

                // Generate and store PNG in barcode_media
                const pngData = await generateBarcodePNG(barcode);
                await client.query(
                    `INSERT INTO barcode_media (barcode_value, media_type, image_data)
                     VALUES ($1, 'png', $2)
                     ON CONFLICT (barcode_value, media_type) DO UPDATE SET image_data = $2`,
                    [barcode, pngData]
                );

                // Generate and store QR in barcode_media
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