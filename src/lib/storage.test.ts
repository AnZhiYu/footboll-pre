import { describe, expect, it } from 'vitest';
import { CURRENT_STATE_VERSION, createEmptyState, loadState, saveState, STORAGE_KEY } from './storage';

describe('state storage', () => {
  it('loads an empty versioned state when localStorage is empty', () => {
    localStorage.clear();

    expect(loadState()).toMatchObject({
      version: CURRENT_STATE_VERSION,
      teamPool: [],
      matchPool: [],
      uiState: { selectedMatchIds: [], comboType: 2, strategy: 'balanced', randomSeed: 0 },
    });
  });

  it('rejects unversioned persisted data instead of throwing', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ matchPool: [{ id: 'old' }] }));

    expect(loadState().matchPool).toEqual([]);
  });

  it('migrates version 1 persisted data to version 2 with a random seed', () => {
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
      version: 2,
      teamPool: [],
      matchPool: [
        {
          id: 'm_1',
          homeStats: { attack: 85, defense: 70, stability: 80, pace: 50 },
          awayStats: { attack: 75, defense: 65, stability: 70, pace: 50 },
        },
      ],
      uiState: { selectedMatchIds: ['m_1'], comboType: 2, strategy: 'balanced', randomSeed: 0 },
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
        },
      ],
      uiState: { selectedMatchIds: ['m_1'], comboType: 2, strategy: 'safe' as const, randomSeed: 5 },
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
