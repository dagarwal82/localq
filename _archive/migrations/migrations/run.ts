import { sql } from 'drizzle-orm';
import { db } from '../server/db';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    // Read and execute the migration SQL
    const migrationPath = path.join(__dirname, '003_add_product_images.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');
    
    console.log('Running migration...');
    await db.execute(sql.raw(migrationSQL));
    console.log('Migration successful!');
    
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();