import { describe, expect, it } from 'vitest';
import { SPORTTERY_CALCULATOR_URL, parseSportteryCalculatorResponse } from './sporttery';

describe('sporttery calculator adapter', () => {
  it('maps winner, correct score, and total goals odds into project odds imports', () => {
    const result = parseSportteryCalculatorResponse({
      errorCode: '0',
      value: {
        matchInfoList: [
          {
            subMatchList: [
              {
                homeTeamAbbName: '美国',
                awayTeamAbbName: '澳大利亚',
                had: { h: '1.45', d: '3.83', a: '5.60' },
                crs: {
                  s01s00: '6.50',
                  s02s01: '5.85',
                  s00s00: '11.50',
                  s1sh: '45.00',
                  s1sd: '300.0',
                  s1sa: '250.0',
                },
                ttg: {
                  s0: '12.00',
                  s1: '5.00',
                  s2: '3.40',
                  s3: '3.80',
                  s4: '6.20',
                  s5: '12.00',
                  s6: '30.00',
                  s7: '60.00',
                },
              },
            ],
          },
        ],
      },
    });

    expect(result).toEqual([
      {
        teamA: '美国',
        teamB: '澳大利亚',
        odds: {
          source: 'scraped',
          winner: { teamAWin: 1.45, draw: 3.83, teamBWin: 5.6 },
          correctScores: [
            { score: '0-0', odds: 11.5, status: 'open' },
            { score: '1-0', odds: 6.5, status: 'open' },
            { score: '2-1', odds: 5.85, status: 'open' },
          ],
          totalGoals: [
            { goals: 0, odds: 12, status: 'open' },
            { goals: 1, odds: 5, status: 'open' },
            { goals: 2, odds: 3.4, status: 'open' },
            { goals: 3, odds: 3.8, status: 'open' },
            { goals: 4, odds: 6.2, status: 'open' },
            { goals: 5, odds: 12, status: 'open' },
            { goals: 6, odds: 30, status: 'open' },
            { goals: '7+', odds: 60, status: 'open' },
          ],
        },
      },
    ]);
  });

  it('exposes the official calculator url with winner, correct score, and total goals pools', () => {
    expect(SPORTTERY_CALCULATOR_URL).toContain('poolCode=crs%2Chad%2Cttg');
  });
});
