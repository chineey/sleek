#!/usr/bin/env node
/**
 * Safe admin creation/reset script.
 * Usage:
 *   node scripts/create_admin.js --username admin --password yourpass
 * Or set env vars ADMIN_USERNAME and ADMIN_PASSWORD and run:
 *   node scripts/create_admin.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
// Load environment from .env explicitly so the script uses .env (not .env.local)
require('dotenv').config({ path: '.env' });

const prisma = new PrismaClient();

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--username' && args[i + 1]) {
      out.username = args[++i];
    } else if (a === '--password' && args[i + 1]) {
      out.password = args[++i];
    }
  }
  return out;
}

async function main() {
  const cli = parseArgs();
  const username = cli.username || process.env.ADMIN_USERNAME || 'admin';
  const password = cli.password || process.env.ADMIN_PASSWORD || 'adminsecurepassword';

  if (!password || password.length < 6) {
    console.error('Password must be at least 6 characters. Aborting.');
    process.exit(1);
  }

  console.log(`Creating/updating admin user '${username}'...`);
  const hashed = await bcrypt.hash(password, 10);

  try {
    const up = await prisma.user.upsert({
      where: { username },
      update: { password: hashed },
      create: { username, password: hashed },
    });
    console.log('Admin user upserted:', up.username);
  } catch (err) {
    console.error('Failed to create/update admin user:', err.message || err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('Script error:', e);
  process.exit(1);
});
