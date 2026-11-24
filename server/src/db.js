require('dotenv').config();
const { Pool } = require('pg');

// Connection details come from .env (see .env.example). Nothing secret is hard-coded.
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'sweety',
});

module.exports = pool;
