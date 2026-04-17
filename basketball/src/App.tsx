import { useEffect, useState } from 'react';
import './App.css';

const STATS = ['Fouls', 'Points', 'Rebounds', 'Assists'] as const;
type Stat = (typeof STATS)[number];

const STAT_LABELS: Record<Stat, string> = {
  Fouls: 'FOUL',
  Points: 'PTS',
  Rebounds: 'REB',
  Assists: 'AST',
};

type PlayerStats = Record<Stat, number>;

interface Player {
  id: number;
  name: string;
  stats: PlayerStats;
}

interface StoredState {
  players: Player[];
  nextId: number;
}

const STORAGE_KEY = 'basketball-stats-tracker:v1';

function emptyStats(): PlayerStats {
  return { Fouls: 0, Points: 0, Rebounds: 0, Assists: 0 };
}

function parseStoredState(raw: string | null): StoredState {
  if (!raw) return { players: [], nextId: 1 };
  try {
    const parsed = JSON.parse(raw) as Partial<StoredState>;
    const players = Array.isArray(parsed.players)
      ? parsed.players.map((p) => ({
          id: Number(p.id),
          name: String(p.name),
          stats: { ...emptyStats(), ...(p.stats ?? {}) },
        }))
      : [];
    const maxId = players.reduce((m, p) => Math.max(m, p.id), 0);
    const nextId =
      typeof parsed.nextId === 'number' && parsed.nextId > maxId
        ? parsed.nextId
        : maxId + 1;
    return { players, nextId };
  } catch {
    return { players: [], nextId: 1 };
  }
}

function loadState(): StoredState {
  if (typeof window === 'undefined') return { players: [], nextId: 1 };
  try {
    return parseStoredState(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return { players: [], nextId: 1 };
  }
}

function buildTsv(players: Player[]): string {
  const header = ['Player', ...STATS].join('\t');
  const rows = players.map((p) =>
    [p.name, ...STATS.map((s) => p.stats[s])].join('\t'),
  );
  return [header, ...rows].join('\n');
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to legacy fallback.
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export default function App() {
  const initial = loadState();
  const [players, setPlayers] = useState<Player[]>(initial.players);
  const [nameInput, setNameInput] = useState('');
  const [nextId, setNextId] = useState(initial.nextId);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'ok' | 'fail'>('idle');

  useEffect(() => {
    try {
      const payload = JSON.stringify({ players, nextId });
      if (window.localStorage.getItem(STORAGE_KEY) !== payload) {
        window.localStorage.setItem(STORAGE_KEY, payload);
      }
    } catch {
      // Storage full or disabled; ignore.
    }
  }, [players, nextId]);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return;
      const next = parseStoredState(e.newValue);
      setPlayers(next.players);
      setNextId(next.nextId);
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (copyStatus === 'idle') return;
    const t = window.setTimeout(() => setCopyStatus('idle'), 2000);
    return () => window.clearTimeout(t);
  }, [copyStatus]);

  function addPlayer() {
    const name = nameInput.trim();
    if (!name) return;
    setPlayers((prev) => [...prev, { id: nextId, name, stats: emptyStats() }]);
    setNextId((n) => n + 1);
    setNameInput('');
  }

  function increment(playerId: number, stat: Stat) {
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === playerId
          ? { ...p, stats: { ...p.stats, [stat]: p.stats[stat] + 1 } }
          : p,
      ),
    );
  }

  function decrement(playerId: number, stat: Stat) {
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === playerId
          ? {
              ...p,
              stats: { ...p.stats, [stat]: Math.max(0, p.stats[stat] - 1) },
            }
          : p,
      ),
    );
  }

  function removePlayer(playerId: number) {
    setPlayers((prev) => prev.filter((p) => p.id !== playerId));
  }

  function resetAll() {
    if (!window.confirm('Reset all stats to zero? This cannot be undone.')) {
      return;
    }
    setPlayers((prev) => prev.map((p) => ({ ...p, stats: emptyStats() })));
  }

  async function handleCopy() {
    const ok = await copyToClipboard(buildTsv(players));
    setCopyStatus(ok ? 'ok' : 'fail');
  }

  const copyLabel =
    copyStatus === 'ok'
      ? 'Copied!'
      : copyStatus === 'fail'
        ? 'Copy failed'
        : 'Copy Stats';

  return (
    <div className="app">
      <header>
        <h1>Basketball Stats Tracker</h1>
      </header>

      <section className="controls">
        <input
          type="text"
          placeholder="Player name"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addPlayer();
          }}
        />
        <button onClick={addPlayer} disabled={!nameInput.trim()}>
          Add
        </button>
        {players.length > 0 && (
          <button className="secondary" onClick={resetAll}>
            Reset
          </button>
        )}
      </section>

      {players.length === 0 ? (
        <p className="empty">Add a player to get started.</p>
      ) : (
        <div className="grid-wrapper">
          <table className="grid">
            <thead>
              <tr>
                <th className="player-col">Player</th>
                {STATS.map((s) => (
                  <th key={s}>{STAT_LABELS[s]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id}>
                  <td className="player-col">
                    <span className="player-name">{p.name}</span>
                    <button
                      className="remove-btn"
                      onClick={() => removePlayer(p.id)}
                      aria-label={`Remove ${p.name}`}
                    >
                      ×
                    </button>
                  </td>
                  {STATS.map((s) => (
                    <td key={s} className="stat-cell">
                      <button
                        className="stat-btn"
                        onClick={() => increment(p.id, s)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          decrement(p.id, s);
                        }}
                        title="Tap to add. Right-click to subtract."
                      >
                        {p.stats[s]}
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="footer-row">
            <button
              className="copy-btn"
              onClick={handleCopy}
              aria-live="polite"
            >
              {copyLabel}
            </button>
            <p className="hint">Tap a cell to +1. Right-click to -1.</p>
          </div>
        </div>
      )}
    </div>
  );
}
