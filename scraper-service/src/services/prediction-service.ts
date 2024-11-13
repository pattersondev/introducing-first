import { v4 as uuidv4 } from 'uuid';
import { Pool } from 'pg';
import { Fighter, Matchup, Fight } from '../types/types';

interface SimulationResult {
    winner: string;
    method: 'KO/TKO' | 'Submission' | 'Decision';
    round: number;
}

interface PredictionResult {
    matchup_id: string;
    fighter1: {
        fighter_id: string;
        win_probability: number;
        ko_tko_probability: number;
        submission_probability: number;
        decision_probability: number;
    };
    fighter2: {
        fighter_id: string;
        win_probability: number;
        ko_tko_probability: number;
        submission_probability: number;
        decision_probability: number;
    };
    confidence_score: number;
    simulation_count: number;
    created_at: Date;
}

interface FighterStats {
    totalFights: number;
    wins: number;
    koTkoWins: number;
    submissionWins: number;
    decisionWins: number;
    koTkoLosses: number;
    submissionLosses: number;
    decisionLosses: number;
    winStreak: number;
    recentWinRate: number;
}

export class PredictionService {
    private pool: Pool;
    private readonly SIMULATION_COUNT = 10000;

    constructor(pool: Pool) {
        this.pool = pool;
    }

    private async getFighterStats(fighterId: string): Promise<FighterStats> {
        const fights = await this.getFighterFightHistory(fighterId);
        console.log('Raw fight data:', JSON.stringify(fights, null, 2));
        
        const stats: FighterStats = {
            totalFights: fights.length,
            wins: 0,
            koTkoWins: 0,
            submissionWins: 0,
            decisionWins: 0,
            koTkoLosses: 0,
            submissionLosses: 0,
            decisionLosses: 0,
            winStreak: 0,
            recentWinRate: 0
        };

        // Focus on last 3 fights for recent performance
        const recentFights = fights.slice(0, 3);
        let currentStreak = 0;
        let recentWins = 0;

        // Calculate recent performance (last 3 fights)
        recentFights.forEach((fight, index) => {
            const isWin = fight.result === 'W';
            
            if (isWin) {
                recentWins++;
                stats.recentWinRate += (1 / Math.pow(2, index));
            }
        });

        // Normalize recent win rate
        const recentWeightSum = recentFights.length > 0 ? 
            recentFights.reduce((sum, _, i) => sum + (1 / Math.pow(2, i)), 0) : 1;
        stats.recentWinRate = stats.recentWinRate / recentWeightSum;

        // Calculate overall stats
        fights.forEach(fight => {
            const isWin = fight.result === 'W';
            const isLoss = fight.result === 'L';
            
            if (isWin) {
                stats.wins++;
                
                // Determine win method
                if (fight.decision.includes('KO/TKO') || fight.decision.includes('TKO')) {
                    stats.koTkoWins++;
                } else if (fight.decision.includes('Submission')) {
                    stats.submissionWins++;
                } else {
                    stats.decisionWins++;
                }
                
                currentStreak++;
            } 
            else if (isLoss) {
                // Determine loss method
                if (fight.decision.includes('KO/TKO') || fight.decision.includes('TKO')) {
                    stats.koTkoLosses++;
                } else if (fight.decision.includes('Submission')) {
                    stats.submissionLosses++;
                } else {
                    stats.decisionLosses++;
                }
                
                currentStreak = 0;
            }
            // If it's a draw ('D') or no contest, don't affect the streak
            
            stats.winStreak = Math.max(stats.winStreak, currentStreak);
        });

        console.log(`Stats calculated for fighter ${fighterId}:`, stats);
        return stats;
    }

    public async predictFight(matchupId: string): Promise<PredictionResult> {
        const matchup = await this.getMatchup(matchupId);
        const fighter1Stats = await this.getFighterStats(matchup.fighter1_id);
        const fighter2Stats = await this.getFighterStats(matchup.fighter2_id);

        const results = this.runSimulations(fighter1Stats, fighter2Stats);
        
        const fighter1Wins = results.filter(r => r.winner === 'fighter1');
        const fighter2Wins = results.filter(r => r.winner === 'fighter2');

        const fighter1WinProb = fighter1Wins.length / this.SIMULATION_COUNT;
        const fighter2WinProb = fighter2Wins.length / this.SIMULATION_COUNT;

        // Store prediction
        await this.storePrediction(matchupId, results);

        return {
            matchup_id: matchupId,
            fighter1: {
                fighter_id: matchup.fighter1_id,
                win_probability: fighter1WinProb,
                ...this.calculateMethodProbabilities(results, 'fighter1')
            },
            fighter2: {
                fighter_id: matchup.fighter2_id,
                win_probability: fighter2WinProb,
                ...this.calculateMethodProbabilities(results, 'fighter2')
            },
            confidence_score: this.calculateConfidenceScore(fighter1Stats, fighter2Stats),
            simulation_count: this.SIMULATION_COUNT,
            created_at: new Date()
        };
    }

