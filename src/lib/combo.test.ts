import { describe, expect, it } from 'vitest';
import type { MatchAnalysis } from '../types';
import { buildComboGroups, combinations, getScoreLayers, getStrategyCandidates } from './combo';

const analysis = (id: string, probabilities: number[]): MatchAnalysis => ({
  matchId: id,
  homeName: `球队A${id}`,
  awayName: `球队B${id}`,
  paceFactor: 1,
  paceRaw: 55,
  homeLambda: 1.2,
  awayLambda: 1.2,
  mostLikely: { homeGoals: 1, awayGoals: 1, probability: probabilities[0], label: '1-1', rank: 1 },
  highScore: { homeGoals: 3, awayGoals: 1, probability: 0.03, label: '3-1', rank: 8 },
  lowScore: { homeGoals: 1, awayGoals: 0, probability: 0.08, label: '1-0', rank: 2 },
  topScores: [],
  matrix: probabilities.map((probability, index) => {
    const score = [
      [1, 1],
      [1, 0],
      [0, 1],
      [2, 1],
      [1, 2],
      [2, 2],
      [3, 1],
      [4, 0],
      [3, 2],
      [4, 1],
      [5, 0],
      [0, 4],
      [0, 0],
      [2, 0],
    ][index] ?? [index % 8, Math.floor(index / 8)];

    return {
      homeGoals: score[0],
      awayGoals: score[1],
      probability,
      label: `${score[0]}-${score[1]}`,
      rank: index + 1,
    };
  }),
});

const analyses = [
  analysis('1', [0.2, 0.16, 0.14, 0.1, 0.08, 0.07, 0.05, 0.04, 0.03, 0.02, 0.01, 0.009]),
  analysis('2', [0.18, 0.15, 0.13, 0.09, 0.07, 0.06, 0.05, 0.03, 0.02, 0.01, 0.009, 0.008]),
  analysis('3', [0.22, 0.17, 0.12, 0.08, 0.07, 0.05, 0.04, 0.03, 0.02, 0.01, 0.009, 0.008]),
  analysis('4', [0.19, 0.16, 0.11, 0.09, 0.08, 0.05, 0.04, 0.02, 0.01, 0.009, 0.008, 0.007]),
  analysis('5', [0.21, 0.14, 0.12, 0.1, 0.07, 0.05, 0.03, 0.02, 0.01, 0.009, 0.008, 0.007]),
];

