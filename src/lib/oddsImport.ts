import type { CorrectScoreOdd, Match, MatchOdds, OutcomeOdds } from '../types';

export type OddsImportItem = {
  teamA: string;
  teamB: string;
  odds: MatchOdds;
};

type ParseOddsImportsResult =
  | { ok: true; imports: OddsImportItem[] }
  | { ok: false; error: string };

type ApplyOddsImportsResult = {
  matches: Match[];
  matchedCount: number;
  unmatched: string[];
};

const stripTrailingCommas = (value: string) => value.replace(/,\s*([}\]])/g, '$1');
const scorePattern = /^\d+-\d+$/;

const isPositiveOdds = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 1;

const normalizeName = (value: string) => value.trim();
const pairKey = (teamA: string, teamB: string) => `${normalizeName(teamA)}|||${normalizeName(teamB)}`;

const parseWinner = (value: unknown): OutcomeOdds | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'object') {
    throw new Error('winner 需要是对象或 null');
  }

  const winner = value as Record<string, unknown>;
  const next: OutcomeOdds = {};

  if (winner.teamAWin !== undefined) {
    if (!isPositiveOdds(winner.teamAWin)) throw new Error('teamAWin 赔率必须大于 1');
    next.teamAWin = winner.teamAWin;
  }
  if (winner.draw !== undefined) {
    if (!isPositiveOdds(winner.draw)) throw new Error('draw 赔率必须大于 1');
    next.draw = winner.draw;
  }
  if (winner.teamBWin !== undefined) {
    if (!isPositiveOdds(winner.teamBWin)) throw new Error('teamBWin 赔率必须大于 1');
    next.teamBWin = winner.teamBWin;
  }

  return Object.keys(next).length > 0 ? next : undefined;
};

const parseCorrectScores = (value: unknown): CorrectScoreOdd[] => {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error('correctScores 需要是数组');
  }

  return value.map((item) => {
    if (!item || typeof item !== 'object') {
      throw new Error('每个波胆赔率都需要 score 和 odds');
    }

    const scoreOdd = item as Record<string, unknown>;
    if (typeof scoreOdd.score !== 'string' || !scorePattern.test(scoreOdd.score)) {
      throw new Error('score 需要使用 1-0 这样的格式');
    }
    if (!isPositiveOdds(scoreOdd.odds)) {
      throw new Error('波胆 odds 必须大于 1');
    }

    return {
      score: scoreOdd.score,
      odds: scoreOdd.odds,
      status: scoreOdd.status === 'closed' ? 'closed' : 'open',
    };
  });
};

export const parseOddsImports = (rawValue: string): ParseOddsImportsResult => {
  try {
    const parsed = JSON.parse(stripTrailingCommas(rawValue)) as unknown;
    if (!Array.isArray(parsed)) {
      return { ok: false, error: '请粘贴数组格式的赔率数据' };
    }

    const imports = parsed.map((item) => {
      if (!item || typeof item !== 'object') {
        throw new Error('每条赔率需要 teamA、teamB 和 odds');
      }

      const row = item as Record<string, unknown>;
      if (typeof row.teamA !== 'string' || row.teamA.trim().length === 0) {
        throw new Error('teamA 不能为空');
      }
      if (typeof row.teamB !== 'string' || row.teamB.trim().length === 0) {
        throw new Error('teamB 不能为空');
      }
      if (!row.odds || typeof row.odds !== 'object') {
        throw new Error('odds 不能为空');
      }

      const odds = row.odds as Record<string, unknown>;

      return {
        teamA: normalizeName(row.teamA),
        teamB: normalizeName(row.teamB),
        odds: {
          source: 'imported' as const,
          winner: parseWinner(odds.winner),
          correctScores: parseCorrectScores(odds.correctScores),
        },
      };
    });

    return { ok: true, imports };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'JSON 格式无法解析，请检查赔率数据' };
  }
};

const reverseScore = (score: string) => {
  const [a, b] = score.split('-');
  return `${b}-${a}`;
};

const reverseOdds = (odds: MatchOdds): MatchOdds => ({
  ...odds,
  winner: odds.winner
    ? {
        teamAWin: odds.winner.teamBWin,
        draw: odds.winner.draw,
        teamBWin: odds.winner.teamAWin,
      }
    : undefined,
  correctScores: odds.correctScores?.map((item) => ({
    ...item,
    score: reverseScore(item.score),
  })),
});

export const applyOddsImports = (matches: Match[], imports: OddsImportItem[]): ApplyOddsImportsResult => {
  const direct = new Map(matches.map((match, index) => [pairKey(match.homeName, match.awayName), index]));
  const reverse = new Map(matches.map((match, index) => [pairKey(match.awayName, match.homeName), index]));
  const nextMatches = [...matches];
  const unmatched: string[] = [];
  let matchedCount = 0;

  imports.forEach((item) => {
    const directIndex = direct.get(pairKey(item.teamA, item.teamB));
    const reverseIndex = reverse.get(pairKey(item.teamA, item.teamB));
    const index = directIndex ?? reverseIndex;

    if (index === undefined) {
      unmatched.push(`${item.teamA} vs ${item.teamB}`);
      return;
    }

    const odds = directIndex !== undefined ? item.odds : reverseOdds(item.odds);
    nextMatches[index] = {
      ...nextMatches[index],
      odds: {
        ...odds,
        updatedAt: new Date().toISOString(),
      },
    };
    matchedCount += 1;
  });

  return { matches: nextMatches, matchedCount, unmatched };
};
