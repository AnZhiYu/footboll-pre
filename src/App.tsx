import { useEffect, useMemo, useState } from 'react';
import { Activity, BookOpen, RotateCcw } from 'lucide-react';
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
  calculateModelTotalGoalsProbabilities,
  calculateModelWinnerProbabilities,
  toggleSelectedScore,
  updateSelectedScoreMode,
} from './lib/scoreBoard';
import './styles.css';

export const APP_VERSION = '2026.06.19.1';

export const buildCacheBustedUrl = (href: string, version: number | string) => {
  const url = new URL(href);
  url.searchParams.set('v', String(version));
  return url.toString();
};

const APP_TITLE = '世界杯预测-AI模型与盘口赔率对比工具';
const RISK_NOTICE =
  '本工具仅用于赛前数据整理、模型复盘与盘口赔率对比，不构成投注建议、投资建议或收益承诺。足球比赛存在大量随机性，请理性看待概率结果，远离赌博风险。';

const getHashRoute = () => (window.location.hash === '#/guide' ? 'guide' : 'app');

const HISTORICAL_STRATEGY_BACKTEST = [
  {
    name: '主推',
    rule: '每场模型 Top2',
    hit: '6/26',
    rate: '23.1%',
    coverage: '26.7%',
    usage: '适合低容错主判断，不适合大池子硬串',
  },
  {
    name: '备选',
    rule: 'Top3 + 3球窗口',
    hit: '11/26',
    rate: '42.3%',
    coverage: '50.5%',
    usage: '覆盖常规比分和 2-1 / 1-2 类边缘结果',
  },
  {
    name: '大比分',
    rule: '总进球 >= 4 的开放局候选',
    hit: '9/26',
    rate: '34.6%',
    coverage: '18.1%',
    usage: '专门抓 3-1 / 2-2 / 4-1 类高波动比分',
  },
  {
    name: '冷门防守',
    rule: 'Top4-6 + 防冷大比分',
    hit: '8/26',
    rate: '30.8%',
    coverage: '33.3%',
    usage: '用于防平、防小冷和主推之外的破坏性比分',
  },
  {
    name: '混合',
    rule: '主推 + 备选 + 冷门防守',
    hit: '15/26',
    rate: '57.7%',
    coverage: '61.3%',
    usage: '更适合先筛比赛，再挑 2-5 场组合',
  },
  {
    name: 'Top7',
    rule: '模型概率前 7 个比分',
    hit: '16/26',
    rate: '61.5%',
    coverage: '68.4%',
    usage: '覆盖最高，但候选多，不能直接等同收益更高',
  },
];

const HISTORICAL_DIRECTION_BACKTEST = [
  {
    name: '胜平负方向',
    hit: '16/26',
    rate: '61.5%',
    note: '比精准比分更稳，适合放在串里降低全比分命中压力',
  },
  {
    name: '进球数 ±1',
    hit: '14/26',
    rate: '53.8%',
    note: '适合辅助判断 2球、3球、4球附近的总进球区间',
  },
  {
    name: '2.5 大小球方向',
    hit: '12/26',
    rate: '46.2%',
    note: '受临场节奏和早球影响较大，需要结合 pace 与赔率',
  },
  {
    name: 'BTTS 方向',
    hit: '8/26',
    rate: '30.8%',
    note: '当前样本偏低，强弱悬殊或保守局不宜机械使用',
  },
];

