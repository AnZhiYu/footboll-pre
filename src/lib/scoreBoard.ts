import type { BaseComboStrategy, MatchAnalysis, OutcomeOdds, ProbabilityTriplet, ScorePick, TotalGoalsOdds } from '../types';
import { getScoreLayers, getStrategyCandidates } from './combo';

export type ScoreSortKey = 'probability' | 'odds' | 'market' | 'value';
export type ScoreStrategyFilter = 'all' | 'mainline' | 'coverage' | 'highScore' | 'upset' | 'value';

export type ScoreBoardItem = {
  id: string;
  matchId: string;
  homeName: string;
  awayName: string;
  score: ScorePick;
  strategyKeys: ScoreStrategyFilter[];
  strategyLabels: string[];
};

export type SlipLegMode = 'score' | 'winner' | 'totalGoals' | undefined;

export type SelectedSlipScore = {
  mode: SlipLegMode;
};

export type SelectedSlipScores = Record<string, SelectedSlipScore>;

export type SlipMatchSummary = {
  matchId: string;
  winnerOdds?: OutcomeOdds;
  totalGoalsOdds?: TotalGoalsOdds[];
  modelWinnerProbabilities: ProbabilityTriplet;
  modelTotalGoalsProbabilities: Partial<Record<TotalGoalsOdds['goals'], number>>;
};

export type SlipCalculationInput = {
  item: ScoreBoardItem;
  mode: SlipLegMode;
};

type ScoreBoardOptions = {
  oddsOnly: boolean;
  strategy: ScoreStrategyFilter;
  sortKey: ScoreSortKey;
};

const STRATEGY_LABELS: Record<Exclude<ScoreStrategyFilter, 'all'>, string> = {
  mainline: '主推',
  coverage: '备选',
  highScore: '大比分',
  upset: '冷门防守',
  value: '赔率价值',
};

const STRATEGY_ORDER: Array<Exclude<ScoreStrategyFilter, 'all'>> = [
  'mainline',
  'coverage',
  'highScore',
  'upset',
  'value',
];

const strategyScoreLabels = (analysis: MatchAnalysis) => {
  const layers = getScoreLayers(analysis);
  const strategyEntries: Array<[Exclude<ScoreStrategyFilter, 'all'>, ScorePick[]]> = [
    ['mainline', layers.mainline],
    ['coverage', layers.coverage],
    ['highScore', getStrategyCandidates(analysis, 'highScore')],
    ['upset', layers.upset],
    ['value', getStrategyCandidates(analysis, 'value')],
  ];

  return new Map(strategyEntries.map(([strategy, picks]) => [strategy, new Set(picks.map((pick) => pick.label))]));
};

export const buildScoreBoardItems = (analyses: MatchAnalysis[]): ScoreBoardItem[] =>
  analyses.flatMap((analysis) => {
    const labelsByStrategy = strategyScoreLabels(analysis);

    return analysis.matrix.map((score) => {
      const strategyKeys = STRATEGY_ORDER.filter((strategy) => labelsByStrategy.get(strategy)?.has(score.label));
      const effectiveStrategyKeys = strategyKeys.length > 0 ? strategyKeys : (['coverage'] as ScoreStrategyFilter[]);
      return {
        id: `${analysis.matchId}:${score.label}`,
        matchId: analysis.matchId,
        homeName: analysis.homeName,
        awayName: analysis.awayName,
        score,
        strategyKeys: effectiveStrategyKeys,
        strategyLabels: effectiveStrategyKeys
          .filter((strategy): strategy is Exclude<ScoreStrategyFilter, 'all'> => strategy !== 'all')
          .map((strategy) => STRATEGY_LABELS[strategy]),
      };
    });
  });

const scoreSortValue = (item: ScoreBoardItem, sortKey: ScoreSortKey) => {
  if (sortKey === 'odds') {
    return item.score.odds ?? -1;
  }

  if (sortKey === 'market') {
    return item.score.normalizedImpliedProbability ?? -1;
  }

  if (sortKey === 'value') {
    return item.score.valueIndex ?? -1;
  }

  return item.score.probability;
};

const getScoreWinnerKey = (score: ScorePick): keyof ProbabilityTriplet => {
  if (score.homeGoals > score.awayGoals) {
    return 'teamAWin';
  }

  if (score.homeGoals < score.awayGoals) {
    return 'teamBWin';
  }

  return 'draw';
};

const getScoreTotalGoalsKey = (score: ScorePick): TotalGoalsOdds['goals'] => {
  const totalGoals = score.homeGoals + score.awayGoals;
  return totalGoals >= 7 ? '7+' : totalGoals;
};

