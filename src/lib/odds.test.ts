import { describe, expect, it } from 'vitest';
import type { Match } from '../types';
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
  });
});