function GuidePage() {
  return (
    <main className="app-shell guide-shell">
      <header className="app-header guide-header">
        <div>
          <span className="eyebrow">
            <BookOpen size={16} />
            Guide
          </span>
          <h1>使用说明</h1>
        </div>
        <a className="secondary-button guide-back-link" href="#/">
          返回预测工具
        </a>
      </header>

      <section className="guide-content">
        <article className="guide-section">
          <h2>使用方法</h2>
          <p>手机端优先选择比赛数据包，直接查看每场推荐比分、模型概率、赔率、盘口和价值。桌面端可以手动新增比赛、导入球队能力、导入赔率，再按比赛维度筛选比分池。</p>
          <p>推荐结果里可以按模型、赔率、盘口、价值排序，也可以只看有赔率的波胆比分。附加方向项用于辅助判断胜平负、2.5 大小球、BTTS 和进球数。</p>
        </article>

        <article className="guide-section">
          <h2>策略说明</h2>
          <p>主推代表模型概率较高的常规比分；备选比分用于覆盖 Top 区间附近的相邻结果；大比分聚焦总进球偏高的开放局；冷门防守用于保留低概率但可能破坏主推的比分；赔率价值表示模型概率相对盘口隐含概率更有优势的选项。</p>
          <p>大池子不建议直接全场次精准比分连串，更适合先看每场的主推、备选、大比分和冷门防守，再挑 2-5 场组合。</p>
        </article>

        <article className="guide-section">
          <h2>模型规则</h2>
          <p>模型以 attack、defense、stability、pace 四项能力作为输入，使用泊松分布生成 0-7 球的比分概率矩阵。基础进球期望为 1.2，并根据攻防差、稳定性差和比赛节奏修正两队 xG。</p>
          <p>pace 会影响整体进球环境：低 pace 更偏小比分和收敛局，高 pace 更容易出现对攻、大球和比分分散。Top1 概率越高，代表模型越集中；Top1 较低则说明比分剧本更分散。</p>
        </article>

        <article className="guide-section">
          <h2>盘口赔率对比</h2>
          <p>导入赔率后，系统会把波胆赔率转换成盘口隐含概率，并与模型概率对比。价值不是命中承诺，而是用于发现“模型认为概率高于盘口定价”的候选项。</p>
          <p>赔率越低通常代表市场越看好，但不等于一定稳；球队能力用于判断真实比赛风格，赔率用于观察市场定价，两者结合能更好地区分主推、覆盖和防冷。</p>
        </article>

        <article className="guide-section guide-backtest-section">
          <h2>世界杯前序比赛回测</h2>
          <p>样本：26 场已完赛对局，使用项目当前 attack / defense / stability / pace 泊松模型和比分分层策略回测。样本量有限，只用于理解不同策略的覆盖倾向。</p>
          <div className="guide-table-wrap">
            <table className="guide-table">
              <thead>
                <tr>
                  <th>策略</th>
                  <th>候选规则</th>
                  <th>比分命中</th>
                  <th>命中率</th>
                  <th>平均覆盖概率</th>
                  <th>适合用途</th>
                </tr>
              </thead>
              <tbody>
                {HISTORICAL_STRATEGY_BACKTEST.map((row) => (
                  <tr key={row.name}>
                    <td>{row.name}</td>
                    <td>{row.rule}</td>
                    <td>{row.hit}</td>
                    <td>{row.rate}</td>
                    <td>{row.coverage}</td>
                    <td>{row.usage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>方向项回测参考：精准比分 Top1 仅 4/26（15.4%），说明足球比分天然分散；胜平负方向 16/26（61.5%）、进球数 ±1 为 14/26（53.8%），更适合和 1-2 个比分混合使用。</p>
          <div className="guide-table-wrap">
            <table className="guide-table guide-table-compact">
              <thead>
                <tr>
                  <th>方向项</th>
                  <th>命中</th>
                  <th>命中率</th>
                  <th>使用提示</th>
                </tr>
              </thead>
              <tbody>
                {HISTORICAL_DIRECTION_BACKTEST.map((row) => (
                  <tr key={row.name}>
                    <td>{row.name}</td>
                    <td>{row.hit}</td>
                    <td>{row.rate}</td>
                    <td>{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="guide-section">
          <h2>注意事项</h2>
          <p>{RISK_NOTICE}</p>
          <p>微信里如果看到旧页面，可以点击页脚的强制刷新按钮，或分享带有新版 v 参数的链接。</p>
        </article>
      </section>

      <footer className="app-footer">
        <span className="footer-risk-notice">{RISK_NOTICE}</span>
        <span>版本: {APP_VERSION}</span>
        <strong>wechat: grey1896</strong>
      </footer>
    </main>
  );
}

function App() {
  const [route, setRoute] = useState<'app' | 'guide'>(() => getHashRoute());
  const [state, setState] = useState<AppState>(() => loadState());
  const [selectedTeam, setSelectedTeam] = useState<TeamProfile | null>(null);
  const [insightGuideOpen, setInsightGuideOpen] = useState(false);
  const [scoreSortKey, setScoreSortKey] = useState<ScoreSortKey>('probability');
  const [scoreStrategyFilter, setScoreStrategyFilter] = useState<ScoreStrategyFilter>('mainline');
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
          totalGoalsOdds: match?.odds?.totalGoals,
          modelWinnerProbabilities: calculateModelWinnerProbabilities(analysis.matrix),
          modelTotalGoalsProbabilities: calculateModelTotalGoalsProbabilities(analysis.matrix),
        };
      }),
    [effectiveMatchPool, selectedAnalyses],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => saveState(state), 300);
    return () => window.clearTimeout(timer);
  }, [state]);

  useEffect(() => {
    const updateRoute = () => setRoute(getHashRoute());
    window.addEventListener('hashchange', updateRoute);
    return () => window.removeEventListener('hashchange', updateRoute);
  }, []);

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

  const forceRefresh = () => {
    window.location.href = buildCacheBustedUrl(window.location.href, Date.now());
  };

  if (route === 'guide') {
    return <GuidePage />;
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <span className="eyebrow">
            <Activity size={16} />
            AI Model vs Market Odds
          </span>
          <h1>{APP_TITLE}</h1>
        </div>
        <div className="header-actions">
          <a className="secondary-button" href="#/guide">
            <BookOpen size={17} />
            使用说明
          </a>
          <button className="secondary-button" type="button" onClick={resetAll}>
            <RotateCcw size={17} />
            清空重置
          </button>
        </div>
      </header>

      <div className="workspace single-column-workspace" aria-label="预测工具工作台">
        <section className="left-column">
          <MatchPackPanel
            packs={MATCH_PACKS}
            currentPackId={activeMatchPackId}
            onSelectPack={selectMatchPack}
          />

          <section className="panel desktop-workbench-panel" aria-label="手动录入工作台">
            <div className="panel-heading">
              <p>录入入池</p>
              <strong>{state.matchPool.length} 场</strong>
            </div>
            <MatchForm onAddMatch={addMatch} selectedTeam={selectedTeam} />
          </section>

          <div className="desktop-workbench-panel" aria-label="球队导入工作台">
            <TeamImportPanel
              teams={state.teamPool}
              onImportTeams={importTeams}
              onImportMatches={importMatches}
              onUseTeam={(team) => setSelectedTeam(team)}
            />
          </div>

          <div className="desktop-workbench-panel" aria-label="赔率导入工作台">
            <OddsImportPanel
              onImportOdds={importOdds}
              useOddsData={state.uiState.useOddsData}
              onToggleUseOddsData={toggleUseOddsData}
            />
          </div>

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
          <section className="results-section">
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
          </section>
        </section>
      </div>

      <div className="mobile-action-bar mobile-hidden-control" aria-label="手机端选择状态">
        <span>{selectedAnalyses.length} 场已选</span>
        <strong>{selectedAnalyses.length > 0 ? '比分池' : '待选择'}</strong>
      </div>
      <footer className="app-footer">
        <span className="footer-risk-notice">{RISK_NOTICE}</span>
        <span>版本: {APP_VERSION}</span>
        <strong>wechat: grey1896</strong>
        <button className="footer-refresh-button" type="button" onClick={forceRefresh}>
          强制刷新
        </button>
      </footer>
    </main>
  );
}

export default App;
