import { v4 as uuidv4 } from 'uuid';
import { Pool } from 'pg';
import { 
    Fighter, 
    Matchup, 
    StrikingStats, 
    GroundStats, 
    ClinchStats, 
    Fight 
} from '../types/types';

interface FighterAttributes {
    strikingOffense: number;
    strikingDefense: number;
    takedownOffense: number;
    takedownDefense: number;
    submissionOffense: number;
    submissionDefense: number;
    cardio: number;
    chin: number;
}

interface SimulationResult {
    winner: string;
    method: 'KO/TKO' | 'Submission' | 'Decision';
    round: number;
}

interface StrikingExchange {
    damage: number;
    knockdownProbability: number;
    winner: 'fighter1' | 'fighter2';
}

interface GroundExchange {
    submissionProbability: number;
    winner: 'fighter1' | 'fighter2';
    position: 'top' | 'bottom' | 'neutral';
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

export class PredictionService {
    private pool: Pool;
    private readonly SIMULATION_COUNT = 10000;

    constructor(pool: Pool) {
        this.pool = pool;
    }

    private async calculateFighterAttributes(fighterId: string): Promise<FighterAttributes> {
        // Fetch fighter's historical data
        const strikingStats = await this.getFighterStrikingStats(fighterId);
        const groundStats = await this.getFighterGroundStats(fighterId);
        const clinchStats = await this.getFighterClinchStats(fighterId);
        const fightHistory = await this.getFighterFightHistory(fighterId);

        // Calculate normalized ratings (0-100) based on historical performance
        return {
            strikingOffense: this.calculateStrikingOffenseRating(strikingStats),
            strikingDefense: this.calculateStrikingDefenseRating(strikingStats),
            takedownOffense: this.calculateTakedownOffenseRating(clinchStats),
            takedownDefense: this.calculateTakedownDefenseRating(clinchStats),
            submissionOffense: this.calculateSubmissionOffenseRating(groundStats, fightHistory),
            submissionDefense: this.calculateSubmissionDefenseRating(groundStats, fightHistory),
            cardio: this.calculateCardioRating(fightHistory),
            chin: this.calculateChinRating(fightHistory, strikingStats)
        };
    }

    private simulateRound(
        fighter1Attrs: FighterAttributes,
        fighter2Attrs: FighterAttributes,
        currentRound: number
    ): SimulationResult | null {
        // Implement round simulation logic
        const strikingExchange = this.simulateStrikingExchange(fighter1Attrs, fighter2Attrs);
        const groundExchange = this.simulateGroundExchange(fighter1Attrs, fighter2Attrs);
        
        // Apply cardio degradation
        const cardioFactor1 = Math.pow(0.95, currentRound) * fighter1Attrs.cardio;
        const cardioFactor2 = Math.pow(0.95, currentRound) * fighter2Attrs.cardio;

        // Calculate finish probabilities
        return this.calculateRoundResult(
            strikingExchange,
            groundExchange,
            cardioFactor1,
            cardioFactor2
        );
    }

    public async predictFight(matchupId: string): Promise<PredictionResult> {
        const matchup = await this.getMatchup(matchupId);
        const fighter1Attrs = await this.calculateFighterAttributes(matchup.fighter1_id);
        const fighter2Attrs = await this.calculateFighterAttributes(matchup.fighter2_id);

        let results: SimulationResult[] = [];

        // Run multiple simulations
        for (let i = 0; i < this.SIMULATION_COUNT; i++) {
            const simResult = this.simulateFight(fighter1Attrs, fighter2Attrs);
            results.push(simResult);
        }

        // Calculate all probabilities
        const fighter1Wins = results.filter(r => r.winner === 'fighter1');
        const fighter2Wins = results.filter(r => r.winner === 'fighter2');

        const fighter1KOTKOs = fighter1Wins.filter(r => r.method === 'KO/TKO');
        const fighter1Subs = fighter1Wins.filter(r => r.method === 'Submission');
        const fighter1Decisions = fighter1Wins.filter(r => r.method === 'Decision');

        const fighter2KOTKOs = fighter2Wins.filter(r => r.method === 'KO/TKO');
        const fighter2Subs = fighter2Wins.filter(r => r.method === 'Submission');
        const fighter2Decisions = fighter2Wins.filter(r => r.method === 'Decision');

        // Store prediction in database
        await this.storePrediction(matchupId, results);

        // Return detailed prediction result
        return {
            matchup_id: matchupId,
            fighter1: {
                fighter_id: matchup.fighter1_id,
                win_probability: fighter1Wins.length / this.SIMULATION_COUNT,
                ko_tko_probability: fighter1KOTKOs.length / this.SIMULATION_COUNT,
                submission_probability: fighter1Subs.length / this.SIMULATION_COUNT,
                decision_probability: fighter1Decisions.length / this.SIMULATION_COUNT
            },
            fighter2: {
                fighter_id: matchup.fighter2_id,
                win_probability: fighter2Wins.length / this.SIMULATION_COUNT,
                ko_tko_probability: fighter2KOTKOs.length / this.SIMULATION_COUNT,
                submission_probability: fighter2Subs.length / this.SIMULATION_COUNT,
                decision_probability: fighter2Decisions.length / this.SIMULATION_COUNT
            },
            confidence_score: this.calculateConfidenceScore(results),
            simulation_count: this.SIMULATION_COUNT,
            created_at: new Date()
        };
    }

