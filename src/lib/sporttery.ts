import type { CorrectScoreOdd, MatchOdds, TotalGoalsOdds } from '../types';
import type { OddsImportItem } from './oddsImport';

export const SPORTTERY_CALCULATOR_URL =
  'https://webapi.sporttery.cn/gateway/uniform/football/getMatchCalculatorV1.qry?channel=c&poolCode=crs%2Chad%2Cttg';

const SCORE_KEYS: Array<[string, string]> = [
  ['s00s00', '0-0'],
  ['s00s01', '0-1'],
  ['s00s02', '0-2'],
  ['s00s03', '0-3'],
  ['s00s04', '0-4'],
  ['s00s05', '0-5'],
  ['s01s00', '1-0'],
  ['s01s01', '1-1'],
  ['s01s02', '1-2'],
  ['s01s03', '1-3'],
  ['s01s04', '1-4'],
  ['s01s05', '1-5'],
  ['s02s00', '2-0'],
  ['s02s01', '2-1'],
  ['s02s02', '2-2'],
  ['s02s03', '2-3'],
  ['s02s04', '2-4'],
  ['s02s05', '2-5'],
  ['s03s00', '3-0'],
  ['s03s01', '3-1'],
  ['s03s02', '3-2'],
  ['s03s03', '3-3'],
  ['s04s00', '4-0'],
  ['s04s01', '4-1'],
  ['s04s02', '4-2'],
  ['s05s00', '5-0'],
  ['s05s01', '5-1'],
  ['s05s02', '5-2'],
];

const TOTAL_GOALS_KEYS: Array<[string, TotalGoalsOdds['goals']]> = [
  ['s0', 0],
  ['s1', 1],
  ['s2', 2],
  ['s3', 3],
  ['s4', 4],
  ['s5', 5],
  ['s6', 6],
  ['s7', '7+'],
];

const getObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const getPositiveOdds = (value: unknown) => {
  const numeric = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  return Number.isFinite(numeric) && numeric > 1 ? numeric : undefined;
};

const parseCorrectScores = (crs: Record<string, unknown>): CorrectScoreOdd[] =>
  SCORE_KEYS.flatMap(([key, score]) => {
    const odds = getPositiveOdds(crs[key]);
    return odds ? [{ score, odds, status: 'open' as const }] : [];
  });

const parseTotalGoals = (ttg: Record<string, unknown>): TotalGoalsOdds[] =>
  TOTAL_GOALS_KEYS.flatMap(([key, goals]) => {
    const odds = getPositiveOdds(ttg[key]);
    return odds ? [{ goals, odds, status: 'open' as const }] : [];
  });

const parseWinner = (had: Record<string, unknown>) => {
  const teamAWin = getPositiveOdds(had.h);
  const draw = getPositiveOdds(had.d);
  const teamBWin = getPositiveOdds(had.a);

  return teamAWin || draw || teamBWin ? { teamAWin, draw, teamBWin } : undefined;
};

export const parseSportteryCalculatorResponse = (rawData: unknown): OddsImportItem[] => {
  const data = getObject(rawData);
  const value = getObject(data.value);
  const matchInfoList = Array.isArray(value.matchInfoList) ? value.matchInfoList : [];

  return matchInfoList.flatMap((matchDay) => {
    const day = getObject(matchDay);
    const subMatchList: unknown[] = Array.isArray(day.subMatchList) ? day.subMatchList : [];
    return subMatchList.flatMap((match: unknown) => {
      const row = getObject(match);
      const teamA = typeof row.homeTeamAbbName === 'string' ? row.homeTeamAbbName.trim() : '';
      const teamB = typeof row.awayTeamAbbName === 'string' ? row.awayTeamAbbName.trim() : '';
      if (!teamA || !teamB) {
        return [];
      }

      const odds: MatchOdds = {
        source: 'scraped',
        winner: parseWinner(getObject(row.had)),
        correctScores: parseCorrectScores(getObject(row.crs)),
        totalGoals: parseTotalGoals(getObject(row.ttg)),
      };

      return [{ teamA, teamB, odds }];
    });
  });
};

export const fetchSportteryOdds = async (fetcher: typeof fetch = fetch) => {
  const response = await fetcher(SPORTTERY_CALCULATOR_URL, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`竞彩接口请求失败：${response.status}`);
  }

  return parseSportteryCalculatorResponse(await response.json());
};
