import type { Match, MatchOdds, MatchOddsSummary, OutcomeOdds, ProbabilityTriplet, ScorePick } from '../types';

const hasPositiveOdds = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 1;

const normalizeTriplet = (odds: OutcomeOdds): ProbabilityTriplet | undefined => {
  const raw = {
    teamAWin: hasPositiveOdds(odds.teamAWin) ? 1 / odds.teamAWin : 0,
    draw: hasPositiveOdds(odds.draw) ? 1 / odds.draw : 0,
    teamBWin: hasPositiveOdds(odds.teamBWin) ? 1 / odds.teamBWin : 0,
  };
  const total = raw.teamAWin + raw.draw + raw.teamBWin;

  if (total <= 0) {
    return undefined;
  }

  return {
    teamAWin: raw.teamAWin / total,
    draw: raw.draw / total,
    teamBWin: raw.teamBWin / total,
  };
};

const getModelWinnerProbabilities = (matrix: ScorePick[]): ProbabilityTriplet =>
  matrix.reduce(
    (totals, pick) => {
      if (pick.homeGoals > pick.awayGoals) {
        totals.teamAWin += pick.probability;
      } else if (pick.homeGoals < pick.awayGoals) {
        totals.teamBWin += pick.probability;
      } else {
        totals.draw += pick.probability;
      }

      return totals;
    },
    { teamAWin: 0, draw: 0, teamBWin: 0 },
  );

const leadingOutcome = (probabilities: ProbabilityTriplet) => {
  const entries = Object.entries(probabilities) as Array<[keyof ProbabilityTriplet, number]>;
  return entries.sort((a, b) => b[1] - a[1])[0][0];
};

const getWinnerVerdict = (model: ProbabilityTriplet, market: ProbabilityTriplet) => {
  const modelLead = leadingOutcome(model);
  const marketLead = leadingOutcome(market);

  if (modelLead === marketLead) {
    return '模型盘口方向一致';
  }

  if (marketLead === 'draw') {
    return '盘口更防平';
  }

  if (modelLead === 'draw') {
    return '模型更防平';
  }

  return '模型盘口方向分歧';
};

const divideTriplet = (model: ProbabilityTriplet, market: ProbabilityTriplet): ProbabilityTriplet => ({
  teamAWin: market.teamAWin > 0 ? model.teamAWin / market.teamAWin : 0,
  draw: market.draw > 0 ? model.draw / market.draw : 0,
  teamBWin: market.teamBWin > 0 ? model.teamBWin / market.teamBWin : 0,
});

const sumProbability = (matrix: ScorePick[], predicate: (pick: ScorePick) => boolean) =>
  matrix.filter(predicate).reduce((total, pick) => total + pick.probability, 0);

export const getBttsProbability = (matrix: ScorePick[]) =>
  sumProbability(matrix, (pick) => pick.homeGoals > 0 && pick.awayGoals > 0);

const POPULAR_TEAMS = new Set([
  '巴西',
  '西班牙',
  '比利时',
  '葡萄牙',
  '荷兰',
  '英格兰',
  '阿根廷',
  '墨西哥',
  '韩国',
  '美国',
  '加拿大',
  '克罗地亚',
]);

type MidOddsCondition = {
  key: string;
  label: string;
  matched: boolean;
  detail: string;
};