    private simulateFight(
        fighter1Attrs: FighterAttributes,
        fighter2Attrs: FighterAttributes
    ): SimulationResult {
        for (let round = 1; round <= 5; round++) {
            const roundResult = this.simulateRound(fighter1Attrs, fighter2Attrs, round);
            if (roundResult) {
                return roundResult;
            }
        }

        // If no finish, simulate decision
        return this.simulateDecision(fighter1Attrs, fighter2Attrs);
    }

    private async getFighterStrikingStats(fighterId: string): Promise<StrikingStats[]> {
        const query = `
            SELECT * FROM striking_stats 
            WHERE fighter_id = $1 
            ORDER BY TO_TIMESTAMP(date, 'YYYY-MM-DD') DESC 
            LIMIT 10
        `;
        const result = await this.pool.query(query, [fighterId]);
        return result.rows;
    }

    private async getFighterGroundStats(fighterId: string): Promise<GroundStats[]> {
        const query = `
            SELECT * FROM ground_stats 
            WHERE fighter_id = $1 
            ORDER BY TO_TIMESTAMP(date, 'YYYY-MM-DD') DESC 
            LIMIT 10
        `;
        const result = await this.pool.query(query, [fighterId]);
        return result.rows;
    }

    private async getFighterClinchStats(fighterId: string): Promise<ClinchStats[]> {
        const query = `
            SELECT * FROM clinch_stats 
            WHERE fighter_id = $1 
            ORDER BY TO_TIMESTAMP(date, 'YYYY-MM-DD') DESC 
            LIMIT 10
        `;
        const result = await this.pool.query(query, [fighterId]);
        return result.rows;
    }

