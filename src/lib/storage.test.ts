import { describe, expect, it } from 'vitest';
import { CURRENT_STATE_VERSION, createEmptyState, loadState, saveState, STORAGE_KEY } from './storage';

describe('state storage', () => {
  it('loads an empty versioned state when localStorage is empty', () => {
    localStorage.clear();

    expect(loadState()).toMatchObject({
      version: CURRENT_STATE_VERSION,
      teamPool: [],
      matchPool: [],
      uiState: {
        selectedMatchIds: [],
        comboType: 2,
        strategy: 'coverage',
        randomSeed: 0,
        enabledMarkets: [],
        matchOverrides: {},
        useOddsData: true,
      },
    });
  });

  it('rejects unversioned persisted data instead of throwing', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ matchPool: [{ id: 'old' }] }));

    expect(loadState().matchPool).toEqual([]);
  });

  it('migrates version 1 persisted data to the current schema with defaults', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        lastUpdated: '2026-06-17T00:00:00.000Z',
        matchPool: [
          {
            id: 'm_1',
            homeName: '英格兰',
            awayName: '美国',
            homeStats: { attack: 85, defense: 70, stability: 80 },
            awayStats: { attack: 75, defense: 65, stability: 70 },
          },
        ],
        uiState: { selectedMatchIds: ['m_1'], comboType: 2, strategy: 'balanced' },
      }),
    );

    expect(loadState()).toMatchObject({
      version: CURRENT_STATE_VERSION,
      teamPool: [],
      matchPool: [
        {
          id: 'm_1',
          homeStats: { attack: 85, defense: 70, stability: 80, pace: 50 },
          awayStats: { attack: 75, defense: 65, stability: 70, pace: 50 },
        },
      ],
      uiState: {
        selectedMatchIds: ['m_1'],
        comboType: 2,
        strategy: 'balanced',
        randomSeed: 0,
        enabledMarkets: [],
        matchOverrides: {},
        useOddsData: true,
      },
    });
  });

  it('round-trips compatible state', () => {
    const state = {
      ...createEmptyState(),
      teamPool: [{ team: '奥地利', attack: 76, defense: 74, stability: 78, pace: 62 }],
      matchPool: [
        {
          id: 'm_1',
          homeName: '英格兰',
          awayName: '美国',
          homeStats: { attack: 85, defense: 70, stability: 80, pace: 70 },
          awayStats: { attack: 75, defense: 65, stability: 70, pace: 48 },
          odds: {
            winner: { teamAWin: 2.2, draw: 3.2, teamBWin: 3.4 },
            correctScores: [{ score: '1-0', odds: 6.6, status: 'open' as const }],
          },
        },
      ],
      uiState: {
        selectedMatchIds: ['m_1'],
        comboType: 2,
        strategy: 'safe' as const,
        randomSeed: 5,
        enabledMarkets: ['winner' as const, 'btts' as const, 'totalGoals' as const],
        useOddsData: false,
        matchOverrides: {
          m_1: {
            strategy: 'highScore' as const,
            enabledMarkets: ['totalGoals' as const],
          },
        },
      },
    };

    saveState(state);

    const loaded = loadState();
    expect(Date.parse(loaded.lastUpdated)).not.toBeNaN();
    expect(loaded).toMatchObject({
      ...state,
      lastUpdated: loaded.lastUpdated,
    });
  });
});
