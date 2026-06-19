import { describe, expect, it } from 'vitest';
import type { Match } from '../types';
import { applyOddsImports, parseOddsImports } from './oddsImport';

const matches: Match[] = [
  {
    id: 'm_1',
    homeName: '捷克',
    awayName: '南非',
    homeStats: { attack: 63, defense: 66, stability: 61, pace: 53 },
    awayStats: { attack: 56, defense: 54, stability: 52, pace: 58 },
  },
  {
    id: 'm_2',
    homeName: '瑞士',
    awayName: '波黑',
    homeStats: { attack: 68, defense: 82, stability: 80, pace: 44 },
    awayStats: { attack: 65, defense: 59, stability: 57, pace: 56 },
  },
];

describe('odds import', () => {
  it('parses odds-only json with nullable winner and empty correct scores', () => {
    expect(
      parseOddsImports(`[
        {
          "teamA": "捷克",
          "teamB": "南非",
          "odds": {
            "winner": null,
            "correctScores": [],
            "totalGoals": [
              { "goals": 2, "odds": 3.40 },
              { "goals": "7+", "odds": 60.00 }
            ]
          }
        }
      ]`),
    ).toEqual({
      ok: true,
      imports: [
        {
          teamA: '捷克',
          teamB: '南非',
          odds: {
            source: 'imported',
            winner: undefined,
            correctScores: [],
            totalGoals: [
              { goals: 2, odds: 3.4, status: 'open' },
              { goals: '7+', odds: 60, status: 'open' },
            ],
          },
        },
      ],
    });
  });

  it('rejects invalid score labels and non-positive odds', () => {
    const result = parseOddsImports(`[
      {
        "teamA": "捷克",
        "teamB": "南非",
        "odds": {
          "correctScores": [{ "score": "1:0", "odds": 0 }]
        }
      }
    ]`);

    expect(result.ok).toBe(false);
  });

  it('matches odds to existing matches and reverses winner and correct scores when team order is reversed', () => {
    const parsed = parseOddsImports(`[
      {
        "teamA": "南非",
        "teamB": "捷克",
        "odds": {
          "winner": { "teamAWin": 3.4, "draw": 3.2, "teamBWin": 2.2 },
          "correctScores": [
            { "score": "0-1", "odds": 6.6 },
            { "score": "1-1", "odds": 7.0 }
          ],
          "totalGoals": [{ "goals": 1, "odds": 4.2 }]
        }
      },
      {
        "teamA": "葡萄牙",
        "teamB": "刚果(金)",
        "odds": { "correctScores": [{ "score": "2-0", "odds": 5.4 }] }
      }
    ]`);

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const result = applyOddsImports(matches, parsed.imports);

    expect(result.matchedCount).toBe(1);
    expect(result.unmatched).toEqual(['葡萄牙 vs 刚果(金)']);
    expect(result.matches[0].odds).toMatchObject({
      winner: { teamAWin: 2.2, draw: 3.2, teamBWin: 3.4 },
      correctScores: [
        { score: '1-0', odds: 6.6, status: 'open' },
        { score: '1-1', odds: 7, status: 'open' },
      ],
      totalGoals: [{ goals: 1, odds: 4.2, status: 'open' }],
    });
  });
});
