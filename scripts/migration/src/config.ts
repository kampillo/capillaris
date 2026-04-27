import { config } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

// Local overrides (gitignored) take precedence over the committed template.
const baseDir = resolve(__dirname, '..');
const localEnv = resolve(baseDir, '.env.migration.local');
const templateEnv = resolve(baseDir, '.env.migration');

if (existsSync(localEnv)) config({ path: localEnv });
config({ path: templateEnv });

export const mysqlConfig = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD ?? '',
  database: process.env.MYSQL_DATABASE || 'capillaris_legacy',
};

export const MIGRATION_NAMESPACE = process.env.MIGRATION_NAMESPACE || 'capillaris-migration';
export const CURRENT_YEAR = parseInt(process.env.CURRENT_YEAR || '2026', 10);
