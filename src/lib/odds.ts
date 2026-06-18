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
        verdict: getWinnerVerdict(model, market),
      };
    }
  }

  return summary;
};