describe('combo generator', () => {
  it('returns standard n choose m combinations', () => {
    expect(combinations(['a', 'b', 'c', 'd'], 3)).toHaveLength(4);
    expect(combinations(['a', 'b', 'c', 'd', 'e'], 5)).toEqual([['a', 'b', 'c', 'd', 'e']]);
  });

  it('selects strategy candidate pools deterministically', () => {
    expect(getStrategyCandidates(analyses[0], 'safe').map((pick) => pick.rank)).toEqual([1]);
    expect(getStrategyCandidates(analyses[0], 'mainline').map((pick) => pick.rank)).toEqual([1, 2]);
    expect(getStrategyCandidates(analyses[0], 'balanced').map((pick) => pick.rank)).toEqual([1, 2, 3]);
    expect(getStrategyCandidates(analyses[0], 'coverage').map((pick) => pick.label)).toEqual([
      '1-1',
      '1-0',
      '0-1',
      '2-1',
      '1-2',
    ]);
    expect(getStrategyCandidates(analyses[0], 'goals').map((pick) => pick.label)).toEqual([
      '1-1',
      '1-0',
      '0-1',
      '2-1',
      '1-2',
      '2-2',
      '3-1',
      '4-0',
      '3-2',
      '4-1',
    ]);
    expect(getStrategyCandidates(analyses[0], 'upset').map((pick) => pick.label)).toEqual([
      '2-1',
      '1-2',
      '2-2',
      '3-1',
      '4-0',
    ]);
    expect(getStrategyCandidates(analyses[0], 'highScore').every((pick) => pick.homeGoals + pick.awayGoals >= 3)).toBe(
      true,
    );
    expect(getStrategyCandidates(analyses[0], 'highScore').map((pick) => pick.label)).toEqual([
      '2-1',
      '1-2',
      '2-2',
      '3-1',
      '4-0',
      '3-2',
      '4-1',
      '5-0',
    ]);

    const underdog = getStrategyCandidates(analyses[0], 'underdog');
    expect(underdog.map((pick) => pick.label)).toContain('2-1');
    expect(underdog.map((pick) => pick.label)).toContain('3-1');
    expect(new Set(underdog.map((pick) => pick.label)).size).toBe(underdog.length);
    expect(underdog.length).toBeLessThanOrEqual(8);
  });

  it('builds score layers for each match', () => {
    const layers = getScoreLayers(analyses[0]);

    expect(layers.mainline.map((pick) => pick.label)).toEqual(['1-1', '1-0']);
    expect(layers.coverage.map((pick) => pick.label)).toEqual(['1-1', '1-0', '0-1', '2-1', '1-2']);
    expect(layers.upset.map((pick) => pick.label)).toEqual(['2-1', '1-2', '2-2', '3-1', '4-0']);
    expect(layers.mixed.map((pick) => pick.label)).toEqual(['1-1', '1-0', '0-1', '2-1', '1-2', '2-2']);
  });

  it('builds 5x1 groups and keeps top plans sorted inside each group', () => {
    const groups = buildComboGroups(analyses, 5, 'coverage');

    expect(groups).toHaveLength(1);
    expect(groups[0].matches).toHaveLength(5);
    expect(groups[0].plans).toHaveLength(5);
    expect(groups[0].plans[0].jointProbability).toBeGreaterThanOrEqual(groups[0].plans[1].jointProbability);
  });

  it('sorts large combo groups by their best plan probability', () => {
    const groups = buildComboGroups(analyses.slice(0, 4), 2, 'safe');

    expect(groups).toHaveLength(6);
    expect(groups[0].bestJointProbability).toBeGreaterThanOrEqual(groups[1].bestJointProbability);
  });

  it('keeps random strategy stable for the same seed', () => {
    const first = buildComboGroups(analyses.slice(0, 3), 3, 'random', 12);
    const second = buildComboGroups(analyses.slice(0, 3), 3, 'random', 12);

    expect(first[0].plans[0].picks.map((pick) => pick.strategyUsed)).toEqual(
      second[0].plans[0].picks.map((pick) => pick.strategyUsed),
    );
  });

  it('can change random strategy assignments when the seed changes', () => {
    const first = buildComboGroups(analyses.slice(0, 3), 3, 'random', 12);
    const second = buildComboGroups(analyses.slice(0, 3), 3, 'random', 13);

    expect(first[0].plans[0].picks.map((pick) => pick.strategyUsed)).not.toEqual(
      second[0].plans[0].picks.map((pick) => pick.strategyUsed),
    );
  });

  it('can use different strategies for different matches in the same random combo', () => {
    const groups = buildComboGroups(analyses.slice(0, 4), 4, 'random', 7);
    const strategies = new Set(groups[0].plans[0].picks.map((pick) => pick.strategyUsed));

    expect(strategies.size).toBeGreaterThan(1);
  });

  it('randomly assigns only layered strategy variants', () => {
    const groups = buildComboGroups(analyses.slice(0, 5), 5, 'random', 9);
    const strategies = new Set(groups[0].plans[0].picks.map((pick) => pick.strategyUsed));

    expect([...strategies].every((strategy) => ['mainline', 'coverage', 'upset', 'mixed'].includes(strategy))).toBe(
      true,
    );
    expect(strategies.size).toBeGreaterThan(1);
  });

  it('builds 20x1 coverage plans without expanding the full score cartesian product', () => {
    const manyAnalyses = Array.from({ length: 20 }, (_, index) =>
      analysis(`${index + 1}`, [0.2, 0.16, 0.14, 0.1, 0.08, 0.07, 0.05, 0.04]),
    );

    const startedAt = performance.now();
    const groups = buildComboGroups(manyAnalyses, 20, 'coverage');
    const duration = performance.now() - startedAt;

    expect(groups).toHaveLength(1);
    expect(groups[0].plans).toHaveLength(5);
    expect(groups[0].plans[0].picks).toHaveLength(20);
    expect(duration).toBeLessThan(100);
  });
});
