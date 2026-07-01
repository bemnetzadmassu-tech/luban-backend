const pool = require('./_lib/db');
const auth = require('./_lib/auth');
const Joi = require('joi');

const schema = Joi.object({
    barcode: Joi.string().required(),
    origin: Joi.string().allow(''),
    batch_info: Joi.string().allow(''),
    farm_name: Joi.string().allow(''),
    farmer_name: Joi.string().allow(''),
    plot_name: Joi.string().allow(''),
    latitude: Joi.number().min(-90).max(90).allow(null),
    longitude: Joi.number().min(-180).max(180).allow(null),
    harvest_date: Joi.date().allow(null),
    processing_method: Joi.string().allow(''),
    certificates: Joi.array().items(Joi.string()),
    region: Joi.string().allow(''),
    altitude: Joi.number().integer().allow(null),
    is_sold: Joi.boolean().default(false),
    is_revoked: Joi.boolean().default(false),
});

module.exports = async (req, res) => {
    await auth(req, res, async () => {
        const { error, value } = schema.validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });

        const { barcode, ...updates } = value;

        const fields = [];
        const params = [];
        let paramIndex = 1;

        const allowedFields = [
            'origin', 'batch_info', 'farm_name', 'farmer_name', 'plot_name',
            'latitude', 'longitude', 'harvest_date', 'processing_method',
            'certificates', 'region', 'altitude', 'is_sold', 'is_revoked'
        ];

        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                fields.push(`${field} = $${paramIndex}`);
                params.push(updates[field]);
                paramIndex++;
            }
        }

        if (fields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        fields.push(`updated_at = CURRENT_TIMESTAMP`);
        params.push(barcode);

        const query = `
            UPDATE serialized_barcodes 
            SET ${fields.join(', ')}
            WHERE barcode_value = $${paramIndex}
            RETURNING *
        `;

        try {
            const result = await pool.query(query, params);
            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Barcode not found' });
            }

            // Log user activity
            const userId = req.user?.admin ? 'admin' : 'unknown';
            await pool.query(
                `INSERT INTO user_activity (user_id, action, barcode_value, details)
                 VALUES ($1, 'edit', $2, $3)`,
                [userId, barcode, JSON.stringify(updates)]
            );

            res.json({
                success: true,
                message: 'Barcode updated successfully',
                product: result.rows[0]
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Database error' });
        }
    });
};