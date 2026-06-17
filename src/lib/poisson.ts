import type { Match, MatchAnalysis, ScorePick } from '../types';

export const BASE_GOAL = 1.2;
export const MAX_GOALS = 10;
export const FACTORIALS = [1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800] as const;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const getPaceRating = (value: number | undefined) =>
  typeof value === 'number' && Number.isFinite(value) ? clamp(value, 0, 100) : 50;

export const getPaceFactor = (paceRaw: number) => {
  if (paceRaw < 40) return 0.8;
  if (paceRaw < 50) return 0.9;
  if (paceRaw < 60) return 1;
  if (paceRaw <= 70) return 1.1;
  return 1.2;
};

export const calculateExpectedGoals = (match: Match) => {
  const paceRaw = (getPaceRating(match.homeStats.pace) + getPaceRating(match.awayStats.pace)) / 2;
  const paceFactor = getPaceFactor(paceRaw);
  const homeLambda = clamp(
    (BASE_GOAL +
      (match.homeStats.attack - match.awayStats.defense) * 0.015 +
      (match.homeStats.stability - match.awayStats.stability) * 0.005) *
      paceFactor,
    0.2,
    5,
  );
  const awayLambda = clamp(
    (BASE_GOAL +
      (match.awayStats.attack - match.homeStats.defense) * 0.015 +
      (match.awayStats.stability - match.homeStats.stability) * 0.005) *
      paceFactor,
    0.2,
    5,
  );

  return { paceRaw, paceFactor, homeLambda, awayLambda };
};

const poissonProbability = (lambda: number, goals: number) =>
  (lambda ** goals * Math.exp(-lambda)) / FACTORIALS[goals];

export const createScoreMatrix = (homeLambda: number, awayLambda: number): ScorePick[] => {
  const homeProbabilities = Array.from({ length: MAX_GOALS + 1 }, (_, goals) =>
    poissonProbability(homeLambda, goals),
  );
  const awayProbabilities = Array.from({ length: MAX_GOALS + 1 }, (_, goals) =>
    poissonProbability(awayLambda, goals),
  );

  const matrix: ScorePick[] = [];
  for (let homeGoals = 0; homeGoals <= MAX_GOALS; homeGoals += 1) {
    for (let awayGoals = 0; awayGoals <= MAX_GOALS; awayGoals += 1) {
      matrix.push({
        homeGoals,
        awayGoals,
        probability: homeProbabilities[homeGoals] * awayProbabilities[awayGoals],
        label: `${homeGoals}-${awayGoals}`,
        rank: 0,
      });
    }
  }

  return matrix
    .sort((a, b) => b.probability - a.probability)
    .map((pick, index) => ({ ...pick, rank: index + 1 }));
};

const firstByTotalGoals = (matrix: ScorePick[], predicate: (totalGoals: number) => boolean) =>
  matrix.find((pick) => predicate(pick.homeGoals + pick.awayGoals)) ?? matrix[0];

export const analyzeMatch = (match: Match): MatchAnalysis => {
  const expectedGoals = calculateExpectedGoals(match);
  const matrix = createScoreMatrix(expectedGoals.homeLambda, expectedGoals.awayLambda);

  return {
    matchId: match.id,
    homeName: match.homeName,
    awayName: match.awayName,
    ...expectedGoals,
    matrix,
    mostLikely: matrix[0],
    highScore: firstByTotalGoals(matrix, (totalGoals) => totalGoals >= 4),
    lowScore: firstByTotalGoals(matrix, (totalGoals) => totalGoals <= 2),
    topScores: matrix.slice(0, 3),
  };
};
