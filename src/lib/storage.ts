import type {
  AppState,
  BaseComboStrategy,
  ComboStrategy,
  DirectionMarket,
  CorrectScoreOdd,
  Match,
  MatchOdds,
  MatchOverride,
  OutcomeOdds,
  TeamProfile,
  TeamStats,
  UiState,
} from '../types';

export const STORAGE_KEY = 'football_combo_v2_state';
export const CURRENT_STATE_VERSION = 6;

const DEFAULT_UI_STATE: UiState = {
  selectedMatchIds: [],
  comboType: 2,
  strategy: 'coverage',
  randomSeed: 0,
  enabledMarkets: [],
  matchOverrides: {},
  useOddsData: true,
};

export const createEmptyState = (): AppState => ({
  version: CURRENT_STATE_VERSION,
  lastUpdated: new Date().toISOString(),
  teamPool: [],
  matchPool: [],
  uiState: { ...DEFAULT_UI_STATE },
});

const isStats = (value: unknown): value is TeamStats => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const stats = value as Record<string, unknown>;
  const hasCoreStats = ['attack', 'defense', 'stability'].every(
    (key) => typeof stats[key] === 'number' && Number.isFinite(stats[key]),
  );
  const hasValidPace =
    stats.pace === undefined ||
    (typeof stats.pace === 'number' && Number.isFinite(stats.pace) && stats.pace >= 0 && stats.pace <= 100);

  return hasCoreStats && hasValidPace;
};

const normalizeStats = (stats: TeamStats): TeamStats => ({
  attack: stats.attack,
  defense: stats.defense,
  stability: stats.stability,
  pace: typeof stats.pace === 'number' && Number.isFinite(stats.pace) ? stats.pace : 50,
});

const normalizeMatch = (match: Match): Match => ({
  ...match,
  homeStats: normalizeStats(match.homeStats),
  awayStats: normalizeStats(match.awayStats),
});

const normalizeTeamProfile = (profile: TeamProfile): TeamProfile => ({
  ...profile,
  pace: typeof profile.pace === 'number' && Number.isFinite(profile.pace) ? profile.pace : 50,
});

const isPositiveOdds = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 1;

const isOutcomeOdds = (value: unknown): value is OutcomeOdds => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const odds = value as Record<string, unknown>;
  return [odds.teamAWin, odds.draw, odds.teamBWin].every(
    (item) => item === undefined || isPositiveOdds(item),
  );
};

const isCorrectScoreOdd = (value: unknown): value is CorrectScoreOdd => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const odd = value as Record<string, unknown>;
  return (
    typeof odd.score === 'string' &&
    /^\d+-\d+$/.test(odd.score) &&
    isPositiveOdds(odd.odds) &&
    (odd.status === undefined || odd.status === 'open' || odd.status === 'closed')
  );
};

const isMatchOdds = (value: unknown): value is MatchOdds => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const odds = value as Record<string, unknown>;
  return (
    (odds.winner === undefined || isOutcomeOdds(odds.winner)) &&
    (odds.correctScores === undefined ||
      (Array.isArray(odds.correctScores) && odds.correctScores.every(isCorrectScoreOdd)))
  );
};

const normalizeOdds = (odds: MatchOdds | undefined): MatchOdds | undefined => {
  if (!odds) {
    return undefined;
  }

  return {
    source: odds.source,
    updatedAt: odds.updatedAt,
    winner: odds.winner,
    correctScores: odds.correctScores?.map((item) => ({ ...item })),
  };
};

const isMatch = (value: unknown): value is Match => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const match = value as Record<string, unknown>;
  return (
    typeof match.id === 'string' &&
    typeof match.homeName === 'string' &&
    typeof match.awayName === 'string' &&
    isStats(match.homeStats) &&
    isStats(match.awayStats) &&
    (match.odds === undefined || isMatchOdds(match.odds))
  );
};

const isTeamProfile = (value: unknown): value is TeamProfile => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const profile = value as Record<string, unknown>;
  return typeof profile.team === 'string' && isStats(profile);
};

const isStrategy = (value: unknown): value is ComboStrategy =>
  value === 'safe' ||
  value === 'balanced' ||
  value === 'underdog' ||
  value === 'goals' ||
  value === 'highScore' ||
  value === 'mainline' ||
  value === 'coverage' ||
  value === 'upset' ||
  value === 'value' ||
  value === 'mixed' ||
  value === 'random';

