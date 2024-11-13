async function updateAllPredictions() {
    const query = `
        SELECT matchup_id 
        FROM matchups m
        JOIN events e ON m.event_id = e.event_id
        WHERE e.date >= CURRENT_DATE
        AND m.fighter1_id IS NOT NULL
        AND m.fighter2_id IS NOT NULL
    `;
    
    const result = await pool.query(query);
    
    for (const row of result.rows) {
        await predictionService.predictFight(row.matchup_id);
        // Add delay to prevent overloading
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
} 