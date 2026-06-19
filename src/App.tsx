import { useEffect, useMemo, useState } from 'react';
import { Activity, RotateCcw } from 'lucide-react';
import { MatchForm } from './components/MatchForm';
import { MatchCard } from './components/MatchCard';
import { ResultsPanel } from './components/ResultsPanel';
import { TeamImportPanel } from './components/TeamImportPanel';
import { OddsImportPanel } from './components/OddsImportPanel';
import { InsightGuideModal } from './components/InsightGuideModal';
import { MatchPackPanel } from './components/MatchPackPanel';
import { analyzeMatch } from './lib/poisson';
import { createEmptyState, loadState, saveState } from './lib/storage';
import { upsertMatchPairs, upsertTeamProfiles } from './lib/teamImport';
import { applyOddsImports } from './lib/oddsImport';
import { MATCH_PACKS, buildStateFromMatchPack } from './lib/matchPacks';
import type { OddsImportItem } from './lib/oddsImport';
import type { AppState, DirectionMarket, Match, MatchPack, TeamProfile } from './types';
import {
  type ScoreBoardItem,
  type SelectedSlipScores,
  type SlipLegMode,
  type SlipMatchSummary,
  type ScoreSortKey,
  type ScoreStrategyFilter,
  buildScoreBoardItems,
  calculateModelWinnerProbabilities,
  toggleSelectedScore,
  updateSelectedScoreMode,
} from './lib/scoreBoard';
import './styles.css';