    private async getFighterFightHistory(fighterId: string): Promise<Fight[]> {
        const query = `
            SELECT * FROM fights 
            WHERE fighter_id = $1 
            ORDER BY TO_TIMESTAMP(date, 'YYYY-MM-DD') DESC 
            LIMIT 10
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

        const fighter1KOTKOs = fighter1Wins.filter(r => r.method === 'KO/TKO');
        const fighter1Subs = fighter1Wins.filter(r => r.method === 'Submission');
        const fighter1Decisions = fighter1Wins.filter(r => r.method === 'Decision');

        const fighter2KOTKOs = fighter2Wins.filter(r => r.method === 'KO/TKO');
        const fighter2Subs = fighter2Wins.filter(r => r.method === 'Submission');
        const fighter2Decisions = fighter2Wins.filter(r => r.method === 'Decision');

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

        await this.pool.query(query, [
            uuidv4(),
            matchupId,
            matchup.fighter1_id,
            matchup.fighter2_id,
            fighter1Wins.length / this.SIMULATION_COUNT,
            fighter2Wins.length / this.SIMULATION_COUNT,
            fighter1KOTKOs.length / this.SIMULATION_COUNT,
            fighter1Subs.length / this.SIMULATION_COUNT,
            fighter1Decisions.length / this.SIMULATION_COUNT,
            fighter2KOTKOs.length / this.SIMULATION_COUNT,
            fighter2Subs.length / this.SIMULATION_COUNT,
            fighter2Decisions.length / this.SIMULATION_COUNT,
            this.SIMULATION_COUNT,
            this.calculateConfidenceScore(results)
        ]);
    }

    private calculateStrikingOffenseRating(stats: StrikingStats[]): number {
        if (!stats.length) return 50;

        // Calculate average striking accuracy, safely parsing string values
        const accuracies = stats.map(stat => {
            const landed = parseInt(stat.tsl || '0');
            const attempted = parseInt(stat.tsa || '0');
            return attempted > 0 ? (landed / attempted) * 100 : 0;
        }).filter(acc => !isNaN(acc));

        // Calculate knockdown rate
        const kdRates = stats.map(stat => 
            parseInt(stat.kd || '0')
        ).filter(kd => !isNaN(kd));
        
        // Calculate significant strikes per minute
        const strikesPerMinute = stats.map(stat => 
            parseInt(stat.tsl || '0') / 5
        ).filter(spm => !isNaN(spm));

        if (!accuracies.length || !kdRates.length || !strikesPerMinute.length) return 50;

        const avgAccuracy = this.calculateAverage(accuracies);
        const avgKdRate = this.calculateAverage(kdRates);
        const avgStrikesPerMin = this.calculateAverage(strikesPerMinute);

        return this.normalizeRating(
            (avgAccuracy * 0.4) + 
            (avgKdRate * 20 * 0.3) + 
            (avgStrikesPerMin * 2 * 0.3)
        );
    }

    private calculateStrikingDefenseRating(stats: StrikingStats[]): number {
        if (!stats.length) return 50;

        const defenseRates = stats.map(stat => {
            const opponentLanded = parseInt(stat.ssa || '0');
            const opponentAttempted = parseInt(stat.tsa || '0');
            return opponentAttempted > 0 ? 
                ((opponentAttempted - opponentLanded) / opponentAttempted) * 100 : 0;
        }).filter(rate => !isNaN(rate));

        const kdsReceived = stats.map(stat => 
            parseInt(stat.kd || '0')
        ).filter(kd => !isNaN(kd));

        if (!defenseRates.length || !kdsReceived.length) return 50;

        const avgDefense = this.calculateAverage(defenseRates);
        const avgKdsReceived = this.calculateAverage(kdsReceived);

        return this.normalizeRating(
            (avgDefense * 0.7) + 
            ((1 - avgKdsReceived) * 30 * 0.3)
        );
    }

    private calculateTakedownOffenseRating(stats: ClinchStats[]): number {
        if (!stats.length) return 50;

        const tdRates = stats.map(stat => {
            const landed = parseInt(stat.tdl || '0');
            const attempted = parseInt(stat.tda || '0');
            return attempted > 0 ? (landed / attempted) * 100 : 0;
        }).filter(rate => !isNaN(rate));

        const tdVolume = stats.map(stat => 
            parseInt(stat.tdl || '0')
        ).filter(td => !isNaN(td));

        if (!tdRates.length || !tdVolume.length) return 50;

        const avgTdRate = this.calculateAverage(tdRates);
        const avgTdVolume = this.calculateAverage(tdVolume);

        return this.normalizeRating(
            (avgTdRate * 0.6) + 
            (avgTdVolume * 10 * 0.4)
        );
    }

    private calculateTakedownDefenseRating(stats: ClinchStats[]): number {
        if (!stats.length) return 50;

        // Calculate takedown defense rate
        const tdDefenseRates = stats.map(stat => {
            const defended = parseInt(stat.tds);
            const attempted = parseInt(stat.tda);
            return (defended / attempted) * 100;
        });

        return this.normalizeRating(this.calculateAverage(tdDefenseRates));
    }

    private calculateSubmissionOffenseRating(
        groundStats: GroundStats[], 
        fightHistory: Fight[]
    ): number {
        if (!groundStats.length || !fightHistory.length) return 50;

        // Calculate submission attempt rate
        const subAttempts = groundStats.map(stat => parseInt(stat.sm));
        
        // Calculate submission success rate from fight history
        const subWins = fightHistory.filter(fight => 
            fight.result.toLowerCase().includes('submission')
        ).length;

        const avgSubAttempts = this.calculateAverage(subAttempts);
        const subWinRate = (subWins / fightHistory.length) * 100;

        return this.normalizeRating(
            (avgSubAttempts * 5 * 0.4) + 
            (subWinRate * 0.6)
        );
    }

    private calculateSubmissionDefenseRating(
        groundStats: GroundStats[],
        fightHistory: Fight[]
    ): number {
        if (!groundStats.length || !fightHistory.length) return 50;

        // Calculate submission defense from fight history
        const subLosses = fightHistory.filter(fight => 
            fight.result.toLowerCase().includes('submission') && 
            !fight.result.toLowerCase().includes('win')
        ).length;

        const subDefenseRate = ((fightHistory.length - subLosses) / fightHistory.length) * 100;

        return this.normalizeRating(subDefenseRate);
    }

    private calculateCardioRating(fightHistory: Fight[]): number {
        if (!fightHistory.length) return 50;

        const fightDurations = fightHistory.map(fight => {
            const round = parseInt(fight.rnd || '0');
            if (isNaN(round)) return 0;

            const [minutes, seconds] = (fight.time || '0:0').split(':').map(Number);
            if (isNaN(minutes) || isNaN(seconds)) return 0;

            return (round - 1) * 5 + minutes + (seconds / 60);
        }).filter(duration => duration > 0);

        const lateRoundWins = fightHistory.filter(fight => {
            const round = parseInt(fight.rnd || '0');
            return !isNaN(round) && 
                   round >= 3 && 
                   fight.result.toLowerCase().includes('win');
        }).length;

        if (!fightDurations.length) return 50;

        const avgDuration = this.calculateAverage(fightDurations);
        const lateRoundWinRate = (lateRoundWins / fightHistory.length) * 100;

        return this.normalizeRating(
            (Math.min(avgDuration / 15 * 100, 100) * 0.6) + 
            (lateRoundWinRate * 0.4)
        );
    }

    private calculateChinRating(
        fightHistory: Fight[],
        strikingStats: StrikingStats[]
    ): number {
        if (!fightHistory.length) return 50;

        // Calculate KO/TKO loss rate
        const koLosses = fightHistory.filter(fight => 
            fight.result.toLowerCase().includes('ko') && 
            !fight.result.toLowerCase().includes('win')
        ).length;

        const koLossRate = ((fightHistory.length - koLosses) / fightHistory.length) * 100;

        // Consider significant strikes absorbed
        const strikesAbsorbed = strikingStats.map(stat => parseInt(stat.ssa));
        const avgStrikesAbsorbed = this.calculateAverage(strikesAbsorbed);

        return this.normalizeRating(
            (koLossRate * 0.7) + 
            (Math.max(100 - (avgStrikesAbsorbed * 2), 0) * 0.3)
        );
    }

    private calculateAverage(numbers: number[]): number {
        if (!numbers.length) return 0;
        const validNumbers = numbers.filter(n => !isNaN(n));
        return validNumbers.length ? 
            validNumbers.reduce((a, b) => a + b, 0) / validNumbers.length : 0;
    }

    private normalizeRating(value: number): number {
        return Math.min(Math.max(Math.round(value), 0), 100);
    }

    private calculateConfidenceScore(results: SimulationResult[]): number {
        // Calculate how consistent the simulation results are
        const fighter1Wins = results.filter(r => r.winner === 'fighter1').length;
        const fighter2Wins = this.SIMULATION_COUNT - fighter1Wins;
        
        // The closer to 50/50, the lower the confidence
        const winRatio = Math.abs(0.5 - (fighter1Wins / this.SIMULATION_COUNT));
        
        // Convert to 0-100 scale
        return this.normalizeRating(winRatio * 200);
    }

    private simulateStrikingExchange(
        fighter1Attrs: FighterAttributes,
        fighter2Attrs: FighterAttributes
    ): StrikingExchange {
        // Calculate effective striking ratings considering both offense and defense
        const fighter1Effective = (fighter1Attrs.strikingOffense * 0.7) + 
                                (100 - fighter2Attrs.strikingDefense * 0.3);
        const fighter2Effective = (fighter2Attrs.strikingOffense * 0.7) + 
                                (100 - fighter1Attrs.strikingDefense * 0.3);

        // Add some randomness to the exchange
        const fighter1Score = fighter1Effective * (0.8 + Math.random() * 0.4);
        const fighter2Score = fighter2Effective * (0.8 + Math.random() * 0.4);

        // Determine exchange winner
        const winner = fighter1Score > fighter2Score ? 'fighter1' : 'fighter2';
        
        // Calculate damage based on difference in scores and chin ratings
        const scoreDiff = Math.abs(fighter1Score - fighter2Score);
        const damage = scoreDiff * (winner === 'fighter1' ? 
            (100 - fighter2Attrs.chin) / 100 : 
            (100 - fighter1Attrs.chin) / 100
        );

        // Calculate knockdown probability based on damage and chin rating
        const knockdownProbability = Math.min(
            damage * (winner === 'fighter1' ? 
                (100 - fighter2Attrs.chin) : 
                (100 - fighter1Attrs.chin)
            ) / 10000,
            1
        );

        return {
            damage,
            knockdownProbability,
            winner
        };
    }

    private simulateGroundExchange(
        fighter1Attrs: FighterAttributes,
        fighter2Attrs: FighterAttributes
    ): GroundExchange {
        // Simulate takedown/position
        const fighter1TakedownScore = fighter1Attrs.takedownOffense * (0.8 + Math.random() * 0.4);
        const fighter2DefenseScore = fighter2Attrs.takedownDefense * (0.8 + Math.random() * 0.4);
        
        // Determine position
        let position: 'top' | 'bottom' | 'neutral';
        let winner: 'fighter1' | 'fighter2';
        
        if (fighter1TakedownScore > fighter2DefenseScore) {
            position = 'top';
            winner = 'fighter1';
        } else {
            position = 'neutral';
            winner = fighter2Attrs.takedownOffense > fighter1Attrs.takedownDefense ? 
                'fighter2' : 'fighter1';
        }

        // Calculate submission probability based on position and attributes
        let submissionProbability = 0;
        if (position === 'top' && winner === 'fighter1') {
            submissionProbability = (fighter1Attrs.submissionOffense * 0.7 + 
                (100 - fighter2Attrs.submissionDefense) * 0.3) / 400;
        } else if (position === 'top' && winner === 'fighter2') {
            submissionProbability = (fighter2Attrs.submissionOffense * 0.7 + 
                (100 - fighter1Attrs.submissionDefense) * 0.3) / 400;
        }

        return {
            submissionProbability,
            winner,
            position
        };
    }

    private calculateRoundResult(
        strikingExchange: StrikingExchange,
        groundExchange: GroundExchange,
        cardioFactor1: number,
        cardioFactor2: number
    ): SimulationResult | null {
        // Apply cardio factors to probabilities
        const adjustedKnockdownProb = strikingExchange.knockdownProbability * 
            (strikingExchange.winner === 'fighter1' ? cardioFactor1 / 100 : cardioFactor2 / 100);
        
        const adjustedSubmissionProb = groundExchange.submissionProbability * 
            (groundExchange.winner === 'fighter1' ? cardioFactor1 / 100 : cardioFactor2 / 100);

        // Random number to determine finish
        const random = Math.random();

        // Check for KO/TKO
        if (random < adjustedKnockdownProb) {
            return {
                winner: strikingExchange.winner,
                method: 'KO/TKO',
                round: Math.ceil(random * 5)
            };
        }

        // Check for Submission
        if (random < adjustedSubmissionProb) {
            return {
                winner: groundExchange.winner,
                method: 'Submission',
                round: Math.ceil(random * 5)
            };
        }

        // No finish this round
        return null;
    }

    private simulateDecision(
        fighter1Attrs: FighterAttributes,
        fighter2Attrs: FighterAttributes
    ): SimulationResult {
        // Calculate total effective offense considering all aspects
        const fighter1Score = (
            fighter1Attrs.strikingOffense * 0.4 +
            fighter1Attrs.takedownOffense * 0.3 +
            fighter1Attrs.cardio * 0.3
        ) * (0.8 + Math.random() * 0.4);

        const fighter2Score = (
            fighter2Attrs.strikingOffense * 0.4 +
            fighter2Attrs.takedownOffense * 0.3 +
            fighter2Attrs.cardio * 0.3
        ) * (0.8 + Math.random() * 0.4);

        return {
            winner: fighter1Score > fighter2Score ? 'fighter1' : 'fighter2',
            method: 'Decision',
            round: 5
        };
    }

    public async getLatestPrediction(matchupId: string): Promise<PredictionResult | null> {
        const query = `
            SELECT 
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
                confidence_score,
                simulation_count,
                created_at
            FROM fight_predictions
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

    private safeParseInt(value: string | null | undefined, defaultValue: number = 0): number {
        if (!value) return defaultValue;
        const parsed = parseInt(value);
        return isNaN(parsed) ? defaultValue : parsed;
    }
} 