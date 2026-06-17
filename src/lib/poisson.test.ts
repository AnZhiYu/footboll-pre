import { describe, expect, it } from 'vitest';
import type { Match } from '../types';
import {
  analyzeMatch,
  calculateExpectedGoals,
  getPaceFactor,
} from './poisson';

const makeMatch = (overrides: Partial<Match> = {}): Match => ({
  id: 'm_test',
  homeName: '球队A',
  awayName: '球队B',
  homeStats: { attack: 70, defense: 70, stability: 70 },
  awayStats: { attack: 70, defense: 70, stability: 70 },
  ...overrides,
});

describe('poisson engine', () => {
  it('maps pace raw values to configured factors', () => {
    expect(getPaceFactor(39.9)).toBe(0.8);
    expect(getPaceFactor(45)).toBe(0.9);
    expect(getPaceFactor(55)).toBe(1);
    expect(getPaceFactor(65)).toBe(1.1);
    expect(getPaceFactor(70.1)).toBe(1.2);
  });

  it('uses team pace ratings first and treats missing pace as the neutral average', () => {
    expect(
      calculateExpectedGoals(
        makeMatch({
          homeStats: { attack: 70, defense: 70, stability: 70, pace: 75 },
          awayStats: { attack: 70, defense: 70, stability: 70, pace: 38 },
        }),
      ),
    ).toMatchObject({
      paceRaw: 56.5,
      paceFactor: 1,
    });

    expect(
      calculateExpectedGoals(
        makeMatch({
          homeStats: { attack: 70, defense: 70, stability: 70, pace: 72 },
          awayStats: { attack: 70, defense: 70, stability: 70 },
        }),
      ),
    ).toMatchObject({
      paceRaw: 61,
      paceFactor: 1.1,
    });
  });

  it('keeps home and away expected goals symmetric for equal teams', () => {
    const goals = calculateExpectedGoals(makeMatch());

    expect(goals.paceRaw).toBe(50);
    expect(goals.paceFactor).toBe(1);
    expect(goals.homeLambda).toBeCloseTo(goals.awayLambda, 8);
    expect(goals.homeLambda).toBeCloseTo(1.2, 2);
  });

  it('clamps expected goals to the safe range', () => {
    const extreme = calculateExpectedGoals(
      makeMatch({
        homeStats: { attack: 100, defense: 100, stability: 100 },
        awayStats: { attack: 0, defense: 0, stability: 0 },
      }),
    );

    expect(extreme.homeLambda).toBeLessThanOrEqual(5);
    expect(extreme.awayLambda).toBeGreaterThanOrEqual(0.2);
  });

  it('creates a finite 11x11 score matrix with ranked recommendations', () => {
    const analysis = analyzeMatch(makeMatch());

    expect(analysis.matrix).toHaveLength(121);
    expect(analysis.matrix.every((pick) => Number.isFinite(pick.probability))).toBe(true);
    expect(analysis.matrix[0].rank).toBe(1);
    expect(analysis.mostLikely.label).toMatch(/^\d-\d$/);
    expect(analysis.highScore.homeGoals + analysis.highScore.awayGoals).toBeGreaterThanOrEqual(4);
    expect(analysis.lowScore.homeGoals + analysis.lowScore.awayGoals).toBeLessThanOrEqual(2);
    expect(analysis.topScores).toHaveLength(3);
  });
});