const isBaseStrategy = (value: unknown): value is BaseComboStrategy => isStrategy(value) && value !== 'random';

const isDirectionMarket = (value: unknown): value is DirectionMarket =>
  value === 'winner' || value === 'overUnder25' || value === 'btts' || value === 'totalGoals';

const sanitizeMatchOverrides = (value: unknown, validMatchIds: Set<string>): Record<string, MatchOverride> => {
  if (!value || typeof value !== 'object') {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([matchId]) => validMatchIds.has(matchId))
      .map(([matchId, rawOverride]) => {
        if (!rawOverride || typeof rawOverride !== 'object') {
          return [matchId, {}];
        }

        const override = rawOverride as Record<string, unknown>;
        const nextOverride: MatchOverride = {};
        if (isBaseStrategy(override.strategy)) {
          nextOverride.strategy = override.strategy;
        }

        if (Array.isArray(override.enabledMarkets)) {
          nextOverride.enabledMarkets = override.enabledMarkets.filter(isDirectionMarket);
        }

        return [matchId, nextOverride];
      })
      .filter(([, override]) => Object.keys(override).length > 0),
  );
};

const sanitizeUiState = (value: unknown, validMatchIds: Set<string>): UiState => {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_UI_STATE };
  }

  const uiState = value as Record<string, unknown>;
  const selectedMatchIds = Array.isArray(uiState.selectedMatchIds)
    ? uiState.selectedMatchIds.filter(
        (id): id is string => typeof id === 'string' && validMatchIds.has(id),
      )
    : [];

  const comboType =
    typeof uiState.comboType === 'number' && Number.isInteger(uiState.comboType)
      ? Math.max(2, Math.min(uiState.comboType, Math.max(2, selectedMatchIds.length)))
      : DEFAULT_UI_STATE.comboType;

  return {
    selectedMatchIds,
    comboType,
    strategy: isStrategy(uiState.strategy) ? uiState.strategy : DEFAULT_UI_STATE.strategy,
    randomSeed:
      typeof uiState.randomSeed === 'number' && Number.isFinite(uiState.randomSeed)
        ? uiState.randomSeed
        : DEFAULT_UI_STATE.randomSeed,
    enabledMarkets: Array.isArray(uiState.enabledMarkets)
      ? uiState.enabledMarkets.filter(isDirectionMarket)
      : DEFAULT_UI_STATE.enabledMarkets,
    matchOverrides: sanitizeMatchOverrides(uiState.matchOverrides, validMatchIds),
    useOddsData: typeof uiState.useOddsData === 'boolean' ? uiState.useOddsData : DEFAULT_UI_STATE.useOddsData,
  };
};

export const isCompatibleState = (value: unknown): value is AppState => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const state = value as Record<string, unknown>;
  return (
    (state.version === CURRENT_STATE_VERSION ||
      state.version === 5 ||
      state.version === 4 ||
      state.version === 3 ||
      state.version === 2 ||
      state.version === 1) &&
    typeof state.lastUpdated === 'string' &&
    (state.version === 1 || !('teamPool' in state) || (Array.isArray(state.teamPool) && state.teamPool.every(isTeamProfile))) &&
    Array.isArray(state.matchPool) &&
    state.matchPool.every(isMatch)
  );
};

export const loadState = (): AppState => {
  if (typeof window === 'undefined') {
    return createEmptyState();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createEmptyState();
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!isCompatibleState(parsed)) {
      return createEmptyState();
    }

    const validMatchIds = new Set(parsed.matchPool.map((match) => match.id));
    return {
      version: CURRENT_STATE_VERSION,
      lastUpdated: parsed.lastUpdated,
      teamPool: Array.isArray(parsed.teamPool) ? parsed.teamPool.map(normalizeTeamProfile) : [],
      matchPool: parsed.matchPool.map((match) => ({ ...normalizeMatch(match), odds: normalizeOdds(match.odds) })),
      uiState: sanitizeUiState(parsed.uiState, validMatchIds),
    };
  } catch {
    return createEmptyState();
  }
};

export const saveState = (state: AppState) => {
  if (typeof window === 'undefined') {
    return;
  }

  const payload: AppState = {
    ...state,
    version: CURRENT_STATE_VERSION,
    lastUpdated: new Date().toISOString(),
    teamPool: state.teamPool.map(normalizeTeamProfile),
    matchPool: state.matchPool.map((match) => ({ ...normalizeMatch(match), odds: normalizeOdds(match.odds) })),
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
};
