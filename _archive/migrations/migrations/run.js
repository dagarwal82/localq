"use strict";
require('dotenv').config();
const { sql } = require('drizzle-orm');
const { db } = require('../server/db');
const fs = require('fs/promises');
const path = require('path');

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