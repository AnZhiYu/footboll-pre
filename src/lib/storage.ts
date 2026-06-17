import type { AppState, ComboStrategy, Match, TeamProfile, TeamStats, UiState } from '../types';

export const STORAGE_KEY = 'football_combo_v2_state';
export const CURRENT_STATE_VERSION = 2;

const DEFAULT_UI_STATE: UiState = {
  selectedMatchIds: [],
  comboType: 2,
  strategy: 'balanced',
  randomSeed: 0,
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
  return ['attack', 'defense', 'stability'].every(
    (key) => typeof stats[key] === 'number' && Number.isFinite(stats[key]),
  );
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
    isStats(match.awayStats)
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
  value === 'random';

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
  };
};

export const isCompatibleState = (value: unknown): value is AppState => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const state = value as Record<string, unknown>;
  return (
    (state.version === CURRENT_STATE_VERSION || state.version === 1) &&
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
      teamPool: Array.isArray(parsed.teamPool) ? parsed.teamPool : [],
      matchPool: parsed.matchPool,
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
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
};
