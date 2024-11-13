export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

export interface Event {
  event_id: string;
  name: string;
  date: string;
  location: string;
  matchups: Matchup[];
}

export interface Matchup {
  matchup_id: string;
  fighter1_id: string;
  fighter2_id: string;
  fighter1_name: string;
  fighter2_name: string;
  fighter1_image?: string;
  fighter2_image?: string;
  result: string;
  winner: string;
  display_order: number;
  fighter1_record?: string;
  fighter1_reach?: string;
  fighter1_stance?: string;
  fighter1_age?: number;
  fighter2_record?: string;
  fighter2_reach?: string;
  fighter2_stance?: string;
  fighter2_age?: number;
  fighter1_country?: string;
  fighter2_country?: string;
  fighter1_recent_fights?: Fight[];
  fighter2_recent_fights?: Fight[];
  prediction?: {
    fighter1_win_probability: number;
    fighter2_win_probability: number;
    fighter1_ko_tko_probability: number;
    fighter1_submission_probability: number;
    fighter1_decision_probability: number;
    fighter2_ko_tko_probability: number;
    fighter2_submission_probability: number;
    fighter2_decision_probability: number;
    confidence_score: number;
  };
}

export interface DetailedMatchup extends Matchup {
  fighter1_stats?: FighterStats;
  fighter2_stats?: FighterStats;
}

export interface FighterStats {
  record: string;
  reach: string;
  stance: string;
  age: number;
  striking_accuracy?: number;
  takedown_accuracy?: number;
}

export interface Fighter {
  fighter_id: string;
  first_name: string;
  last_name: string;
  height: number;
  weight: number;
  birthdate: string;
  age: number;
  team: string;
  nickname: string;
  stance: string;
  win_loss_record: string;
  tko_record: string;
  sub_record: string;
  country: string;
  reach: string;
  image_url?: string;
}

// export interface FighterAnalytics {
//   style: FightingStyle;
//   finishingTendency: FinishingTendency;
//   roundPerformance: RoundPerformance;
//   defensiveEfficiency: DefensiveEfficiency;
//   recoveryAbility: RecoveryAbility;
//   momentum: Momentum;
//   styleEvolution: StyleEvolution;
//   careerPhases: CareerPhases;
// }

// Add other specific analytics interfaces as needed
export interface FightingStyle {
  striker: number;
  grappler: number;
  wrestler: number;
  // ... other style metrics
}

// ... other analytics interfaces 

export interface Fight {
  date: string;
  opponent: string;
  opponent_id?: string;
  event?: string;
  event_id?: string;
  result: string;
  decision: string;
  round: number;
  rnd?: number;
  time?: string;
}

export interface DetailedFighter extends Fighter {
  fights: Fight[];
}

// Add this interface for recent fights
export interface RecentFight {
  date: string;
  opponent: string;
  result: string;
  decision: string;
  round: number;
}

// Add these interfaces to your existing types
export interface AuthResponse {
  message: string;
}

export interface RegisterData {
  username: string;
  password: string;
  email: string;
  phone: string;
}

export interface LoginData {
  username: string;
  password: string;
}