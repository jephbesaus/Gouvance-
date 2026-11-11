const { Pool } = require('pg');
module.exports = new Pool({ connectionString: process.env.DATABASE_URL, max: +process.env.DB_POOL || 10, ssl: process.env.DATABASE_SSL === '1' ? { rejectUnauthorized: false } : undefined });
