import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../src/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '../../../../');

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function parseCustomJsonDirEntries(value) {
  const input = String(value || '').trim();
  if (!input) return [];

  try {
    const parsed = JSON.parse(input);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item || '').trim()).filter(Boolean);
    }
    if (typeof parsed === 'string' && parsed.trim()) {
      return [parsed.trim()];
    }
  } catch {
    // noop, fallback to delimiter parsing
  }

  return input
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function expandDirCandidates(entries) {
  return entries.flatMap((entry) => [
    path.resolve(entry),
    path.resolve(process.cwd(), entry),
    path.resolve(__dirname, entry)
  ]);
}

async function resolveCustomJsonDir(fileName) {
  const defaultDirs = [
    path.resolve(workspaceRoot, 'foremoz/apps/eventdb-custom-json'),
    path.resolve(workspaceRoot, 'passport-foremoz/apps/eventdb-custom-json')
  ];

  const configuredDirs = expandDirCandidates(parseCustomJsonDirEntries(process.env.CUSTOM_JSON_DIR));
  const candidates = [...new Set([...configuredDirs, ...defaultDirs])];

  for (const candidate of candidates) {
    if (await pathExists(path.resolve(candidate, fileName))) return candidate;
  }

  throw new Error(`Unable to resolve ${fileName}. Checked dirs: ${candidates.join(', ')}`);
}

async function main() {
  const fileName = 'fitness-read-model.postgres.sql';
  const customJsonDir = await resolveCustomJsonDir(fileName);
  const sqlPath = path.resolve(customJsonDir, 'fitness-read-model.postgres.sql');
  const sql = await fs.readFile(sqlPath, 'utf8');
  await pool.query(sql);
  // eslint-disable-next-line no-console
  console.log(`Read model schema applied: ${sqlPath}`);
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
