import type { DirectionMarket, ScorePick } from '../types';

export const MARKET_LABELS: Record<DirectionMarket, string> = {
  winner: '胜平负方向',
  overUnder25: '2.5 大小球',
  btts: 'BTTS 双方进球',
};

export const getScoreMarkets = (score: ScorePick, teamAName: string, teamBName: string) => {
  const winner =
    score.homeGoals > score.awayGoals
      ? `${teamAName}胜`
      : score.homeGoals < score.awayGoals
        ? `${teamBName}胜`
        : '平';
  const overUnder25 = score.homeGoals + score.awayGoals >= 3 ? '大' : '小';
  const btts = score.homeGoals > 0 && score.awayGoals > 0 ? '是' : '否';

  return { winner, overUnder25, btts };
};

export const formatEnabledMarkets = (
  score: ScorePick,
  teamAName: string,
  teamBName: string,
  enabledMarkets: DirectionMarket[],
) => {
  const markets = getScoreMarkets(score, teamAName, teamBName);
  return enabledMarkets.map((market) => {
    if (market === 'winner') {
      return `胜平负:${markets.winner}`;
    }

    if (market === 'overUnder25') {
      return `2.5:${markets.overUnder25}`;
    }

    return `BTTS:${markets.btts}`;
  });
};
