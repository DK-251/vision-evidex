import { MIGRATION_001_INITIAL_SCHEMA_UP } from './001_initial_schema';

/**
 * Project-DB migration registry. Applied in array order by
 * `DatabaseService.initProjectSchema()`. Each entry is immutable once
 * shipped — new schema changes go as a fresh entry below.
 *
 * `version` is both the primary key in `schema_migrations` and the
 * human-readable migration name. Keep them zero-padded so lexical
 * sort matches apply order.
 */

export interface Migration {
  version: string;
  up: string;
}

export const PROJECT_MIGRATIONS: readonly Migration[] = Object.freeze([
  {
    version: '001_initial_schema',
    up: MIGRATION_001_INITIAL_SCHEMA_UP,
  },
]);
