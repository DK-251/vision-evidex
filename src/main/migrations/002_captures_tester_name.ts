/**
 * Migration 002 — DB-NEW-01: add tester_name column to captures table.
 *
 * The initial schema (001) omitted tester_name from captures, so every
 * capture's testerName was always '' in mapCapture(). This migration adds
 * the column with a safe default so existing captures survive the upgrade.
 */
export const MIGRATION_002_CAPTURES_TESTER_NAME_UP = `
ALTER TABLE captures ADD COLUMN tester_name TEXT NOT NULL DEFAULT '';
`;