export const calculateModelWinnerProbabilities = (scores: ScorePick[]): ProbabilityTriplet =>
  scores.reduce(
    (totals, score) => {
      totals[getScoreWinnerKey(score)] += score.probability;
      return totals;
    },
    { teamAWin: 0, draw: 0, teamBWin: 0 },
  );

export const calculateModelTotalGoalsProbabilities = (
  scores: ScorePick[],
): Partial<Record<TotalGoalsOdds['goals'], number>> =>
  scores.reduce<Partial<Record<TotalGoalsOdds['goals'], number>>>((totals, score) => {
    const key = getScoreTotalGoalsKey(score);
    totals[key] = (totals[key] ?? 0) + score.probability;
    return totals;
  }, {});

const getPositiveNumber = (value: number | undefined) =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;

export const getSlipLegMetrics = (
  item: ScoreBoardItem,
  mode: SlipLegMode,
  summaries: SlipMatchSummary[],
) => {
  if (mode === undefined) {
    return { probability: 1, odds: 1, estimated: false };
  }

  if (mode === 'score') {
    const probability = getPositiveNumber(item.score.probability) ?? 0;
    const odds = getPositiveNumber(item.score.odds) ?? (probability > 0 ? 1 / probability : undefined);
    return { probability, odds, estimated: item.score.odds === undefined };
  }

  if (mode === 'totalGoals') {
    const summary = summaries.find((candidate) => candidate.matchId === item.matchId);
    const totalGoalsKey = getScoreTotalGoalsKey(item.score);
    const totalGoalsOdd = summary?.totalGoalsOdds?.find((odd) => odd.goals === totalGoalsKey);
    const probability = getPositiveNumber(summary?.modelTotalGoalsProbabilities[totalGoalsKey]) ?? 0;
    const odds = getPositiveNumber(totalGoalsOdd?.odds) ?? (probability > 0 ? 1 / probability : undefined);
    return { probability, odds, estimated: totalGoalsOdd?.odds === undefined };
  }

  const summary = summaries.find((candidate) => candidate.matchId === item.matchId);
  const winnerKey = getScoreWinnerKey(item.score);
  const probability = getPositiveNumber(summary?.modelWinnerProbabilities[winnerKey]) ?? 0;
  const odds = getPositiveNumber(summary?.winnerOdds?.[winnerKey]) ?? (probability > 0 ? 1 / probability : undefined);
  return { probability, odds, estimated: summary?.winnerOdds?.[winnerKey] === undefined };
};

export const calculateSlipSummary = (
  legs: SlipCalculationInput[],
  summaries: SlipMatchSummary[],
) => {
  if (legs.length === 0) {
    return { totalOdds: 0, totalProbability: 0 };
  }

  return legs.reduce(
    (total, leg) => {
      const metrics = getSlipLegMetrics(leg.item, leg.mode, summaries);
      return {
        totalOdds: total.totalOdds * (metrics.odds ?? 0),
        totalProbability: total.totalProbability * metrics.probability,
      };
    },
    { totalOdds: 1, totalProbability: 1 },
  );
};

export const filterAndSortScoreBoardItems = (
  items: ScoreBoardItem[],
  options: ScoreBoardOptions,
): ScoreBoardItem[] => {
  const hasAnyOdds = items.some((item) => Boolean(item.score.odds));
  const oddsFiltered = options.oddsOnly && hasAnyOdds ? items.filter((item) => Boolean(item.score.odds)) : items;
  const strategyFiltered =
    options.strategy === 'all'
      ? oddsFiltered
      : oddsFiltered.filter((item) => item.strategyKeys.includes(options.strategy));

  return [...strategyFiltered].sort((a, b) => {
    const sortDiff =
      options.sortKey === 'odds'
        ? scoreSortValue(a, options.sortKey) - scoreSortValue(b, options.sortKey)
        : scoreSortValue(b, options.sortKey) - scoreSortValue(a, options.sortKey);
    if (sortDiff !== 0) {
      return sortDiff;
    }

    return b.score.probability - a.score.probability;
  });
};

export const toggleSelectedScore = (
  selectedScores: SelectedSlipScores,
  item: ScoreBoardItem,
): SelectedSlipScores => {
  const next = { ...selectedScores };
  if (next[item.id]) {
    delete next[item.id];
    return next;
  }

  next[item.id] = { mode: undefined };
  return next;
};

export const updateSelectedScoreMode = (
  selectedScores: SelectedSlipScores,
  itemId: string,
  mode: SlipLegMode,
): SelectedSlipScores =>
  selectedScores[itemId] ? { ...selectedScores, [itemId]: { mode } } : selectedScores;