    private runSimulations(fighter1Stats: FighterStats, fighter2Stats: FighterStats): SimulationResult[] {
        const results: SimulationResult[] = [];
        let f1Wins = 0;
        let f2Wins = 0;

        // Calculate base scores once
        const calculateBaseScore = (stats: FighterStats) => {
            console.log('Calculating score for fighter with stats:', JSON.stringify(stats, null, 2));
            
            let score = 50;  // Base score
            
            // Recent performance (last 3 fights) - up to 80 points (reduced from 100)
            const recentScore = stats.recentWinRate * 80;
            console.log('Recent performance score:', recentScore);
            score += recentScore;
            
            // Win rate - up to 60 points (reduced from 100)
            const winRateScore = (stats.wins / Math.max(stats.totalFights, 1)) * 60;
            console.log('Win rate score:', winRateScore);
            score += winRateScore;
            
            // Finish rate - up to 60 points (reduced from 100)
            const finishRate = ((stats.koTkoWins + stats.submissionWins) / 
                              Math.max(stats.wins, 1)) * 60;
            console.log('Finish rate score:', finishRate);
            score += finishRate;
            
            // Perfect record bonus - scaled based on number of fights
            let perfectBonus = 0;
            if (stats.wins === stats.totalFights && stats.totalFights > 0) {
                perfectBonus = Math.min(stats.totalFights * 10, 50); // Reduced from 20/100
                console.log('Perfect record bonus:', perfectBonus);
            }
            score += perfectBonus;
            
            // All finishes bonus - reduced to 30 points
            let finishBonus = 0;
            if (stats.koTkoWins + stats.submissionWins === stats.wins && stats.wins > 0) {
                finishBonus = 30;
                console.log('All finishes bonus:', finishBonus);
            }
            score += finishBonus;
            
            // Loss penalty - reduced to 15 points per finish loss
            const lossPenalty = (stats.koTkoLosses + stats.submissionLosses) * 15;
            console.log('Loss penalty:', lossPenalty);
            score = Math.max(score - lossPenalty, 50);  // Maintain minimum score of 50
            
            // Normalize score to reduce extreme differences
            const normalizedScore = 50 + ((score - 50) * 0.8); // Compress the range
            
            console.log('Final score:', normalizedScore);
            return normalizedScore;
        };

        const f1BaseScore = calculateBaseScore(fighter1Stats);
        const f2BaseScore = calculateBaseScore(fighter2Stats);

        console.log('\nFinal scores comparison:');
        console.log('Fighter 1 base score:', f1BaseScore);
        console.log('Fighter 2 base score:', f2BaseScore);

        for (let i = 0; i < this.SIMULATION_COUNT; i++) {
            // Add less randomness to maintain separation
            const f1Score = f1BaseScore * (0.95 + Math.random() * 0.1); // ±5% variance
            const f2Score = f2BaseScore * (0.95 + Math.random() * 0.1);
            
            const f1WinProb = f1Score / (f1Score + f2Score);
            
            const winner = Math.random() < f1WinProb ? 'fighter1' : 'fighter2';
            if (winner === 'fighter1') f1Wins++;
            else f2Wins++;

            // Determine finish probabilities based on winner's stats
            const winnerStats = winner === 'fighter1' ? fighter1Stats : fighter2Stats;
            const loserStats = winner === 'fighter1' ? fighter2Stats : fighter1Stats;

            // Calculate finish probability
            const finishProb = (winnerStats.koTkoWins + winnerStats.submissionWins) / 
                              Math.max(winnerStats.totalFights, 1);
            
            // Determine method
            let method: 'KO/TKO' | 'Submission' | 'Decision';
            if (Math.random() < finishProb) {
                const koProb = winnerStats.koTkoWins / 
                              Math.max(winnerStats.koTkoWins + winnerStats.submissionWins, 1);
                method = Math.random() < koProb ? 'KO/TKO' : 'Submission';
            } else {
                method = 'Decision';
            }

            // Determine round
            const round = method === 'Decision' ? 5 : 
                         Math.min(Math.ceil(Math.random() * 5), 5);

            results.push({ winner, method, round });
        }

        console.log(`\nSimulation results: Fighter 1 wins: ${f1Wins}, Fighter 2 wins: ${f2Wins}`);
        console.log(`Win rates: Fighter 1: ${(f1Wins/this.SIMULATION_COUNT*100).toFixed(1)}%, Fighter 2: ${(f2Wins/this.SIMULATION_COUNT*100).toFixed(1)}%`);
        
        return results;
    }

