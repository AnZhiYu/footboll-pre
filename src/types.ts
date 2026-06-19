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
  odds?: MatchOdds;
};

export type OddsSource = 'manual' | 'imported' | 'scraped';

export type OutcomeOdds = {
  teamAWin?: number;
  draw?: number;
  teamBWin?: number;
};

export type CorrectScoreOdd = {
  score: string;
  odds: number;
  status?: 'open' | 'closed';
};

export type TotalGoalsOdds = {
  goals: number | '7+';
  odds: number;
  status?: 'open' | 'closed';
};

export type MatchOdds = {
  source?: OddsSource;
  updatedAt?: string;
  winner?: OutcomeOdds;
  correctScores?: CorrectScoreOdd[];
  totalGoals?: TotalGoalsOdds[];
};

export type TeamProfile = TeamStats & {
  team: string;
};

export type MatchPack = {
  id: string;
  label: string;
  matches: [TeamProfile, TeamProfile][];
  odds: {
    teamA: string;
    teamB: string;
    odds: MatchOdds;
  }[];
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
  | 'value'
  | 'mixed';

export type ComboStrategy = BaseComboStrategy | 'random';

export type MatchOverride = {
  strategy?: BaseComboStrategy;
  enabledMarkets?: DirectionMarket[];
};

export type ScorePick = {
  homeGoals: number;
  awayGoals: number;
  probability: number;
  label: string;
  rank: number;
  odds?: number;
  impliedProbability?: number;
  normalizedImpliedProbability?: number;
  valueIndex?: number;
  expectedReturn?: number;
};

export type ProbabilityTriplet = {
  teamAWin: number;
  draw: number;
  teamBWin: number;
};

export type MatchOddsSummary = {
  correctScoreCount: number;
  winner?: {
    model: ProbabilityTriplet;
    market: ProbabilityTriplet;
    values: ProbabilityTriplet;
    verdict: string;
  };
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
  oddsSummary?: MatchOddsSummary;
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
  matchOverrides: Record<string, MatchOverride>;
  useOddsData: boolean;
};

export type DirectionMarket = 'winner' | 'overUnder25' | 'btts' | 'totalGoals';

export type AppState = {
  version: number;
  lastUpdated: string;
  teamPool: TeamProfile[];
  matchPool: Match[];
  uiState: UiState;
};
