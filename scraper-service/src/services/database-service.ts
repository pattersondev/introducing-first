import { Pool } from 'pg';
import { createTablesQuery } from '../database/schema';

export class DatabaseService {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
    });
  }

  async initialize() {
    const client = await this.pool.connect();
    try {
      await client.query(createTablesQuery);
      console.log('Database tables created successfully');
    } catch (error) {
      console.error('Error creating database tables:', error);
    } finally {
      client.release();
    }
  }

  getPool() {
    return this.pool;
  }
} 