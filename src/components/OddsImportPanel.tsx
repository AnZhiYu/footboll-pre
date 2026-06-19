import { Clipboard, Database, RefreshCw, Upload } from 'lucide-react';
import { useState } from 'react';
import { parseOddsImports } from '../lib/oddsImport';
import { fetchSportteryOdds } from '../lib/sporttery';
import type { OddsImportItem } from '../lib/oddsImport';

const TEMPLATE = `[
  {
    "teamA": "捷克",
    "teamB": "南非",
    "odds": {
      "winner": { "teamAWin": 2.20, "draw": 3.20, "teamBWin": 3.40 },
      "correctScores": [
        { "score": "1-0", "odds": 6.60 },
        { "score": "1-1", "odds": 7.00 }
      ],
      "totalGoals": [
        { "goals": 2, "odds": 3.40 },
        { "goals": "7+", "odds": 60.00 }
      ]
    }
  },
  {
    "teamA": "瑞士",
    "teamB": "波黑",
    "odds": {
      "winner": null,
      "correctScores": []
    }
  }
]`;

type OddsImportPanelProps = {
  onImportOdds: (imports: OddsImportItem[]) => { matchedCount: number; unmatched: string[] };
  useOddsData: boolean;
  onToggleUseOddsData: () => void;
};

export function OddsImportPanel({ onImportOdds, useOddsData, onToggleUseOddsData }: OddsImportPanelProps) {
  const [open, setOpen] = useState(false);
  const [rawValue, setRawValue] = useState(TEMPLATE);
  const [message, setMessage] = useState('');
  const [fetchingSporttery, setFetchingSporttery] = useState(false);

  const importOdds = () => {
    const parsed = parseOddsImports(rawValue);
    if (!parsed.ok) {
      setMessage(parsed.error);
      return;
    }

    const result = onImportOdds(parsed.imports);
    const unmatchedText =
      result.unmatched.length > 0 ? `；未匹配 ${result.unmatched.length} 场：${result.unmatched.join('、')}` : '';
    setMessage(`已匹配 ${result.matchedCount} 场赔率${unmatchedText}`);
    setOpen(false);
  };

  const importSportteryOdds = async () => {
    setFetchingSporttery(true);
    setMessage('正在拉取竞彩胜平负、波胆、总进球数赔率...');
    try {
      const imports = await fetchSportteryOdds();
      const result = onImportOdds(imports);
      const unmatchedText =
        result.unmatched.length > 0 ? `；未匹配 ${result.unmatched.length} 场：${result.unmatched.join('、')}` : '';
      setRawValue(JSON.stringify(imports, null, 2));
      setMessage(`竞彩接口已拉取 ${imports.length} 场，已匹配 ${result.matchedCount} 场赔率${unmatchedText}`);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `${error.message}。可能被接口风控或网络拦截，请改用手动赔率导入。`
          : '竞彩接口拉取失败，请改用手动赔率导入。',
      );
    } finally {
      setFetchingSporttery(false);
    }
  };

  return (
    <section className="panel odds-panel">
      <div className="panel-heading">
        <div>
          <p>赔率导入</p>
          <strong>独立匹配比赛池</strong>
        </div>
        <div className="odds-panel-actions">
          <label className="market-option odds-usage-option">
            <input
              type="checkbox"
              checked={useOddsData}
              aria-label="使用赔率数据"
              onChange={onToggleUseOddsData}
            />
            使用赔率数据
          </label>
          <button className="secondary-button" type="button" onClick={() => setOpen((value) => !value)}>
            <Upload size={17} />
            导入赔率数据
          </button>
          <button
            className="secondary-button"
            type="button"
            disabled={fetchingSporttery}
            onClick={importSportteryOdds}
          >
            <RefreshCw size={17} />
            {fetchingSporttery ? '拉取中' : '拉取竞彩赔率'}
          </button>
        </div>
      </div>

      {open ? (
        <div className="team-import-box">
          <label>
            赔率数据 JSON
            <textarea
              aria-label="赔率数据 JSON"
              value={rawValue}
              onChange={(event) => setRawValue(event.target.value)}
              rows={9}
            />
          </label>
          <div className="import-actions">
            <button className="secondary-button" type="button" onClick={() => setRawValue(TEMPLATE)}>
              <Clipboard size={16} />
              填入赔率模版
            </button>
            <button className="primary-button" type="button" onClick={importOdds}>
              <Database size={16} />
              确认导入赔率
            </button>
          </div>
        </div>
      ) : null}

      {message ? <p className="import-message">{message}</p> : null}
    </section>
  );
}
