import june18Pack from '../data/worldcup-match-pack-2026-06-18.json';
import june19Pack from '../data/worldcup-match-pack-2026-06-19.json';
import type { AppState, MatchPack, TeamProfile } from '../types';
import { applyOddsImports } from './oddsImport';
import { createEmptyState } from './storage';
import { upsertMatchPairs } from './teamImport';

export const MATCH_PACKS = [june18Pack, june19Pack] as MatchPack[];

const flattenTeams = (matches: [TeamProfile, TeamProfile][]) => matches.flatMap((pair) => pair);

export const buildStateFromMatchPack = (pack: MatchPack): AppState => {
  const baseState = createEmptyState();
  const matchPoolWithoutOdds = upsertMatchPairs([], pack.matches);
  const { matches } = applyOddsImports(matchPoolWithoutOdds, pack.odds);

  return {
    ...baseState,
    teamPool: flattenTeams(pack.matches),
    matchPool: matches,
    uiState: {
      ...baseState.uiState,
      selectedMatchIds: matches.map((match) => match.id),
      comboType: Math.min(baseState.uiState.comboType, Math.max(2, matches.length)),
      useOddsData: true,
    },
  };
};
