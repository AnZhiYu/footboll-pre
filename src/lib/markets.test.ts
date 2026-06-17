import { describe, expect, it } from 'vitest';
import type { ScorePick } from '../types';
import { formatEnabledMarkets, getScoreMarkets } from './markets';

const score = (label: string): ScorePick => {
  const [homeGoals, awayGoals] = label.split('-').map(Number);
  return { homeGoals, awayGoals, probability: 0.1, label, rank: 1 };
};

describe('score markets', () => {
  it.each([
    ['0-0', '平', '小', '否'],
    ['1-1', '平', '小', '是'],
    ['2-0', '球队A胜', '小', '否'],
    ['2-1', '球队A胜', '大', '是'],
    ['1-3', '球队B胜', '大', '是'],
  ])('derives markets for %s', (label, winner, overUnder25, btts) => {
    expect(getScoreMarkets(score(label), '球队A', '球队B')).toEqual({
      winner,
      overUnder25,
      btts,
    });
  });

  it('formats only enabled markets in the selected order', () => {
    expect(
      formatEnabledMarkets(score('2-1'), '英格兰', '美国', ['winner', 'btts']),
    ).toEqual(['胜平负:英格兰胜', 'BTTS:是']);
  });
});
