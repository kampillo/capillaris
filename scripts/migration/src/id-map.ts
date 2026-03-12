import { v5 as uuidv5 } from 'uuid';
import { MIGRATION_NAMESPACE } from './config';

// Deterministic namespace UUID for the migration (generated from MIGRATION_NAMESPACE string)
const NAMESPACE_UUID = uuidv5(MIGRATION_NAMESPACE, uuidv5.DNS);

// Map<tableName, Map<oldIntId, newUuid>>
const maps = new Map<string, Map<number | string, string>>();

/**
 * Generate a deterministic UUID v5 from a table name and old ID.
 * Same input always produces the same UUID.
 */
export function generateUuid(table: string, oldId: number | string): string {
  return uuidv5(`${table}:${oldId}`, NAMESPACE_UUID);
}

/**
 * Register a mapping from old ID to new UUID for a given table.
 */
export function setId(table: string, oldId: number | string, newUuid: string): void {
  if (!maps.has(table)) {
    maps.set(table, new Map());
  }
  maps.get(table)!.set(oldId, newUuid);
}

/**
 * Get the new UUID for a given old ID. Returns undefined if not mapped.
 */
export function getId(table: string, oldId: number | string): string | undefined {
  return maps.get(table)?.get(oldId);
}

/**
 * Get the new UUID for a given old ID, throwing if not found.
 */
export function requireId(table: string, oldId: number | string): string {
  const id = getId(table, oldId);
  if (!id) {
    throw new Error(`ID not found in map: ${table}:${oldId}`);
  }
  return id;
}

/**
 * Convenience: generate UUID and register it in one call.
 */
export function mapId(table: string, oldId: number | string): string {
  const uuid = generateUuid(table, oldId);
  setId(table, oldId, uuid);
  return uuid;
}

/**
 * Get all mappings for a table.
 */
export function getTableMap(table: string): Map<number | string, string> {
  return maps.get(table) || new Map();
}

/**
 * Clear all mappings (for re-runs).
 */
export function clearAllMaps(): void {
  maps.clear();
}

/**
 * Get stats about current mappings.
 */
export function getMapStats(): Record<string, number> {
  const stats: Record<string, number> = {};
  for (const [table, map] of maps) {
    stats[table] = map.size;
  }
  return stats;
}
