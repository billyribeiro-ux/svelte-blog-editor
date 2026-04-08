import Database from 'better-sqlite3';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';
import { migrate, seed } from './schema.js';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

/**
 * Singleton better-sqlite3 database client.
 * Runs migrations on first access and seeds only in development.
 */
const client = new Database(env.DATABASE_URL);
migrate(client);

if (dev) {
	seed(client);
}

export const db = client;
