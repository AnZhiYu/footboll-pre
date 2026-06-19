import { describe, expect, it } from 'vitest';
import type { MatchAnalysis } from '../types';
import { getCorrectScoreTagMap } from './correctScoreTags';

const analysis = (): MatchAnalysis => ({
  matchId: 'm1',
  homeName: '捷克',
  awayName: '南非',
  paceRaw: 62,
  paceFactor: 1.1,
  homeLambda: 1.6,
  awayLambda: 1.2,
  mostLikely: { homeGoals: 1, awayGoals: 1, probability: 0.14, label: '1-1', rank: 1 },
  highScore: { homeGoals: 3, awayGoals: 1, probability: 0.06, label: '3-1', rank: 6 },
  lowScore: { homeGoals: 1, awayGoals: 0, probability: 0.12, label: '1-0', rank: 2 },
  topScores: [],
  matrix: [
    { homeGoals: 1, awayGoals: 1, probability: 0.14, label: '1-1', rank: 1, odds: 7, normalizedImpliedProbability: 0.14, valueIndex: 1 },
    { homeGoals: 1, awayGoals: 0, probability: 0.12, label: '1-0', rank: 2, odds: 6.6, normalizedImpliedProbability: 0.16, valueIndex: 0.75 },
    { homeGoals: 2, awayGoals: 1, probability: 0.1, label: '2-1', rank: 3, odds: 9.5, normalizedImpliedProbability: 0.11, valueIndex: 0.91 },
    { homeGoals: 2, awayGoals: 2, probability: 0.08, label: '2-2', rank: 4, odds: 14, normalizedImpliedProbability: 0.07, valueIndex: 1.14 },
    { homeGoals: 3, awayGoals: 1, probability: 0.06, label: '3-1', rank: 6, odds: 22, normalizedImpliedProbability: 0.04, valueIndex: 1.5 },
    { homeGoals: 4, awayGoals: 1, probability: 0.04, label: '4-1', rank: 9, odds: 34, normalizedImpliedProbability: 0.025, valueIndex: 1.6 },
    { homeGoals: 0, awayGoals: 2, probability: 0.025, label: '0-2', rank: 13, odds: 15, normalizedImpliedProbability: 0.06, valueIndex: 0.42 },
  ],
});

describe('correct score tags', () => {
  it('marks mainline, middle-odds, high-score, and value tags for correct score odds', () => {
    const tags = getCorrectScoreTagMap(analysis());

    expect(tags.get('1-1')?.map((tag) => tag.key)).toContain('mainline');
    expect(tags.get('2-1')?.map((tag) => tag.key)).toContain('mainline');
    expect(tags.get('2-2')?.map((tag) => tag.key)).toContain('middleOdds');
    expect(tags.get('2-1')?.map((tag) => tag.key)).toContain('reasonableNonHot');
    expect(tags.get('2-2')?.map((tag) => tag.key)).toContain('reasonableNonHot');
    expect(tags.get('1-1')?.map((tag) => tag.key)).not.toContain('reasonableNonHot');
    expect(tags.get('3-1')?.map((tag) => tag.key)).toContain('highScore');
    expect(tags.get('4-1')?.map((tag) => tag.key)).toContain('value');
    expect((tags.get('0-2') ?? []).map((tag) => tag.key)).not.toContain('middleOdds');
  });

  it('chooses exactly three value scores by blended value and odds score', () => {
    const tags = getCorrectScoreTagMap(analysis());
    const valueScores = [...tags.entries()]
      .filter(([, scoreTags]) => scoreTags.some((tag) => tag.key === 'value'))
      .map(([score]) => score);

    expect(valueScores).toHaveLength(3);
    expect(valueScores).toContain('4-1');
    expect(valueScores).toContain('3-1');
  });
});