    private calculateMethodProbabilities(results: SimulationResult[], fighterId: string) {
        const totalFights = results.filter(r => r.winner === fighterId).length;
        if (totalFights === 0) return {
            ko_tko_probability: 0,
            submission_probability: 0,
            decision_probability: 0
        };

        return {
            ko_tko_probability: results.filter(r => 
                r.winner === fighterId && r.method === 'KO/TKO'
            ).length / this.SIMULATION_COUNT,
            submission_probability: results.filter(r => 
                r.winner === fighterId && r.method === 'Submission'
            ).length / this.SIMULATION_COUNT,
            decision_probability: results.filter(r => 
                r.winner === fighterId && r.method === 'Decision'
            ).length / this.SIMULATION_COUNT
        };
    }

    private calculateConfidenceScore(
        fighter1Stats: FighterStats,
        fighter2Stats: FighterStats
    ): number {
        // Calculate confidence based on sample size and consistency
        const experienceFactor = Math.min(
            (fighter1Stats.totalFights + fighter2Stats.totalFights) / 20,
            1
        );

        // Calculate performance consistency
        const f1Consistency = Math.abs(fighter1Stats.recentWinRate - 
            (fighter1Stats.wins / fighter1Stats.totalFights));
        const f2Consistency = Math.abs(fighter2Stats.recentWinRate - 
            (fighter2Stats.wins / fighter2Stats.totalFights));
        
        const consistencyScore = (1 - ((f1Consistency + f2Consistency) / 2)) * 100;

        return Math.round((experienceFactor * 0.4 + (consistencyScore * 0.6)));
    }

    // Database helper methods...
    private async getFighterFightHistory(fighterId: string): Promise<Fight[]> {
        const query = `
            SELECT * FROM fights 
            WHERE fighter_id = $1 
            ORDER BY date DESC
        `;
        const result = await this.pool.query(query, [fighterId]);
        return result.rows;
    }

    private async getMatchup(matchupId: string): Promise<Matchup> {
        const query = `
            SELECT * FROM matchups 
            WHERE matchup_id = $1
        `;
        const result = await this.pool.query(query, [matchupId]);
        if (result.rows.length === 0) {
            throw new Error(`Matchup not found: ${matchupId}`);
        }
        return result.rows[0];
    }

    private async storePrediction(matchupId: string, results: SimulationResult[]): Promise<void> {
        const matchup = await this.getMatchup(matchupId);
        const fighter1Wins = results.filter(r => r.winner === 'fighter1');
        const fighter2Wins = results.filter(r => r.winner === 'fighter2');

        const fighter1Stats = await this.getFighterStats(matchup.fighter1_id);
        const fighter2Stats = await this.getFighterStats(matchup.fighter2_id);

        const query = `
            INSERT INTO fight_predictions (
                prediction_id,
                matchup_id,
                fighter1_id,
                fighter2_id,
                fighter1_win_probability,
                fighter2_win_probability,
                fighter1_ko_tko_probability,
                fighter1_submission_probability,
                fighter1_decision_probability,
                fighter2_ko_tko_probability,
                fighter2_submission_probability,
                fighter2_decision_probability,
                simulation_count,
                confidence_score
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        `;

        const f1Methods = this.calculateMethodProbabilities(results, 'fighter1');
        const f2Methods = this.calculateMethodProbabilities(results, 'fighter2');

        await this.pool.query(query, [
            uuidv4(),
            matchupId,
            matchup.fighter1_id,
            matchup.fighter2_id,
            fighter1Wins.length / this.SIMULATION_COUNT,
            fighter2Wins.length / this.SIMULATION_COUNT,
            f1Methods.ko_tko_probability,
            f1Methods.submission_probability,
            f1Methods.decision_probability,
            f2Methods.ko_tko_probability,
            f2Methods.submission_probability,
            f2Methods.decision_probability,
            this.SIMULATION_COUNT,
            this.calculateConfidenceScore(fighter1Stats, fighter2Stats)
        ]);
    }

    public async getLatestPrediction(matchupId: string): Promise<PredictionResult | null> {
        const query = `
            SELECT * FROM fight_predictions
            WHERE matchup_id = $1
            ORDER BY created_at DESC
            LIMIT 1
        `;

        const result = await this.pool.query(query, [matchupId]);
        
        if (result.rows.length === 0) {
            return null;
        }

        const prediction = result.rows[0];
        return {
            matchup_id: prediction.matchup_id,
            fighter1: {
                fighter_id: prediction.fighter1_id,
                win_probability: prediction.fighter1_win_probability,
                ko_tko_probability: prediction.fighter1_ko_tko_probability,
                submission_probability: prediction.fighter1_submission_probability,
                decision_probability: prediction.fighter1_decision_probability
            },
            fighter2: {
                fighter_id: prediction.fighter2_id,
                win_probability: prediction.fighter2_win_probability,
                ko_tko_probability: prediction.fighter2_ko_tko_probability,
                submission_probability: prediction.fighter2_submission_probability,
                decision_probability: prediction.fighter2_decision_probability
            },
            confidence_score: prediction.confidence_score,
            simulation_count: prediction.simulation_count,
            created_at: prediction.created_at
        };
    }
} 