const pool = require('./_lib/db');
require('dotenv').config();

async function addUniqueConstraint() {
    console.log('🔍 Adding unique constraint to barcode_media table...');
    
    try {
        // Check if constraint already exists
        const checkResult = await pool.query(`
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'barcode_media' 
            AND constraint_type = 'UNIQUE'
            AND constraint_name = 'unique_barcode_media'
        `);

        if (checkResult.rows.length > 0) {
            console.log('✅ Constraint "unique_barcode_media" already exists');
            await pool.end();
            return;
        }

        // Add the unique constraint
        await pool.query(`
            ALTER TABLE barcode_media 
            ADD CONSTRAINT unique_barcode_media UNIQUE (barcode_value, media_type)
        `);

        console.log('✅ Unique constraint added successfully');
    } catch (err) {
        console.error('❌ Failed to add constraint:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

addUniqueConstraint();
