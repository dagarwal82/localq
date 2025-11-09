import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db } from './db.mjs';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  try {
    // Read and execute the migration SQL
    const migrationPath = join(__dirname, '003_add_product_images.sql');
    const migrationSQL = await readFile(migrationPath, 'utf8');
    
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