// Ensures the target user and database exist before Directus starts.
// Connects as the admin user (DB_ADMIN_USER) to:
//   1. Create DB_USER with DB_PASSWORD if the role does not exist
//   2. Create DB_DATABASE owned by DB_USER if the database does not exist
//
// Error codes:
//   42710 — role already exists (safe to ignore)
//   42P04 — database already exists (safe to ignore)

'use strict';

const { Client } = require('pg');

const {
  DB_HOST,
  DB_PORT,
  DB_ADMIN_USER,
  DB_ADMIN_PASSWORD,
  DB_USER,
  DB_PASSWORD,
  DB_DATABASE,
} = process.env;

const missing = ['DB_HOST', 'DB_PORT', 'DB_ADMIN_USER', 'DB_ADMIN_PASSWORD', 'DB_USER', 'DB_PASSWORD', 'DB_DATABASE']
  .filter(k => !process.env[k]);
if (missing.length) throw new Error(`Missing required env vars: ${missing.join(', ')}`);

async function run() {
  const client = new Client({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_ADMIN_USER,
    password: DB_ADMIN_PASSWORD,
    database: 'postgres',
  });

  await client.connect();

  // ── Create user if not exists ───────────────────────────────────────────────
  try {
    await client.query(`CREATE USER "${DB_USER}" WITH PASSWORD '${DB_PASSWORD}'`);
    console.log(`User "${DB_USER}" created.`);
  } catch (err) {
    if (err.code === '42710') {
      console.log(`User "${DB_USER}" already exists, skipping.`);
    } else {
      throw err;
    }
  }

  // ── Create database if not exists ───────────────────────────────────────────
  try {
    await client.query(`CREATE DATABASE "${DB_DATABASE}" WITH OWNER "${DB_USER}"`);
    console.log(`Database "${DB_DATABASE}" created.`);
  } catch (err) {
    if (err.code === '42P04') {
      console.log(`Database "${DB_DATABASE}" already exists, skipping.`);
    } else {
      throw err;
    }
  }

  // ── Grant privileges ────────────────────────────────────────────────────────
  await client.query(`GRANT ALL PRIVILEGES ON DATABASE "${DB_DATABASE}" TO "${DB_USER}"`);
  console.log(`Privileges granted to "${DB_USER}" on "${DB_DATABASE}".`);

  await client.end();
}

run().catch(err => { console.error(err); process.exit(1); });
