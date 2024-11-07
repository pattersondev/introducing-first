import { DatabaseService } from '../services/database-service';
import { FighterService } from '../services/fighter-service';
import dotenv from 'dotenv';

dotenv.config();

async function cleanup() {
  const dbService = new DatabaseService(process.env.DATABASE_URL!);
  const fighterService = new FighterService(dbService.getPool());

  try {
    console.log('Starting search history cleanup...');
    await fighterService.cleanupSearches();
    console.log('Cleanup completed successfully');
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    process.exit();
  }
}

cleanup(); 