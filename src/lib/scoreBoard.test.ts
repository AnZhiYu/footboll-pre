import { describe, expect, it } from 'vitest';
import type { MatchAnalysis } from '../types';
import {
  buildScoreBoardItems,
  calculateSlipSummary,
  filterAndSortScoreBoardItems,
  toggleSelectedScore,
} from './scoreBoard';

const analysis = (odds = true): MatchAnalysis => ({
  matchId: 'm1',
  homeName: '捷克',
  awayName: '南非',
  paceRaw: 55,
  paceFactor: 1,
  homeLambda: 1.2,
  awayLambda: 1,
  mostLikely: { homeGoals: 1, awayGoals: 0, probability: 0.18, label: '1-0', rank: 1 },
  highScore: { homeGoals: 3, awayGoals: 1, probability: 0.05, label: '3-1', rank: 5 },
  lowScore: { homeGoals: 1, awayGoals: 0, probability: 0.18, label: '1-0', rank: 1 },
  topScores: [],
  matrix: [
    { homeGoals: 1, awayGoals: 0, probability: 0.18, label: '1-0', rank: 1, ...(odds ? { odds: 6.6, normalizedImpliedProbability: 0.16, valueIndex: 1.13 } : {}) },
    { homeGoals: 1, awayGoals: 1, probability: 0.15, label: '1-1', rank: 2, ...(odds ? { odds: 7, normalizedImpliedProbability: 0.13, valueIndex: 1.15 } : {}) },
    { homeGoals: 2, awayGoals: 1, probability: 0.08, label: '2-1', rank: 4, ...(odds ? { odds: 10, normalizedImpliedProbability: 0.08, valueIndex: 1 } : {}) },
    { homeGoals: 3, awayGoals: 1, probability: 0.05, label: '3-1', rank: 5, ...(odds ? { odds: 22, normalizedImpliedProbability: 0.03, valueIndex: 1.67 } : {}) },
    { homeGoals: 4, awayGoals: 1, probability: 0.025, label: '4-1', rank: 9, ...(odds ? { odds: 35, normalizedImpliedProbability: 0.01, valueIndex: 2.5 } : {}) },
  ],
});

describe('score board', () => {
  it('builds flat score board items with strategy labels', () => {
    const items = buildScoreBoardItems([analysis()]);

    expect(items.map((item) => item.score.label)).toContain('1-0');
    expect(items.find((item) => item.score.label === '1-0')?.strategyLabels).toContain('主线');
    expect(items.find((item) => item.score.label === '3-1')?.strategyLabels).toContain('大比分');
    expect(items.find((item) => item.score.label === '4-1')?.strategyLabels).toContain('赔率价值');
  });

  it('filters odds scores and falls back to model scores when no odds exist', () => {
    expect(filterAndSortScoreBoardItems(buildScoreBoardItems([analysis()]), { oddsOnly: true, strategy: 'all', sortKey: 'odds' })).toHaveLength(5);
    expect(filterAndSortScoreBoardItems(buildScoreBoardItems([analysis(false)]), { oddsOnly: true, strategy: 'all', sortKey: 'odds' })).toHaveLength(5);
  });

  it('sorts by odds ascending and other score metrics descending', () => {
    const items = buildScoreBoardItems([analysis()]);

    expect(filterAndSortScoreBoardItems(items, { oddsOnly: true, strategy: 'all', sortKey: 'odds' })[0].score.label).toBe('1-0');
    expect(filterAndSortScoreBoardItems(items, { oddsOnly: true, strategy: 'all', sortKey: 'market' })[0].score.label).toBe('1-0');
    expect(filterAndSortScoreBoardItems(items, { oddsOnly: true, strategy: 'all', sortKey: 'value' })[0].score.label).toBe('4-1');
    expect(filterAndSortScoreBoardItems(items, { oddsOnly: true, strategy: 'all', sortKey: 'probability' })[0].score.label).toBe('1-0');
  });

  it('filters by strategy and toggles multiple selected scores per match', () => {
    const items = buildScoreBoardItems([analysis()]);
    const highScores = filterAndSortScoreBoardItems(items, { oddsOnly: true, strategy: 'highScore', sortKey: 'probability' });

    expect(highScores.every((item) => item.strategyKeys.includes('highScore'))).toBe(true);
    expect(toggleSelectedScore({}, items[0])).toEqual({ 'm1:1-0': { mode: undefined } });
    expect(toggleSelectedScore({ 'm1:1-0': { mode: 'score' } }, items[3])).toEqual({
      'm1:1-0': { mode: 'score' },
      'm1:3-1': { mode: undefined },
    });
    expect(toggleSelectedScore({ 'm1:1-0': { mode: 'score' } }, items[0])).toEqual({});
  });

  it('calculates total odds and probability from selected score or winner modes only', () => {
    const items = buildScoreBoardItems([analysis()]);
    const summary = calculateSlipSummary(
      [
        { item: items.find((item) => item.score.label === '1-0')!, mode: 'score' },
        { item: items.find((item) => item.score.label === '4-1')!, mode: 'winner' },
        { item: items.find((item) => item.score.label === '1-1')!, mode: undefined },
      ],
      [
        {
          matchId: 'm1',
          winnerOdds: { teamAWin: 2.2, draw: 3.2, teamBWin: 3.4 },
          modelWinnerProbabilities: { teamAWin: 0.55, draw: 0.25, teamBWin: 0.2 },
        },
      ],
    );

    expect(summary.totalOdds).toBeCloseTo(6.6 * 2.2, 6);
    expect(summary.totalProbability).toBeCloseTo(0.18 * 0.55, 6);
  });
});
