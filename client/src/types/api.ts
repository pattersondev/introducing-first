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
  result: string;
  winner: string;
  display_order: number;
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
  event: string;
  result: string;
  decision: string;
  rnd: number;
  time: string;
}

export interface DetailedFighter extends Fighter {
  fights: Fight[];
}