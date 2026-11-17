/**
 * Film review tool.
 *  - Live preview: the real Remotion compositions run in the browser via @remotion/player,
 *    so every scrub is frame-exact and nothing has to be re-rendered. Any MP4 can be loaded too.
 *  - Timeline: ruler, story beats, note markers, loop range, draggable playhead.
 *  - Notes: timestamped notes stored in the page's shared database (Claude can read them),
 *    falling back to this browser's storage when the database is not available.
 */
import {Player, PlayerRef} from '@remotion/player';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {DURATION_IN_FRAMES, FPS, HEIGHT, SLIP_START_FRAME, WIDTH} from '../core/constants';
import {OfficeWalk} from '../films/office-walk-flat/OfficeWalk';
import {OfficeWalk3D} from '../films/office-walk-3d/OfficeWalk3D';
import {SleepExperiment, SleepExperimentChase, SleepExperimentSide} from '../films/sleep-experiment/SleepExperiment';
import {SCENE1_FRAMES, Scene1Trapped} from '../films/sleep-experiment/scenes/Scene1Trapped';

// ---------------------------------------------------------------- films
type Beat = {frame: number; label: string};
type Film =
  | {id: string; title: string; kind: 'comp'; component: React.FC; frames: number; beats: Beat[]}
  | {id: string; title: string; kind: 'video'; url: string; frames: number; beats: Beat[]};

const COMPS: Film[] = [
  {
    id: 'Scene1Trapped',
    title: 'Scene 1: Trapped',
    kind: 'comp',
    component: Scene1Trapped,
    frames: SCENE1_FRAMES,
    beats: [
      {frame: 150, label: 'Gives up'},
      {frame: 182, label: 'Line'},
      {frame: 230, label: 'Welcome'},
      {frame: 262, label: 'Freeze'},
    ],
  },
  {
    id: 'SleepExperimentSide',
    title: 'Sleep Experiment (run-down, side)',
    kind: 'comp',
    component: SleepExperimentSide,
    frames: DURATION_IN_FRAMES,
    beats: [
      {frame: SLIP_START_FRAME, label: 'Microsleep'},
      {frame: SLIP_START_FRAME + 36, label: 'Jolt'},
    ],
  },
  {
    id: 'SleepExperimentChase',
    title: 'Sleep Experiment (chase)',
    kind: 'comp',
    component: SleepExperimentChase,
    frames: DURATION_IN_FRAMES,
    beats: [
      {frame: SLIP_START_FRAME, label: 'Microsleep'},
      {frame: SLIP_START_FRAME + 36, label: 'Jolt'},
    ],
  },
  {
    id: 'SleepExperiment',
    title: "Sleep Experiment (bird's-eye)",
    kind: 'comp',
    component: SleepExperiment,
    frames: DURATION_IN_FRAMES,
    beats: [
      {frame: SLIP_START_FRAME, label: 'Microsleep'},
      {frame: SLIP_START_FRAME + 36, label: 'Jolt'},
    ],
  },
  {
    id: 'OfficeWalk3D',
    title: 'Office Walk 3D',
    kind: 'comp',
    component: OfficeWalk3D,
    frames: DURATION_IN_FRAMES,
    beats: [{frame: SLIP_START_FRAME, label: 'Sheet slips'}],
  },
  {
    id: 'OfficeWalk',
    title: 'Office Walk (flat)',
    kind: 'comp',
    component: OfficeWalk,
    frames: DURATION_IN_FRAMES,
    beats: [{frame: SLIP_START_FRAME, label: 'Sheet slips'}],
  },
];

