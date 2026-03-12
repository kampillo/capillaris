import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '..', '.env.migration') });

export const mysqlConfig = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD ?? '',
  database: process.env.MYSQL_DATABASE || 'capillaris_legacy',
};

export const MIGRATION_NAMESPACE = process.env.MIGRATION_NAMESPACE || 'capillaris-migration';
export const CURRENT_YEAR = parseInt(process.env.CURRENT_YEAR || '2026', 10);
