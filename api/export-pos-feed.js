const pool = require('./_lib/db');
const auth = require('./_lib/auth');

module.exports = async (req, res) => {
    await auth(req, res, async () => {
        try {
            const result = await pool.query(`
                SELECT 
                    barcode_value, 
                    origin, 
                    batch_info, 
                    weight_grams, 
                    roast_level,
                    farm_name,
                    processing_method,
                    country
                FROM serialized_barcodes 
                ORDER BY barcode_value
            `);

            let csv = 'Barcode,Product Name,Price,Weight (g),Origin,Roast,Farm,Batch\n';
            result.rows.forEach(row => {
                const productName = `${row.origin || 'Luban'} Coffee`;
                const price = row.weight_grams === 500 ? 49.99 : 28.99;
                csv += `${row.barcode_value},"${productName}",${price.toFixed(2)},${row.weight_grams || 250},"${row.origin || 'Ethiopia'}","${row.roast_level || 'MR'}","${row.farm_name || 'N/A'}","${row.batch_info || 'N/A'}"\n`;
            });

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=luban_supermarket_feed.csv');
            res.send(csv);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Database error' });
        }
    });
};