function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [selectedTeam, setSelectedTeam] = useState<TeamProfile | null>(null);
  const [insightGuideOpen, setInsightGuideOpen] = useState(false);
  const [scoreSortKey, setScoreSortKey] = useState<ScoreSortKey>('probability');
  const [scoreStrategyFilter, setScoreStrategyFilter] = useState<ScoreStrategyFilter>('all');
  const [scoreOddsOnly, setScoreOddsOnly] = useState(true);
  const [selectedScores, setSelectedScores] = useState<SelectedSlipScores>({});
  const [activeMatchPackId, setActiveMatchPackId] = useState<string | undefined>();

  const effectiveMatchPool = useMemo(
    () =>
      state.uiState.useOddsData
        ? state.matchPool
        : state.matchPool.map((match) => ({ ...match, odds: undefined })),
    [state.matchPool, state.uiState.useOddsData],
  );
  const analyses = useMemo(
    () => effectiveMatchPool.map((match) => analyzeMatch(match)),
    [effectiveMatchPool],
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
  const scoreBoardItems = useMemo(() => buildScoreBoardItems(selectedAnalyses), [selectedAnalyses]);
  const slipMatchSummaries = useMemo<SlipMatchSummary[]>(
    () =>
      selectedAnalyses.map((analysis) => {
        const match = effectiveMatchPool.find((candidate) => candidate.id === analysis.matchId);
        return {
          matchId: analysis.matchId,
          winnerOdds: match?.odds?.winner,
          modelWinnerProbabilities: calculateModelWinnerProbabilities(analysis.matrix),
        };
      }),
    [effectiveMatchPool, selectedAnalyses],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => saveState(state), 300);
    return () => window.clearTimeout(timer);
  }, [state]);

  const addMatch = (match: Match) => {
    setState((current) => ({
      ...current,
      matchPool: [...current.matchPool, match],
      uiState: {
        ...current.uiState,
        selectedMatchIds: current.uiState.selectedMatchIds.includes(match.id)
          ? current.uiState.selectedMatchIds
          : [...current.uiState.selectedMatchIds, match.id],
      },
    }));
  };

  const importTeams = (profiles: TeamProfile[]) => {
    setState((current) => ({
      ...current,
      teamPool: upsertTeamProfiles(current.teamPool, profiles),
    }));
  };

  const importMatches = (pairs: [TeamProfile, TeamProfile][]) => {
    setState((current) => {
      const matchPool = upsertMatchPairs(current.matchPool, pairs);
      const importedMatchIds = matchPool.slice(0, pairs.length).map((match) => match.id);
      const selectedMatchIds = Array.from(new Set([...current.uiState.selectedMatchIds, ...importedMatchIds]));

      return {
        ...current,
        matchPool,
        uiState: {
          ...current.uiState,
          selectedMatchIds,
          comboType: Math.min(current.uiState.comboType, Math.max(2, selectedMatchIds.length)),
        },
      };
    });
  };

  const importOdds = (imports: OddsImportItem[]) => {
    let importResult = { matches: state.matchPool, matchedCount: 0, unmatched: [] as string[] };
    setState((current) => {
      importResult = applyOddsImports(current.matchPool, imports);
      return {
        ...current,
        matchPool: importResult.matches,
      };
    });

    return importResult;
  };

  const selectMatchPack = (pack: MatchPack) => {
    setSelectedScores({});
    setSelectedTeam(null);
    setActiveMatchPackId(pack.id);
    setState(buildStateFromMatchPack(pack));
  };

  const updateMatch = (match: Match) => {
    setState((current) => ({
      ...current,
      matchPool: current.matchPool.map((item) => (item.id === match.id ? match : item)),
    }));
  };

  const deleteMatch = (matchId: string) => {
    setSelectedScores((current) =>
      Object.fromEntries(Object.entries(current).filter(([itemId]) => !itemId.startsWith(`${matchId}:`))),
    );
    setState((current) => ({
      ...current,
      matchPool: current.matchPool.filter((match) => match.id !== matchId),
      uiState: {
        ...current.uiState,
        selectedMatchIds: current.uiState.selectedMatchIds.filter((id) => id !== matchId),
        matchOverrides: Object.fromEntries(
          Object.entries(current.uiState.matchOverrides).filter(([id]) => id !== matchId),
        ),
      },
    }));
  };

  const selectScore = (item: ScoreBoardItem) => {
    setSelectedScores((current) => toggleSelectedScore(current, item));
  };

  const updateSlipLegMode = (itemId: string, mode: SlipLegMode) => {
    setSelectedScores((current) => updateSelectedScoreMode(current, itemId, mode));
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

  const toggleMarket = (market: DirectionMarket) => {
    setState((current) => {
      const enabledMarkets = current.uiState.enabledMarkets.includes(market)
        ? current.uiState.enabledMarkets.filter((item) => item !== market)
        : [...current.uiState.enabledMarkets, market];

      return {
        ...current,
        uiState: { ...current.uiState, enabledMarkets },
      };
    });
  };

  const toggleUseOddsData = () => {
    setState((current) => ({
      ...current,
      uiState: { ...current.uiState, useOddsData: !current.uiState.useOddsData },
    }));
  };

  const resetAll = () => {
    setSelectedScores({});
    setSelectedTeam(null);
    setActiveMatchPackId(undefined);
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
          <MatchPackPanel
            packs={MATCH_PACKS}
            currentPackId={activeMatchPackId}
            onSelectPack={selectMatchPack}
          />

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

          <OddsImportPanel
            onImportOdds={importOdds}
            useOddsData={state.uiState.useOddsData}
            onToggleUseOddsData={toggleUseOddsData}
          />

          <section className="match-pool">
            <div className="match-pool-heading">
              <div>
                <p>比赛池列表</p>
                <strong>指标常显，展开后编辑能力</strong>
              </div>
              <InsightGuideModal
                open={insightGuideOpen}
                onOpen={() => setInsightGuideOpen(true)}
                onClose={() => setInsightGuideOpen(false)}
              />
            </div>
            {state.matchPool.length === 0 ? (
              <div className="panel empty-state">
                <h2>比赛池为空</h2>
                <p>先添加对阵双方，再调整攻防稳定性参数。</p>
              </div>
            ) : (
              effectiveMatchPool.map((match) => {
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
          <ResultsPanel
            items={scoreBoardItems}
            selectedCount={selectedAnalyses.length}
            enabledMarkets={state.uiState.enabledMarkets}
            matchOverrides={state.uiState.matchOverrides}
            slipMatchSummaries={slipMatchSummaries}
            onToggleMarket={toggleMarket}
            sortKey={scoreSortKey}
            strategyFilter={scoreStrategyFilter}
            oddsOnly={scoreOddsOnly}
            selectedScores={selectedScores}
            onSortKeyChange={setScoreSortKey}
            onStrategyFilterChange={setScoreStrategyFilter}
            onOddsOnlyChange={setScoreOddsOnly}
            onSelectScore={selectScore}
            onSlipLegModeChange={updateSlipLegMode}
          />
        </aside>
      </div>

      <div className="mobile-action-bar">
        <span>{selectedAnalyses.length} 场已选</span>
        <strong>{selectedAnalyses.length > 0 ? '比分池' : '待选择'}</strong>
      </div>
    </main>
  );
}

export default App;