export const getMidOddsCandidateInsight = (match: Match, analysis: { matrix: ScorePick[]; homeLambda: number; awayLambda: number }) => {
  const modelWinner = getModelWinnerProbabilities(analysis.matrix);
  const teamAWinOdds = match.odds?.winner?.teamAWin ?? (modelWinner.teamAWin > 0 ? 1 / modelWinner.teamAWin : undefined);
  const bttsProbability = getBttsProbability(analysis.matrix);
  const winnerSpread = Math.max(modelWinner.teamAWin, modelWinner.draw, modelWinner.teamBWin) -
    Math.min(modelWinner.teamAWin, modelWinner.draw, modelWinner.teamBWin);
  const weakerAttack = Math.min(match.homeStats.attack, match.awayStats.attack);
  const weakerXg = Math.min(analysis.homeLambda, analysis.awayLambda);
  const strongerXg = Math.max(analysis.homeLambda, analysis.awayLambda);
  const popularTeams = [match.homeName, match.awayName].filter((teamName) => POPULAR_TEAMS.has(teamName));

  const conditions: MidOddsCondition[] = [
    {
      key: 'teamAWinOdds',
      label: 'A胜赔率 1.60-2.20',
      matched: typeof teamAWinOdds === 'number' && teamAWinOdds >= 1.6 && teamAWinOdds <= 2.2,
      detail: teamAWinOdds ? `A胜 ${teamAWinOdds.toFixed(2)}` : '无胜平负赔率',
    },
    {
      key: 'stableScoring',
      label: '双方有稳定进球能力',
      matched: analysis.homeLambda >= 1 && analysis.awayLambda >= 0.8,
      detail: `xG ${analysis.homeLambda.toFixed(2)} : ${analysis.awayLambda.toFixed(2)}`,
    },
    {
      key: 'btts',
      label: 'BTTS ≥ 50%',
      matched: bttsProbability >= 0.5,
      detail: `BTTS ${(bttsProbability * 100).toFixed(1)}%`,
    },
    {
      key: 'groupRound',
      label: '小组赛第一/第二轮',
      matched: false,
      detail: '当前数据未提供轮次字段',
    },
    {
      key: 'popularHeat',
      label: '热门热度高于真实实力',
      matched: popularTeams.length > 0,
      detail: popularTeams.length > 0 ? `热门队伍: ${popularTeams.join(' / ')}` : '未命中热门队伍名单',
    },
    {
      key: 'notCrushing',
      label: '强队并非绝对碾压',
      matched: winnerSpread <= 0.35 && strongerXg - weakerXg <= 0.75,
      detail: `胜率差 ${(winnerSpread * 100).toFixed(1)}% / xG差 ${(strongerXg - weakerXg).toFixed(2)}`,
    },
    {
      key: 'counterAttack',
      label: '弱队具备反击能力',
      matched: weakerAttack >= 50 && weakerXg >= 0.75,
      detail: `弱侧进攻 ${weakerAttack} / 弱侧xG ${weakerXg.toFixed(2)}`,
    },
  ];
  const matchedCount = conditions.filter((condition) => condition.matched).length;

  return {
    qualified: matchedCount >= 4,
    matchedCount,
    total: conditions.length,
    conditions,
  };
};

export const enrichScoresWithOdds = (matrix: ScorePick[], odds?: MatchOdds): ScorePick[] => {
  const correctScores = odds?.correctScores?.filter((item) => hasPositiveOdds(item.odds)) ?? [];
  if (correctScores.length === 0) {
    return matrix;
  }

  const impliedByScore = new Map(correctScores.map((item) => [item.score, 1 / item.odds]));
  const oddsByScore = new Map(correctScores.map((item) => [item.score, item.odds]));
  const impliedTotal = [...impliedByScore.values()].reduce((sum, value) => sum + value, 0);

  return matrix.map((pick) => {
    const oddsValue = oddsByScore.get(pick.label);
    const impliedProbability = impliedByScore.get(pick.label);
    if (!oddsValue || !impliedProbability || impliedTotal <= 0) {
      return pick;
    }

    const normalizedImpliedProbability = impliedProbability / impliedTotal;

    return {
      ...pick,
      odds: oddsValue,
      impliedProbability,
      normalizedImpliedProbability,
      valueIndex: normalizedImpliedProbability > 0 ? pick.probability / normalizedImpliedProbability : undefined,
      expectedReturn: pick.probability * oddsValue,
    };
  });
};

export const summarizeOdds = (match: Match, matrix: ScorePick[]): MatchOddsSummary | undefined => {
  if (!match.odds) {
    return undefined;
  }

  const summary: MatchOddsSummary = {
    correctScoreCount: match.odds.correctScores?.length ?? 0,
  };

  if (match.odds.winner) {
    const market = normalizeTriplet(match.odds.winner);
    if (market) {
      const model = getModelWinnerProbabilities(matrix);
      summary.winner = {
        model,
        market,
        values: divideTriplet(model, market),
        verdict: getWinnerVerdict(model, market),
      };
    }
  }

  return summary;
};
