import { describe, expect, it } from 'vitest';
import { buildStateFromMatchPack, MATCH_PACKS } from './matchPacks';

describe('match packs', () => {
  it('keeps built-in match packs with ability and odds data', () => {
    expect(MATCH_PACKS.map((pack) => pack.id)).toEqual([
      '2026-06-18',
      '2026-06-19',
      '2026-06-20',
      '2026-06-21',
      '2026-06-23',
      '2026-06-24',
    ]);

    const june18 = MATCH_PACKS[0];
    expect(june18.label).toBe('6.18 比赛');
    expect(june18.matches.map((pair) => `${pair[0].team} vs ${pair[1].team}`)).toEqual([
      '捷克 vs 南非',
      '瑞士 vs 波黑',
      '加拿大 vs 卡塔尔',
      '墨西哥 vs 韩国',
    ]);
    expect(june18.odds).toHaveLength(4);
    expect(june18.odds[0].odds.winner?.teamAWin).toBeGreaterThan(1);
    expect(june18.odds[0].odds.correctScores?.length).toBeGreaterThan(0);

    const june19 = MATCH_PACKS[1];
    expect(june19.label).toBe('6.19 比赛');
    expect(june19.matches.map((pair) => `${pair[0].team} vs ${pair[1].team}`)).toEqual([
      '美国 vs 澳大利亚',
      '苏格兰 vs 摩洛哥',
      '巴西 vs 海地',
      '土耳其 vs 巴拉圭',
    ]);
    expect(june19.odds).toHaveLength(4);
    expect(june19.odds[0].odds.winner?.teamAWin).toBeGreaterThan(1);
    expect(june19.odds[0].odds.correctScores?.length).toBeGreaterThan(0);

    const june20 = MATCH_PACKS[2];
    expect(june20.label).toBe('6.20 比赛');
    expect(june20.matches.map((pair) => `${pair[0].team} vs ${pair[1].team}`)).toEqual([
      '荷兰 vs 瑞典',
      '德国 vs 科特迪瓦',
      '厄瓜多尔 vs 库拉索',
      '突尼斯 vs 日本',
    ]);
    expect(june20.odds).toHaveLength(4);
    expect(june20.odds[0].odds.winner?.teamAWin).toBeGreaterThan(1);
    expect(june20.odds[0].odds.correctScores?.length).toBeGreaterThan(0);
    expect(june20.odds[0].odds.totalGoals?.length).toBeGreaterThan(0);

    const june21 = MATCH_PACKS[3];
    expect(june21.label).toBe('6.21 比赛');
    expect(june21.matches.map((pair) => `${pair[0].team} vs ${pair[1].team}`)).toEqual([
      '西班牙 vs 沙特',
      '比利时 vs 伊朗',
      '乌拉圭 vs 佛得角',
      '新西兰 vs 埃及',
    ]);
    expect(june21.odds).toHaveLength(4);
    expect(june21.odds[0].odds.winner).toBeUndefined();
    expect(june21.odds[0].odds.correctScores?.length).toBeGreaterThan(0);
    expect(june21.odds[0].odds.totalGoals?.length).toBeGreaterThan(0);
    expect(june21.odds[1].odds.winner?.teamAWin).toBeGreaterThan(1);

    const june23 = MATCH_PACKS[4];
    expect(june23.label).toBe('6.23 比赛');
    expect(june23.matches.map((pair) => `${pair[0].team} vs ${pair[1].team}`)).toEqual([
      '葡萄牙 vs 乌兹别克',
      '英格兰 vs 加纳',
      '巴拿马 vs 克罗地亚',
      '哥伦比亚 vs 刚果金',
    ]);
    expect(june23.odds).toHaveLength(4);
    expect(june23.odds[0].odds.winner).toBeUndefined();
    expect(june23.odds[0].odds.correctScores?.length).toBeGreaterThan(0);
    expect(june23.odds[2].odds.winner?.teamBWin).toBeGreaterThan(1);

    const june24 = MATCH_PACKS[5];
    expect(june24.label).toBe('6.24 比赛');
    expect(june24.matches.map((pair) => `${pair[0].team} vs ${pair[1].team}`)).toEqual([
      '瑞士 vs 加拿大',
      '波黑 vs 卡塔尔',
      '苏格兰 vs 巴西',
      '摩洛哥 vs 海地',
      '南非 vs 韩国',
      '捷克 vs 墨西哥',
    ]);
    expect(june24.odds).toHaveLength(6);
    expect(june24.odds[0].odds.winner?.teamAWin).toBeGreaterThan(1);
    expect(june24.odds[3].odds.winner).toBeUndefined();
    expect(june24.odds[3].odds.totalGoals?.length).toBeGreaterThan(0);
  });

  it('builds a fresh app state from a match pack and matches odds into the games', () => {
    const state = buildStateFromMatchPack(MATCH_PACKS[1]);

    expect(state.matchPool).toHaveLength(4);
    expect(state.teamPool).toHaveLength(8);
    expect(state.uiState.selectedMatchIds).toEqual(state.matchPool.map((match) => match.id));
    expect(state.uiState.useOddsData).toBe(true);
    expect(state.matchPool[0]).toMatchObject({
      homeName: '美国',
      awayName: '澳大利亚',
      homeStats: { attack: 79, defense: 74, stability: 72, pace: 68 },
      awayStats: { attack: 67, defense: 73, stability: 76, pace: 52 },
    });
    expect(state.matchPool[0].odds?.winner?.teamAWin).toBeGreaterThan(1);
    expect(state.matchPool[0].odds?.correctScores?.length).toBeGreaterThan(0);
  });
});
