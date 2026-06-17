import { describe, expect, it } from 'vitest';
import { parseMatchPairs, parseTeamProfiles, upsertMatchPairs, upsertTeamProfiles } from './teamImport';
import type { TeamProfile } from '../types';

describe('team import', () => {
  it('parses team profile json with trailing commas', () => {
    expect(
      parseTeamProfiles(`[
        {
          "team": "奥地利",
          "attack": 76,
          "defense": 74,
          "stability": 78,
        }
      ]`),
    ).toEqual({
      ok: true,
      profiles: [{ team: '奥地利', attack: 76, defense: 74, stability: 78 }],
    });
  });

  it('rejects invalid profile entries', () => {
    const result = parseTeamProfiles('[{"team":"无效","attack":120,"defense":74,"stability":78}]');

    expect(result.ok).toBe(false);
  });

  it('updates duplicate teams and places newly imported teams first', () => {
    const existing = [
      { team: '奥地利', attack: 60, defense: 60, stability: 60 },
      { team: '德国', attack: 88, defense: 82, stability: 84 },
    ];
    const imported = [
      { team: '约旦', attack: 58, defense: 60, stability: 63 },
      { team: '奥地利', attack: 76, defense: 74, stability: 78 },
    ];

    expect(upsertTeamProfiles(existing, imported)).toEqual([
      { team: '约旦', attack: 58, defense: 60, stability: 63 },
      { team: '奥地利', attack: 76, defense: 74, stability: 78 },
      { team: '德国', attack: 88, defense: 82, stability: 84 },
    ]);
  });
});

describe('match pair import', () => {
  it('parses nested match pair json and ignores pace', () => {
    expect(
      parseMatchPairs(`[
        [
          {"team":"葡萄牙","attack":84,"defense":78,"stability":76,"pace":75},
          {"team":"刚果民主共和国","attack":48,"defense":55,"stability":58,"pace":38}
        ]
      ]`),
    ).toEqual({
      ok: true,
      pairs: [
        [
          { team: '葡萄牙', attack: 84, defense: 78, stability: 76 },
          { team: '刚果民主共和国', attack: 48, defense: 55, stability: 58 },
        ],
      ],
    });
  });

  it('rejects match pairs that do not contain exactly two teams', () => {
    const result = parseMatchPairs('[[{"team":"葡萄牙","attack":84,"defense":78,"stability":76}]]');

    expect(result.ok).toBe(false);
  });

  it('updates duplicate match pairs and places imported matches first', () => {
    const existing = [
      {
        id: 'old_1',
        homeName: '葡萄牙',
        awayName: '刚果民主共和国',
        homeStats: { attack: 70, defense: 70, stability: 70 },
        awayStats: { attack: 50, defense: 50, stability: 50 },
      },
      {
        id: 'old_2',
        homeName: '英格兰',
        awayName: '克罗地亚',
        homeStats: { attack: 83, defense: 79, stability: 72 },
        awayStats: { attack: 72, defense: 82, stability: 88 },
      },
    ];
    const imported: [TeamProfile, TeamProfile][] = [
      [
        { team: '加纳', attack: 68, defense: 58, stability: 58 },
        { team: '巴拿马', attack: 55, defense: 56, stability: 60 },
      ],
      [
        { team: '葡萄牙', attack: 84, defense: 78, stability: 76 },
        { team: '刚果民主共和国', attack: 48, defense: 55, stability: 58 },
      ],
    ];

    const result = upsertMatchPairs(existing, imported);

    expect(result.map((match) => `${match.homeName} vs ${match.awayName}`)).toEqual([
      '加纳 vs 巴拿马',
      '葡萄牙 vs 刚果民主共和国',
      '英格兰 vs 克罗地亚',
    ]);
    expect(result[1]).toMatchObject({
      id: 'old_1',
      homeStats: { attack: 84, defense: 78, stability: 76 },
      awayStats: { attack: 48, defense: 55, stability: 58 },
    });
  });
});
