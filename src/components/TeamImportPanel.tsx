import { Clipboard, Database, Upload } from 'lucide-react';
import { useState } from 'react';
import { parseMatchPairs, parseTeamProfiles } from '../lib/teamImport';
import type { TeamProfile } from '../types';

const TEMPLATE = `[
  {
    "team": "奥地利",
    "attack": 76,
    "defense": 74,
    "stability": 78
  },
  {
    "team": "约旦",
    "attack": 58,
    "defense": 60,
    "stability": 63
  }
]`;

type TeamImportPanelProps = {
  teams: TeamProfile[];
  onImportTeams: (profiles: TeamProfile[]) => void;
  onImportMatches: (pairs: [TeamProfile, TeamProfile][]) => void;
  onUseTeam: (profile: TeamProfile) => void;
};

export function TeamImportPanel({ teams, onImportTeams, onImportMatches, onUseTeam }: TeamImportPanelProps) {
  const [open, setOpen] = useState(false);
  const [rawValue, setRawValue] = useState(TEMPLATE);
  const [message, setMessage] = useState('');

  const importTeams = () => {
    const matchPairs = parseMatchPairs(rawValue);
    if (matchPairs.ok) {
      onImportMatches(matchPairs.pairs);
      setMessage(`已导入 ${matchPairs.pairs.length} 场比赛`);
      setOpen(false);
      return;
    }

    const parsed = parseTeamProfiles(rawValue);
    if (!parsed.ok) {
      setMessage(`${matchPairs.error}；${parsed.error}`);
      return;
    }

    onImportTeams(parsed.profiles);
    setMessage(`已导入 ${parsed.profiles.length} 支球队`);
    setOpen(false);
  };

  return (
    <section className="panel team-panel">
      <div className="panel-heading">
        <div>
          <p>球队库</p>
          <strong>{teams.length} 支</strong>
        </div>
        <button className="secondary-button" type="button" onClick={() => setOpen((value) => !value)}>
          <Upload size={17} />
          导入球队数据
        </button>
      </div>

      {open ? (
        <div className="team-import-box">
          <label>
            球队数据 JSON
            <textarea
              aria-label="球队数据 JSON"
              value={rawValue}
              onChange={(event) => setRawValue(event.target.value)}
              rows={9}
            />
          </label>
          <div className="import-actions">
            <button className="secondary-button" type="button" onClick={() => setRawValue(TEMPLATE)}>
              <Clipboard size={16} />
              填入模版
            </button>
            <button className="primary-button" type="button" onClick={importTeams}>
              <Database size={16} />
              确认导入
            </button>
          </div>
        </div>
      ) : null}

      {message ? <p className="import-message">{message}</p> : null}

      {teams.length > 0 ? (
        <div className="team-list">
          {teams.map((team) => (
            <button
              className="team-chip"
              type="button"
              key={team.team}
              aria-label={`使用球队 ${team.team}`}
              onClick={() => onUseTeam(team)}
            >
              <strong>{team.team}</strong>
              <span>
                攻 {team.attack} / 防 {team.defense} / 稳 {team.stability}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
