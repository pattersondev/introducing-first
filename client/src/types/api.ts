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
  fight_id: string;
  matchup_id: string | null;
  date: string;
  opponent: string;
  opponent_name: string;
  event: string;
  result: string;
  decision: string;
  rnd: number;
  time: string;
}

export interface StrikingStat {
  striking_stat_id: string;
  opponent: string;
  event: string;
  result: string;
  sdbl_a: string;
  sdhl_a: string;
  sdll_a: string;
  tsl: number;
  tsa: number;
  ssl: number;
  ssa: number;
  tsl_tsa_perc: number;
  kd: number;
  body_perc: number;
  head_perc: number;
  leg_perc: number;
}

export interface ClinchStat {
  clinch_stat_id: string;
  opponent: string;
  event: string;
  result: string;
  scbl: number;
  scba: number;
  schl: number;
  scha: number;
  scll: number;
  scla: number;
  rv: number;
  sr: number;
  tdl: number;
  tda: number;
  tds: number;
  tk_acc_perc: number;
}

export interface GroundStat {
  ground_stat_id: string;
  opponent: string;
  event: string;
  result: string;
  sgbl: number;
  sgba: number;
  sghl: number;
  sgha: number;
  sgll: number;
  sgla: number;
  ad: number;
  adtb: number;
  adhg: number;
  adtm: number;
  adts: number;
  sm: number;
}

export interface DetailedFighter extends Fighter {
  fights: Fight[];
  striking_stats: StrikingStat[];
  clinch_stats: ClinchStat[];
  ground_stats: GroundStat[];
}