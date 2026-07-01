const pool = require('./_lib/db');
const auth = require('./_lib/auth');
const Joi = require('joi');

const schema = Joi.object({
    prefix: Joi.string().required(),
    start: Joi.number().integer().min(1).required(),
    end: Joi.number().integer().min(1).required(),
    origin: Joi.string().required(),
    batchInfo: Joi.string().allow(''),
    farmName: Joi.string().allow(''),
    farmerName: Joi.string().allow(''),
    plotName: Joi.string().allow(''),
    latitude: Joi.number().min(-90).max(90).allow(null),
    longitude: Joi.number().min(-180).max(180).allow(null),
    harvestDate: Joi.date().allow(null),
    processingMethod: Joi.string().allow(''),
    certificates: Joi.array().items(Joi.string()),
    country: Joi.string().default('Ethiopia'),
    region: Joi.string().allow(''),
    altitude: Joi.number().integer().allow(null)
});

module.exports = async (req, res) => {
    await auth(req, res, async () => {
        const { error, value } = schema.validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });

        const { prefix, start, end, ...traceData } = value;
        const pad = 5;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            let updated = 0;

            for (let i = start; i <= end; i++) {
                const num = String(i).padStart(pad, '0');
                const barcode = prefix + num;

                // Check if barcode exists
                const exists = await client.query(
                    'SELECT barcode_value FROM serialized_barcodes WHERE barcode_value = $1',
                    [barcode]
                );

                if (exists.rows.length === 0) {
                    // Create barcode if it doesn't exist
                    await client.query(
                        `INSERT INTO serialized_barcodes (barcode_value)
                         VALUES ($1)`,
                        [barcode]
                    );
                }

                // Update with EUDR data
                const result = await client.query(`
                    UPDATE serialized_barcodes SET
                        origin = $1,
                        batch_info = $2,
                        farm_name = $3,
                        farmer_name = $4,
                        plot_name = $5,
                        latitude = $6,
                        longitude = $7,
                        harvest_date = $8,
                        processing_method = $9,
                        certificates = $10,
                        country = $11,
                        region = $12,
                        altitude = $13,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE barcode_value = $14
                `, [
                    traceData.origin,
                    traceData.batchInfo,
                    traceData.farmName,
                    traceData.farmerName,
                    traceData.plotName,
                    traceData.latitude,
                    traceData.longitude,
                    traceData.harvestDate,
                    traceData.processingMethod,
                    traceData.certificates || [],
                    traceData.country,
                    traceData.region,
                    traceData.altitude,
                    barcode
                ]);

                if (result.rowCount > 0) updated++;
            }

            await client.query('COMMIT');

            // Log user activity
            const userId = req.user?.admin ? 'admin' : 'system';
            await client.query(
                `INSERT INTO user_activity (user_id, action, details)
                 VALUES ($1, 'register_batch', $2)`,
                [userId, JSON.stringify({ prefix, start, end, origin: traceData.origin })]
            );

            res.json({
                success: true,
                count: updated,
                message: `Batch registered for ${updated} barcodes`,
                range: `${prefix}${String(start).padStart(pad, '0')} – ${prefix}${String(end).padStart(pad, '0')}`
            });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error(err);
            res.status(500).json({ error: err.message });
        } finally {
            client.release();
        }
    });
};