export interface Matchup {
  Fighter1: string;
  Fighter2: string;
  Result: string;
  Winner: string;
}

export interface Event {
  Name: string;
  Date: string;
  Location: string;
  Matchups: Matchup[];
}