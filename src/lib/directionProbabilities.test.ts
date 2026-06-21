import { describe, expect, it } from 'vitest';
import type { MatchAnalysis, ScorePick } from '../types';
import {
  formatTotalGoalsLabel,
  getBttsProbabilities,
  getLeadingTotalGoalsProbabilities,
  getTotalGoalsProbabilities,
} from './directionProbabilities';

const pick = (label: string, probability: number): ScorePick => {
  const [homeGoals, awayGoals] = label.split('-').map(Number);

  return {
    homeGoals,
    awayGoals,
    probability,
    label,
    rank: 1,
  };
};

const analysis = (matrix: ScorePick[]): MatchAnalysis =>
  ({
    matchId: 'm1',
    homeName: '球队A',
    awayName: '球队B',
    paceRaw: 50,
    paceFactor: 1,
    homeLambda: 1.2,
    awayLambda: 1.1,
    matrix,
    mostLikely: matrix[0],
    highScore: matrix[0],
    lowScore: matrix[0],
    topScores: matrix.slice(0, 3),
  }) as MatchAnalysis;

describe('direction probabilities', () => {
  it('summarizes BTTS and total goals probabilities from score matrix', () => {
    const item = analysis([
      pick('1-1', 0.32),
      pick('2-1', 0.18),
      pick('1-0', 0.2),
      pick('0-2', 0.12),
      pick('4-3', 0.08),
      pick('5-4', 0.1),
    ]);

    const btts = getBttsProbabilities(item);
    expect(btts.yes).toBeCloseTo(0.68);
    expect(btts.no).toBeCloseTo(0.32);

    const totalGoals = getTotalGoalsProbabilities(item);
    expect(totalGoals.find((entry) => entry.goals === 1)?.probability).toBeCloseTo(0.2);
    expect(totalGoals.find((entry) => entry.goals === 2)?.probability).toBeCloseTo(0.44);
    expect(totalGoals.find((entry) => entry.goals === 3)?.probability).toBeCloseTo(0.18);
    expect(totalGoals.find((entry) => entry.goals === '7+')?.probability).toBeCloseTo(0.18);
    expect(getLeadingTotalGoalsProbabilities(item, 3).map((entry) => entry.goals)).toEqual([2, 1, 3]);
    expect(formatTotalGoalsLabel('7+')).toBe('7+');
    expect(formatTotalGoalsLabel(3)).toBe('3球');
  });
});
