import { describe, expect, it } from 'vitest';
import type { Match } from '../types';
import { getMidOddsCandidateInsight } from './odds';
import { analyzeMatch } from './poisson';

const match: Match = {
  id: 'm_1',
  homeName: '捷克',
  awayName: '南非',
  homeStats: { attack: 63, defense: 66, stability: 61, pace: 53 },
  awayStats: { attack: 56, defense: 54, stability: 52, pace: 58 },
  odds: {
    correctScores: [
      { score: '1-0', odds: 6.6 },
      { score: '1-1', odds: 7 },
    ],
    winner: { teamAWin: 2.2, draw: 3.2, teamBWin: 3.4 },
  },
};

describe('odds analysis', () => {
  it('enriches score picks with odds, normalized market probability, and value metrics', () => {
    const analysis = analyzeMatch(match);
    const pick = analysis.matrix.find((score) => score.label === '1-0');

    expect(pick).toMatchObject({
      odds: 6.6,
    });
    expect(pick?.impliedProbability).toBeCloseTo(1 / 6.6, 6);
    expect(pick?.normalizedImpliedProbability).toBeGreaterThan(0);
    expect(pick?.valueIndex).toBeGreaterThan(0);
    expect(pick?.expectedReturn).toBeCloseTo((pick?.probability ?? 0) * 6.6, 6);
  });

  it('summarizes model winner probability against market winner probability', () => {
    const analysis = analyzeMatch(match);

    expect(analysis.oddsSummary?.winner).toMatchObject({
      model: {
        teamAWin: expect.any(Number),
        draw: expect.any(Number),
        teamBWin: expect.any(Number),
      },
      market: {
        teamAWin: expect.any(Number),
        draw: expect.any(Number),
        teamBWin: expect.any(Number),
      },
      verdict: expect.any(String),
    });
    expect(analysis.oddsSummary?.winner?.values.teamAWin).toBeGreaterThan(0);
  });

  it('identifies 7-15x middle-odds candidates when at least four conditions match', () => {
    const canadaMatch: Match = {
      id: 'm_2',
      homeName: '加拿大',
      awayName: '卡塔尔',
      homeStats: { attack: 66, defense: 60, stability: 62, pace: 64 },
      awayStats: { attack: 54, defense: 51, stability: 49, pace: 47 },
      odds: {
        winner: { teamAWin: 2.1, draw: 3.6, teamBWin: 3.7 },
      },
    };
    const analysis = analyzeMatch(canadaMatch);
    const insight = getMidOddsCandidateInsight(canadaMatch, analysis);

    expect(insight.matchedCount).toBeGreaterThanOrEqual(4);
    expect(insight.qualified).toBe(true);
    expect(insight.conditions).toHaveLength(7);
  });

  it('uses the configured popular teams as the betting heat condition', () => {
    const brazilMatch: Match = {
      id: 'm_3',
      homeName: '巴西',
      awayName: '摩洛哥',
      homeStats: { attack: 90, defense: 82, stability: 79, pace: 76 },
      awayStats: { attack: 77, defense: 84, stability: 86, pace: 60 },
      odds: {
        winner: { teamAWin: 1.95, draw: 3.25, teamBWin: 4.2 },
      },
    };
    const analysis = analyzeMatch(brazilMatch);
    const insight = getMidOddsCandidateInsight(brazilMatch, analysis);

    expect(insight.conditions.find((condition) => condition.key === 'popularHeat')).toMatchObject({
      matched: true,
      detail: '热门队伍: 巴西',
    });
  });
});
