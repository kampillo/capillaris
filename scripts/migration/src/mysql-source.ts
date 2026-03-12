import mysql from 'mysql2/promise';
import { mysqlConfig } from './config';

let pool: mysql.Pool | null = null;

export function getMysqlPool(): mysql.Pool {
  if (!pool) {
    const config: mysql.PoolOptions = {
      host: mysqlConfig.host,
      port: mysqlConfig.port,
      user: mysqlConfig.user,
      database: mysqlConfig.database,
      waitForConnections: true,
      connectionLimit: 5,
      charset: 'utf8mb4',
    };
    // Only set password if it's non-empty
    if (mysqlConfig.password) {
      config.password = mysqlConfig.password;
    }
    pool = mysql.createPool(config);
  }
  return pool;
}

export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const p = getMysqlPool();
  const [rows] = await p.execute(sql, params);
  return rows as T[];
}

export async function closeMysql(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
