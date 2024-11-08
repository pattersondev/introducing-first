import dotenv from 'dotenv';
import { DatabaseService } from '../services/database-service';
import { RankingsService } from '../services/rankings-service';

dotenv.config();

async function updateAllRankings() {
  const dbService = new DatabaseService(process.env.DATABASE_URL!);
  const rankingsService = new RankingsService(dbService.getPool());

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
    process.exit();
  }
}

// Run the update
updateAllRankings(); 