import type { Match, TeamProfile } from '../types';

type ParseTeamProfilesResult =
  | { ok: true; profiles: TeamProfile[] }
  | { ok: false; error: string };

type MatchPair = [TeamProfile, TeamProfile];

type ParseMatchPairsResult =
  | { ok: true; pairs: MatchPair[] }
  | { ok: false; error: string };

const stripTrailingCommas = (value: string) => value.replace(/,\s*([}\]])/g, '$1');

const isProfile = (value: unknown): value is TeamProfile => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const profile = value as Record<string, unknown>;
  return (
    typeof profile.team === 'string' &&
    profile.team.trim().length > 0 &&
    ['attack', 'defense', 'stability'].every(
      (key) =>
        typeof profile[key] === 'number' &&
        Number.isFinite(profile[key]) &&
        profile[key] >= 0 &&
        profile[key] <= 100,
    )
  );
};

const toProfile = (profile: TeamProfile): TeamProfile => ({
  team: profile.team.trim(),
  attack: profile.attack,
  defense: profile.defense,
  stability: profile.stability,
});

export const parseTeamProfiles = (rawValue: string): ParseTeamProfilesResult => {
  try {
    const parsed = JSON.parse(stripTrailingCommas(rawValue)) as unknown;
    if (!Array.isArray(parsed)) {
      return { ok: false, error: '请粘贴数组格式的球队数据' };
    }

    if (!parsed.every(isProfile)) {
      return { ok: false, error: '每支球队都需要 team、attack、defense、stability，数值范围为 0-100' };
    }

    return {
      ok: true,
      profiles: parsed.map(toProfile),
    };
  } catch {
    return { ok: false, error: 'JSON 格式无法解析，请检查引号、逗号和括号' };
  }
};

export const parseMatchPairs = (rawValue: string): ParseMatchPairsResult => {
  try {
    const parsed = JSON.parse(stripTrailingCommas(rawValue)) as unknown;
    if (!Array.isArray(parsed)) {
      return { ok: false, error: '请粘贴数组格式的对局数据' };
    }

    if (!parsed.every((pair) => Array.isArray(pair) && pair.length === 2)) {
      return { ok: false, error: '每场对局都需要用数组包含正好 2 支球队' };
    }

    if (!parsed.every((pair) => pair.every(isProfile))) {
      return { ok: false, error: '每支球队都需要 team、attack、defense、stability，数值范围为 0-100' };
    }

    return {
      ok: true,
      pairs: parsed.map((pair) => [toProfile(pair[0]), toProfile(pair[1])] as MatchPair),
    };
  } catch {
    return { ok: false, error: 'JSON 格式无法解析，请检查引号、逗号和括号' };
  }
};

export const upsertTeamProfiles = (existing: TeamProfile[], imported: TeamProfile[]) => {
  const importedNames = new Set(imported.map((profile) => profile.team));
  const remaining = existing.filter((profile) => !importedNames.has(profile.team));
  return [...imported, ...remaining];
};

const pairKey = ([home, away]: MatchPair) => `${home.team}|||${away.team}`;
const matchKey = (match: Match) => `${match.homeName}|||${match.awayName}`;

export const upsertMatchPairs = (existing: Match[], imported: MatchPair[]) => {
  const existingByPair = new Map(existing.map((match) => [matchKey(match), match]));
  const importedKeys = new Set(imported.map(pairKey));
  const now = Date.now();

  const importedMatches = imported.map(([home, away], index) => {
    const key = pairKey([home, away]);
    const previous = existingByPair.get(key);

    return {
      id: previous?.id ?? `m_import_${now}_${index}`,
      homeName: home.team,
      awayName: away.team,
      homeStats: {
        attack: home.attack,
        defense: home.defense,
        stability: home.stability,
      },
      awayStats: {
        attack: away.attack,
        defense: away.defense,
        stability: away.stability,
      },
    };
  });

  return [...importedMatches, ...existing.filter((match) => !importedKeys.has(matchKey(match)))];
};
