import dotenv from 'dotenv';
import { Pool } from 'pg';
import { DatabaseService } from '../services/database-service';
import { RankingsService } from '../services/rankings-service';

// Load environment variables before anything else
dotenv.config();

async function updateAllRankings() {
  // Verify DATABASE_URL exists
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  // Create database pool with explicit configuration
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Add this if using Heroku or similar services
    }
  });

  // Test database connection before proceeding
  try {
    const client = await pool.connect();
    client.release();
    console.log('Successfully connected to database');
  } catch (err) {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  }

  const rankingsService = new RankingsService(pool);

  try {
    console.log('Starting rankings update...');
    
    // Get all weight classes
    const weightClasses = await rankingsService.getWeightClasses();
    
    // Update rankings for each weight class
    for (const weightClass of weightClasses) {
      console.log(`Updating rankings for ${weightClass.division} ${weightClass.name}...`);
      await rankingsService.updateRankings(weightClass.weight_class_id);
    }

    console.log('Rankings update completed successfully');
  } catch (error) {
    console.error('Error during rankings update:', error);
  } finally {
    await pool.end(); // Properly close the pool
    process.exit();
  }
}

// Run the update
updateAllRankings(); 