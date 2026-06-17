export type TeamStats = {
  attack: number;
  defense: number;
  stability: number;
  pace?: number;
};

export type Match = {
  id: string;
  homeName: string;
  awayName: string;
  homeStats: TeamStats;
  awayStats: TeamStats;
};

export type TeamProfile = TeamStats & {
  team: string;
};

export type BaseComboStrategy =
  | 'safe'
  | 'balanced'
  | 'underdog'
  | 'goals'
  | 'highScore'
  | 'mainline'
  | 'coverage'
  | 'upset'
  | 'mixed';

export type ComboStrategy = BaseComboStrategy | 'random';

export type ScorePick = {
  homeGoals: number;
  awayGoals: number;
  probability: number;
  label: string;
  rank: number;
};

export type MatchAnalysis = {
  matchId: string;
  homeName: string;
  awayName: string;
  paceRaw: number;
  paceFactor: number;
  homeLambda: number;
  awayLambda: number;
  matrix: ScorePick[];
  mostLikely: ScorePick;
  highScore: ScorePick;
  lowScore: ScorePick;
  topScores: ScorePick[];
};

export type ComboPlanPick = {
  matchId: string;
  homeName: string;
  awayName: string;
  score: ScorePick;
  strategyUsed: BaseComboStrategy;
};

export type ComboPlan = {
  id: string;
  picks: ComboPlanPick[];
  jointProbability: number;
};

export type ComboGroup = {
  id: string;
  matches: MatchAnalysis[];
  plans: ComboPlan[];
  bestJointProbability: number;
};

export type UiState = {
  selectedMatchIds: string[];
  comboType: number;
  strategy: ComboStrategy;
  randomSeed: number;
  enabledMarkets: DirectionMarket[];
};

export type DirectionMarket = 'winner' | 'overUnder25' | 'btts';

export type AppState = {
  version: number;
  lastUpdated: string;
  teamPool: TeamProfile[];
  matchPool: Match[];
  uiState: UiState;
};