// ---------------------------------------------------------------- time helpers
const tc = (frame: number) => {
  const f = Math.max(0, Math.round(frame));
  const s = Math.floor(f / FPS);
  const ff = f % FPS;
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}:${String(ff).padStart(2, '0')}`;
};
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

// ---------------------------------------------------------------- notes store
type Kind = 'fix' | 'idea' | 'keep';
type Note = {id: string; film: string; frame: number; text: string; kind: Kind; done: boolean; createdAt: number};
type StoreStatus = 'loading' | 'live' | 'slow' | 'local' | 'error' | 'readonly';
const KINDS: {id: Kind; label: string}[] = [
  {id: 'fix', label: 'Fix'},
  {id: 'idea', label: 'Idea'},
  {id: 'keep', label: 'Keep'},
];
const LOCAL_KEY = 'film-review-notes';
const readLocal = (): Note[] => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
  } catch {
    return [];
  }
};
const writeLocal = (n: Note[]) => {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(n));
  } catch {
    /* storage blocked: keep in memory only */
  }
};

const useNotes = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [status, setStatus] = useState<StoreStatus>('loading');
  const dbRef = useRef<any>(null);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    (async () => {
      const claude = (window as any).claude;
      const db = claude?.use ? await claude.use('db') : null;
      if (cancelled) return;
      if (!db) {
        setNotes(readLocal());
        setStatus('local');
        return;
      }
      dbRef.current = db;
      const user = await claude.use('user');
      const canWrite = user ? await user.can('data.write') : null;
      timer = setTimeout(() => setStatus((s) => (s === 'loading' ? 'slow' : s)), 10000);
      unsub = db.collection('notes').onSnapshot(
        (snap: any) => {
          setNotes(snap.docs.map((d: any) => ({id: d.id, ...(d.data() as object)}) as Note));
          if (!snap.metadata.fromCache) {
            clearTimeout(timer);
            setStatus(canWrite === false ? 'readonly' : 'live');
          }
        },
        () => {
          clearTimeout(timer);
          setStatus('error');
        },
      );
    })();
    return () => {
      cancelled = true;
      unsub?.();
      clearTimeout(timer);
    };
  }, []);

  const local = useCallback((fn: (n: Note[]) => Note[]) => {
    setNotes((prev) => {
      const next = fn(prev);
      writeLocal(next);
      return next;
    });
  }, []);

  const add = useCallback(
    async (n: Omit<Note, 'id'>) => {
      const db = dbRef.current;
      if (!db) return local((p) => [...p, {...n, id: `l${Date.now()}`}]);
      try {
        await db.collection('notes').add(n);
      } catch (e: any) {
        setStatus(e?.code === 'invalid_argument' ? 'readonly' : 'error');
      }
    },
    [local],
  );
  const update = useCallback(
    async (id: string, patch: Partial<Note>) => {
      const db = dbRef.current;
      if (!db) return local((p) => p.map((x) => (x.id === id ? {...x, ...patch} : x)));
      try {
        await db.doc(`notes/${id}`).update(patch);
      } catch {
        setStatus('error');
      }
    },
    [local],
  );
  const remove = useCallback(
    async (id: string) => {
      const db = dbRef.current;
      if (!db) return local((p) => p.filter((x) => x.id !== id));
      try {
        await db.doc(`notes/${id}`).delete();
      } catch {
        setStatus('error');
      }
    },
    [local],
  );
  return {notes, status, add, update, remove};
};

// ---------------------------------------------------------------- transport
type Transport = {
  frame: number;
  playing: boolean;
  toggle: () => void;
  pause: () => void;
  seek: (f: number) => void;
};

/** Video-file transport: drives an HTMLVideoElement, frames assume 60 fps. */
const useVideoTransport = (video: HTMLVideoElement | null, frames: number, loop: [number, number] | null, rate: number) => {
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!video) return;
    video.playbackRate = rate;
  }, [video, rate]);
  useEffect(() => {
    if (!video) return;
    let raf = 0;
    const tick = () => {
      let f = Math.round(video.currentTime * FPS);
      if (loop && !video.paused && f >= loop[1]) {
        video.currentTime = loop[0] / FPS;
        f = loop[0];
      }
      setFrame(clamp(f, 0, frames - 1));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const on = () => setPlaying(!video.paused);
    video.addEventListener('play', on);
    video.addEventListener('pause', on);
    return () => {
      cancelAnimationFrame(raf);
      video.removeEventListener('play', on);
      video.removeEventListener('pause', on);
    };
  }, [video, frames, loop]);
  return {
    frame,
    playing,
    toggle: () => (video?.paused ? video.play().catch(() => {}) : video?.pause()),
    pause: () => video?.pause(),
    seek: (f: number) => {
      if (video) video.currentTime = clamp(f, 0, frames - 1) / FPS + 0.0001;
      setFrame(clamp(f, 0, frames - 1));
    },
  } as Transport;
};

const usePlayerTransport = (ref: React.RefObject<PlayerRef>, frames: number, key: string): Transport => {
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const p = ref.current;
    if (!p) return;
    const onFrame = (e: any) => setFrame(e.detail.frame);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    p.addEventListener('frameupdate', onFrame);
    p.addEventListener('seeked', onFrame);
    p.addEventListener('play', onPlay);
    p.addEventListener('pause', onPause);
    p.addEventListener('ended', onPause);
    setFrame(p.getCurrentFrame());
    return () => {
      p.removeEventListener('frameupdate', onFrame);
      p.removeEventListener('seeked', onFrame);
      p.removeEventListener('play', onPlay);
      p.removeEventListener('pause', onPause);
      p.removeEventListener('ended', onPause);
    };
  }, [ref, key]);
  return {
    frame,
    playing,
    toggle: () => ref.current?.toggle(),
    pause: () => ref.current?.pause(),
    seek: (f: number) => {
      const t = clamp(Math.round(f), 0, frames - 1);
      ref.current?.seekTo(t);
      setFrame(t);
    },
  };
};

// ---------------------------------------------------------------- timeline
const Timeline: React.FC<{
  frames: number;
  frame: number;
  beats: Beat[];
  notes: Note[];
  loop: [number, number] | null;
  onSeek: (f: number) => void;
  onScrubStart: () => void;
  onPickNote: (n: Note) => void;
}> = ({frames, frame, beats, notes, loop, onSeek, onScrubStart, onPickNote}) => {
  const ref = useRef<HTMLDivElement>(null);
  const toFrame = (clientX: number) => {
    const r = ref.current!.getBoundingClientRect();
    return Math.round(clamp((clientX - r.left) / r.width, 0, 1) * (frames - 1));
  };
  const pct = (f: number) => `${(f / (frames - 1)) * 100}%`;
  const seconds = Math.floor((frames - 1) / FPS);
  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-marker]')) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    onScrubStart();
    onSeek(toFrame(e.clientX));
  };
  const onMove = (e: React.PointerEvent) => {
    if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) onSeek(toFrame(e.clientX));
  };
  return (
    <div className="timeline">
      <div className="tl-labels" aria-hidden="true">
        <span>Time</span>
        <span>Beats</span>
        <span>Notes</span>
      </div>
      <div
        className="tl-body"
        ref={ref}
        onPointerDown={onDown}
        onPointerMove={onMove}
        role="slider"
        aria-label="Playhead"
        aria-valuemin={0}
        aria-valuemax={frames - 1}
        aria-valuenow={frame}
        aria-valuetext={tc(frame)}
        tabIndex={0}
      >
        {loop ? <div className="tl-loop" style={{left: pct(loop[0]), width: `calc(${pct(loop[1])} - ${pct(loop[0])})`}} /> : null}
        <div className="tl-ruler">
          {Array.from({length: Math.floor((frames - 1) / 10) + 1}, (_, i) => i * 10).map((f) => (
            <span key={f} className={f % FPS === 0 ? 'tick major' : 'tick'} style={{left: pct(f)}} />
          ))}
          {Array.from({length: seconds + 1}, (_, s) => (
            <span key={s} className="tick-label" style={{left: pct(s * FPS)}}>
              {s}s
            </span>
          ))}
        </div>
        <div className="tl-track">
          {beats.map((b) => (
            <span key={b.frame} className="beat" style={{left: pct(b.frame)}} title={`${b.label} · ${tc(b.frame)}`}>
              <i />
              <b>{b.label}</b>
            </span>
          ))}
        </div>
        <div className="tl-track">
          {notes.map((n) => (
            <button
              key={n.id}
              data-marker
              className={`marker k-${n.kind}${n.done ? ' done' : ''}`}
              style={{left: pct(n.frame)}}
              title={`${tc(n.frame)} · ${n.text}`}
              onClick={() => onPickNote(n)}
              aria-label={`Note at ${tc(n.frame)}: ${n.text}`}
            />
          ))}
        </div>
        <div className="playhead" style={{left: pct(frame)}}>
          <span>{frame}</span>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- notes panel
const NotesPanel: React.FC<{
  film: Film;
  frame: number;
  notes: Note[];
  status: StoreStatus;
  activeId: string | null;
  composerRef: React.RefObject<HTMLTextAreaElement>;
  onAdd: (text: string, kind: Kind) => void;
  onSeek: (n: Note) => void;
  onToggle: (n: Note) => void;
  onDelete: (n: Note) => void;
}> = ({film, frame, notes, status, activeId, composerRef, onAdd, onSeek, onToggle, onDelete}) => {
  const [text, setText] = useState('');
  const [kind, setKind] = useState<Kind>('fix');
  const [filter, setFilter] = useState<'open' | 'done' | 'all'>('open');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const readOnly = status === 'readonly';
  const sorted = useMemo(() => [...notes].sort((a, b) => a.frame - b.frame || a.createdAt - b.createdAt), [notes]);
  const shown = sorted.filter((n) => (filter === 'all' ? true : filter === 'done' ? n.done : !n.done));
  const openCount = notes.filter((n) => !n.done).length;
  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const t = text.trim();
    if (!t || readOnly) return;
    onAdd(t, kind);
    setText('');
  };
  const copyAll = async () => {
    const body = [`Review notes · ${film.title} (${film.id})`, ...sorted.map((n) => `${n.done ? '[done] ' : ''}${tc(n.frame)} (frame ${n.frame}) [${n.kind}] ${n.text}`)].join('\n');
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };
  const statusText: Record<StoreStatus, string> = {
    loading: 'Connecting to saved notes…',
    live: 'Notes save to this page. Claude can read them.',
    slow: "Saved notes can't be reached yet. New notes will sync when they can.",
    local: 'Notes are saved in this browser only.',
    error: "Couldn't save the last change. Check your connection and try again.",
    readonly: 'You can read these notes. Only the owner and editors can add them.',
  };
  return (
    <section className="notes" aria-label="Notes">
      <form className="composer" onSubmit={submit}>
        <div className="composer-head">
          <span className="at">
            Note at <strong>{tc(frame)}</strong> <em>frame {frame}</em>
          </span>
          <div className="kinds" role="radiogroup" aria-label="Note type">
            {KINDS.map((k) => (
              <button
                type="button"
                key={k.id}
                role="radio"
                aria-checked={kind === k.id}
                className={`kind k-${k.id}${kind === k.id ? ' on' : ''}`}
                onClick={() => setKind(k.id)}
              >
                {k.label}
              </button>
            ))}
          </div>
        </div>
        <textarea
          id="note-text"
          ref={composerRef}
          value={text}
          disabled={readOnly}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
            if (e.key === 'Escape') (e.target as HTMLTextAreaElement).blur();
          }}
          placeholder="What should change here? e.g. head drop is too slow, jolt needs a sound"
          rows={3}
        />
        <div className="composer-foot">
          <span className="hint">Ctrl + Enter to add</span>
          <button className="primary" type="submit" disabled={!text.trim() || readOnly}>
            Add note
          </button>
        </div>
      </form>

      <div className="list-head">
        <div className="filters" role="tablist" aria-label="Filter notes">
          {(['open', 'done', 'all'] as const).map((f) => (
            <button key={f} role="tab" aria-selected={filter === f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>
              {f === 'open' ? `Open ${openCount}` : f === 'done' ? `Done ${notes.length - openCount}` : `All ${notes.length}`}
            </button>
          ))}
        </div>
        <button className="ghost" onClick={copyAll} disabled={!notes.length}>
          {copied ? 'Copied' : 'Copy all'}
        </button>
      </div>

      <ol className="list">
        {shown.length === 0 ? (
          <li className="empty">
            {notes.length === 0
              ? 'No notes on this film yet. Pause where something looks off, press N, and write what should change.'
              : filter === 'open'
                ? 'Everything here is done.'
                : 'Nothing in this filter.'}
          </li>
        ) : (
          shown.map((n) => (
            <li key={n.id} className={`note k-${n.kind}${n.done ? ' done' : ''}${activeId === n.id ? ' active' : ''}`}>
              <button className="stamp" onClick={() => onSeek(n)} title="Jump to this frame">
                {tc(n.frame)}
              </button>
              <div className="body">
                <span className="pill">{KINDS.find((k) => k.id === n.kind)?.label}</span>
                <p>{n.text}</p>
              </div>
              <div className="actions">
                <button className="ghost small" onClick={() => onToggle(n)} disabled={readOnly}>
                  {n.done ? 'Reopen' : 'Done'}
                </button>
                {confirmId === n.id ? (
                  <button
                    className="danger small"
                    onClick={() => {
                      onDelete(n);
                      setConfirmId(null);
                    }}
                  >
                    Confirm delete
                  </button>
                ) : (
                  <button className="ghost small" onClick={() => setConfirmId(n.id)} disabled={readOnly}>
                    Delete
                  </button>
                )}
              </div>
            </li>
          ))
        )}
      </ol>
      <p className={`status s-${status}`}>{statusText[status]}</p>
    </section>
  );
};

// ---------------------------------------------------------------- app
const App: React.FC = () => {
  const [films, setFilms] = useState<Film[]>(COMPS);
  const [filmId, setFilmId] = useState(COMPS[0].id);
  const film = films.find((f) => f.id === filmId) ?? films[0];
  const [rate, setRate] = useState(1);
  const [loop, setLoop] = useState<[number, number] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const playerRef = useRef<PlayerRef>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const {notes, status, add, update, remove} = useNotes();

  const playerT = usePlayerTransport(playerRef, film.frames, film.id);
  const videoT = useVideoTransport(film.kind === 'video' ? video : null, film.frames, loop, rate);
  const t = film.kind === 'comp' ? playerT : videoT;
  const filmNotes = useMemo(() => notes.filter((n) => n.film === film.id), [notes, film.id]);

  // reset per film
  useEffect(() => {
    setLoop(null);
    setActiveId(null);
  }, [film.id]);

  const step = useCallback((d: number) => {
    t.pause();
    t.seek(t.frame + d);
  }, [t]);

  const setIn = () => setLoop((l) => [t.frame, Math.max(t.frame + 1, l?.[1] ?? film.frames - 1)]);
  const setOut = () => setLoop((l) => [Math.min(l?.[0] ?? 0, t.frame - 1), t.frame]);

  // keyboard shortcuts (ignored while typing)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT' || el.tagName === 'SELECT')) return;
      const k = e.key.toLowerCase();
      if (k === ' ') {
        e.preventDefault();
        t.toggle();
      } else if (k === 'arrowleft') {
        e.preventDefault();
        step(e.shiftKey ? -10 : -1);
      } else if (k === 'arrowright') {
        e.preventDefault();
        step(e.shiftKey ? 10 : 1);
      } else if (k === 'home') t.seek(0);
      else if (k === 'end') t.seek(film.frames - 1);
      else if (k === 'i') setIn();
      else if (k === 'o') setOut();
      else if (k === 'x') setLoop(null);
      else if (k === 'n') {
        e.preventDefault();
        t.pause();
        composerRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const loadFile = (file: File) => {
    const url = URL.createObjectURL(file);
    const probe = document.createElement('video');
    probe.preload = 'metadata';
    probe.onloadedmetadata = () => {
      const frames = Math.max(2, Math.round(probe.duration * FPS));
      const id = `file:${file.name}`;
      setFilms((fs) => [...fs.filter((f) => f.id !== id), {id, title: file.name, kind: 'video', url, frames, beats: []}]);
      setFilmId(id);
    };
    probe.src = url;
  };

  const seekToNote = (n: Note) => {
    t.pause();
    t.seek(n.frame);
    setActiveId(n.id);
  };

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <span className="rec" aria-hidden="true" />
          <h1>Film Review</h1>
        </div>
        <nav className="films" aria-label="Films">
          {films.map((f) => (
            <button key={f.id} className={f.id === film.id ? 'on' : ''} onClick={() => setFilmId(f.id)}>
              {f.title}
              <span className="count">{notes.filter((n) => n.film === f.id && !n.done).length || ''}</span>
            </button>
          ))}
          <button className="ghost" onClick={() => fileRef.current?.click()}>
            Load video file
          </button>
          <input
            id="file-input"
            ref={fileRef}
            type="file"
            accept="video/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) loadFile(f);
              e.target.value = '';
            }}
          />
        </nav>
      </header>

      <main className="stage">
        <section className="viewer" aria-label="Preview">
          <div className="screen">
            {film.kind === 'comp' ? (
              <Player
                key={film.id}
                ref={playerRef}
                component={film.component}
                durationInFrames={film.frames}
                fps={FPS}
                compositionWidth={WIDTH}
                compositionHeight={HEIGHT}
                style={{width: '100%', height: '100%'}}
                controls={false}
                loop
                inFrame={loop?.[0] ?? null}
                outFrame={loop?.[1] ?? null}
                playbackRate={rate}
                clickToPlay
                spaceKeyToPlayOrPause={false}
                acknowledgeRemotionLicense
              />
            ) : (
              <video key={film.id} ref={setVideo} src={film.url} playsInline loop={!loop} onClick={() => t.toggle()} />
            )}
          </div>
          <div className="readout">
            <span className="time">{tc(t.frame)}</span>
            <span className="of">/ {tc(film.frames - 1)}</span>
            <span className="meta">
              frame {t.frame} · {FPS} fps{film.kind === 'video' ? ' (assumed)' : ' · live'}
            </span>
          </div>
        </section>

        <NotesPanel
          film={film}
          frame={t.frame}
          notes={filmNotes}
          status={status}
          activeId={activeId}
          composerRef={composerRef}
          onAdd={(text, kind) => add({film: film.id, frame: t.frame, text, kind, done: false, createdAt: Date.now()})}
          onSeek={seekToNote}
          onToggle={(n) => update(n.id, {done: !n.done})}
          onDelete={(n) => remove(n.id)}
        />
      </main>

      <footer className="dock">
        <div className="transport">
          <button onClick={() => t.seek(0)} aria-label="Go to start" title="Start (Home)">
            ⏮
          </button>
          <button onClick={() => step(-1)} aria-label="Back one frame" title="Back 1 frame (←)">
            −1
          </button>
          <button className="play" onClick={() => t.toggle()} aria-label={t.playing ? 'Pause' : 'Play'} title="Play / pause (Space)">
            {t.playing ? '❚❚' : '▶'}
          </button>
          <button onClick={() => step(1)} aria-label="Forward one frame" title="Forward 1 frame (→)">
            +1
          </button>
          <button onClick={() => t.seek(film.frames - 1)} aria-label="Go to end" title="End (End)">
            ⏭
          </button>
          <span className="sep" />
          <button onClick={setIn} title="Loop start (I)">
            In
          </button>
          <button onClick={setOut} title="Loop end (O)">
            Out
          </button>
          <button onClick={() => setLoop(null)} disabled={!loop} title="Clear loop (X)">
            {loop ? `Loop ${tc(loop[0])}–${tc(loop[1])} ✕` : 'No loop'}
          </button>
          <span className="sep" />
          <label className="rate" htmlFor="rate">
            Speed
            <select id="rate" value={rate} onChange={(e) => setRate(Number(e.target.value))}>
              <option value={0.25}>0.25×</option>
              <option value={0.5}>0.5×</option>
              <option value={1}>1×</option>
            </select>
          </label>
          <button
            className="primary add"
            onClick={() => {
              t.pause();
              composerRef.current?.focus();
            }}
            title="New note at this frame (N)"
          >
            + Note
          </button>
        </div>
        <Timeline
          frames={film.frames}
          frame={t.frame}
          beats={film.beats}
          notes={filmNotes}
          loop={loop}
          onSeek={(f) => t.seek(f)}
          onScrubStart={() => t.pause()}
          onPickNote={seekToNote}
        />
        <p className="keys">
          <kbd>Space</kbd> play · <kbd>←</kbd>
          <kbd>→</kbd> frame · <kbd>Shift</kbd>+arrows 10 frames · <kbd>I</kbd>/<kbd>O</kbd> loop · <kbd>N</kbd> note
        </p>
      </footer>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(<App />);
