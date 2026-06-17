import { useEffect, useMemo, useState } from 'react';
import { Activity, RotateCcw } from 'lucide-react';
import { MatchForm } from './components/MatchForm';
import { MatchCard } from './components/MatchCard';
import { ControlPanel } from './components/ControlPanel';
import { ResultsPanel } from './components/ResultsPanel';
import { TeamImportPanel } from './components/TeamImportPanel';
import { buildComboGroups } from './lib/combo';
import { analyzeMatch } from './lib/poisson';
import { createEmptyState, loadState, saveState } from './lib/storage';
import { upsertMatchPairs, upsertTeamProfiles } from './lib/teamImport';
import type { AppState, ComboStrategy, Match, TeamProfile } from './types';
import './styles.css';

function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [selectedTeam, setSelectedTeam] = useState<TeamProfile | null>(null);

  const analyses = useMemo(
    () => state.matchPool.map((match) => analyzeMatch(match)),
    [state.matchPool],
  );
  const analysisById = useMemo(
    () => new Map(analyses.map((analysis) => [analysis.matchId, analysis])),
    [analyses],
  );
  const selectedAnalyses = useMemo(
    () =>
      state.uiState.selectedMatchIds
        .map((matchId) => analysisById.get(matchId))
        .filter((analysis): analysis is NonNullable<typeof analysis> => Boolean(analysis)),
    [analysisById, state.uiState.selectedMatchIds],
  );
  const effectiveComboType = Math.min(state.uiState.comboType, Math.max(2, selectedAnalyses.length));
  const comboGroups = useMemo(
    () =>
      selectedAnalyses.length >= 2
        ? buildComboGroups(
            selectedAnalyses,
            effectiveComboType,
            state.uiState.strategy,
            state.uiState.randomSeed,
          )
        : [],
    [effectiveComboType, selectedAnalyses, state.uiState.randomSeed, state.uiState.strategy],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => saveState(state), 300);
    return () => window.clearTimeout(timer);
  }, [state]);

  const addMatch = (match: Match) => {
    setState((current) => ({
      ...current,
      matchPool: [...current.matchPool, match],
    }));
  };

  const importTeams = (profiles: TeamProfile[]) => {
    setState((current) => ({
      ...current,
      teamPool: upsertTeamProfiles(current.teamPool, profiles),
    }));
  };

  const importMatches = (pairs: [TeamProfile, TeamProfile][]) => {
    setState((current) => ({
      ...current,
      matchPool: upsertMatchPairs(current.matchPool, pairs),
    }));
  };

  const updateMatch = (match: Match) => {
    setState((current) => ({
      ...current,
      matchPool: current.matchPool.map((item) => (item.id === match.id ? match : item)),
    }));
  };

  const deleteMatch = (matchId: string) => {
    setState((current) => ({
      ...current,
      matchPool: current.matchPool.filter((match) => match.id !== matchId),
      uiState: {
        ...current.uiState,
        selectedMatchIds: current.uiState.selectedMatchIds.filter((id) => id !== matchId),
      },
    }));
  };

  const toggleSelected = (matchId: string) => {
    setState((current) => {
      const selected = current.uiState.selectedMatchIds.includes(matchId);
      const selectedMatchIds = selected
        ? current.uiState.selectedMatchIds.filter((id) => id !== matchId)
        : [...current.uiState.selectedMatchIds, matchId];
      const comboType = Math.min(current.uiState.comboType, Math.max(2, selectedMatchIds.length));

      return {
        ...current,
        uiState: {
          ...current.uiState,
          selectedMatchIds,
          comboType,
        },
      };
    });
  };

  const setComboType = (comboType: number) => {
    setState((current) => ({
      ...current,
      uiState: { ...current.uiState, comboType },
    }));
  };

  const setStrategy = (strategy: ComboStrategy) => {
    setState((current) => ({
      ...current,
      uiState: { ...current.uiState, strategy },
    }));
  };

  const refreshRandom = () => {
    setState((current) => ({
      ...current,
      uiState: { ...current.uiState, randomSeed: current.uiState.randomSeed + 1 },
    }));
  };

  const resetAll = () => {
    setState(createEmptyState());
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <span className="eyebrow">
            <Activity size={16} />
            Football Score Combo Generator
          </span>
          <h1>足球比分串关推荐生成器</h1>
        </div>
        <button className="secondary-button" type="button" onClick={resetAll}>
          <RotateCcw size={17} />
          清空重置
        </button>
      </header>

      <div className="workspace">
        <section className="left-column">
          <section className="panel">
            <div className="panel-heading">
              <p>录入入池</p>
              <strong>{state.matchPool.length} 场</strong>
            </div>
            <MatchForm onAddMatch={addMatch} selectedTeam={selectedTeam} />
          </section>

          <TeamImportPanel
            teams={state.teamPool}
            onImportTeams={importTeams}
            onImportMatches={importMatches}
            onUseTeam={(team) => setSelectedTeam(team)}
          />

          <section className="match-pool">
            {state.matchPool.length === 0 ? (
              <div className="panel empty-state">
                <h2>比赛池为空</h2>
                <p>先添加对阵双方，再调整攻防稳定性参数。</p>
              </div>
            ) : (
              state.matchPool.map((match) => {
                const analysis = analysisById.get(match.id);
                if (!analysis) {
                  return null;
                }

                return (
                  <MatchCard
                    key={match.id}
                    match={match}
                    analysis={analysis}
                    selected={state.uiState.selectedMatchIds.includes(match.id)}
                    onToggleSelected={toggleSelected}
                    onUpdateMatch={updateMatch}
                    onDeleteMatch={deleteMatch}
                  />
                );
              })
            )}
          </section>
        </section>

        <aside className="right-column">
          <ControlPanel
            selectedCount={selectedAnalyses.length}
            comboType={effectiveComboType}
            strategy={state.uiState.strategy}
            onComboTypeChange={setComboType}
            onStrategyChange={setStrategy}
            onRefreshRandom={refreshRandom}
          />
          <ResultsPanel
            groups={comboGroups}
            selectedCount={selectedAnalyses.length}
            comboType={effectiveComboType}
          />
        </aside>
      </div>

      <div className="mobile-action-bar">
        <span>{selectedAnalyses.length} 场已选</span>
        <strong>{selectedAnalyses.length >= 2 ? `${effectiveComboType}串1` : '待选择'}</strong>
      </div>
    </main>
  );
}

export default App;
