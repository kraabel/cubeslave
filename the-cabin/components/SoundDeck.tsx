"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { audio } from "@/lib/audio";

type Channel = "atmos" | "voice";
type Levels = Record<Channel, number>;

const STORE = "the-cabin:levels";
const DEFAULTS: Levels = { atmos: 0.8, voice: 0.8 };

function load(): Levels {
  try {
    const raw = localStorage.getItem(STORE);
    if (!raw) return DEFAULTS;
    const v = JSON.parse(raw) as Partial<Levels>;
    return {
      atmos: typeof v.atmos === "number" ? v.atmos : DEFAULTS.atmos,
      voice: typeof v.voice === "number" ? v.voice : DEFAULTS.voice,
    };
  } catch {
    return DEFAULTS;
  }
}

function save(l: Levels) {
  try {
    localStorage.setItem(STORE, JSON.stringify(l));
  } catch {
    // Storage can be blocked; levels still work for this visit.
  }
}

/** Moonlit pines. Wind strokes appear and quicken as the level rises. */
function AtmosphereIcon({ level }: { level: number }) {
  const gusts = level === 0 ? 0 : Math.ceil(level * 3);
  const style = { "--gust": `${3.6 - level * 2.2}s`, "--glow": 0.25 + level * 0.75 } as CSSProperties;
  return (
    <svg className="icon atmos-icon" viewBox="0 0 40 40" style={style} aria-hidden>
      <defs>
        <mask id="crescent">
          <rect width="40" height="40" fill="white" />
          <circle cx="33" cy="7" r="5" fill="black" />
        </mask>
      </defs>
      <circle className="moon" cx="30" cy="9" r="5.5" mask="url(#crescent)" />
      <path className="pine" d="M11 34 L11 30 M5 30 L11 16 L17 30 Z M7 25 L11 13 L15 25" />
      <path className="pine far" d="M24 34 L24 31 M19.5 31 L24 21 L28.5 31 Z M21 27 L24 19 L27 27" />
      <line className="ground" x1="2" y1="34.5" x2="38" y2="34.5" />
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          className="gust"
          data-on={i < gusts}
          style={{ animationDelay: `${i * -1.1}s` }}
          d={["M1 20 Q10 16 18 20 T36 19", "M4 26 Q12 22 20 26 T38 25", "M0 14 Q8 11 15 14 T28 13"][i]}
        />
      ))}
      {level > 0 &&
        [7, 18, 33].map((x, i) => <circle key={x} className="ash" cx={x} cy="4" r="0.7" style={{ animationDelay: `${i * -0.9}s` }} />)}
    </svg>
  );
}

/** The oracle's eye. Rings pulse out with the level; at zero the eye closes. */
function VoiceIcon({ level }: { level: number }) {
  const rings = level === 0 ? 0 : Math.ceil(level * 3);
  const style = { "--pulse": `${2.4 - level * 1}s`, "--glow": 0.3 + level * 0.7 } as CSSProperties;
  return (
    <svg className="icon voice-icon" viewBox="0 0 40 40" style={style} aria-hidden>
      {[0, 1, 2].map((i) => (
        <circle key={i} className="ring" data-on={i < rings} cx="20" cy="20" r="9" style={{ animationDelay: `${(i * -2.4) / 3}s` }} />
      ))}
      {level > 0 ? (
        <g className="eye-open">
          <path className="lid" d="M5 20 Q20 7 35 20 Q20 33 5 20 Z" />
          <circle className="iris" cx="20" cy="20" r="5.2" />
          <circle className="pupil" cx="20" cy="20" r="2" />
          <circle className="glint" cx="21.8" cy="18.2" r="0.9" />
        </g>
      ) : (
        <g className="eye-closed">
          <path className="lid" d="M5 19 Q20 29 35 19" />
          <path className="lash" d="M11 23 L9.5 26.5 M16 25 L15.4 28.6 M20 25.5 L20 29.2 M24 25 L24.6 28.6 M29 23 L30.5 26.5" />
        </g>
      )}
    </svg>
  );
}

const CHANNELS: { id: Channel; label: string; Icon: typeof VoiceIcon }[] = [
  { id: "voice", label: "Voice", Icon: VoiceIcon },
  { id: "atmos", label: "Atmosphere", Icon: AtmosphereIcon },
];

export default function SoundDeck() {
  const [levels, setLevels] = useState<Levels>(DEFAULTS);
  const lastHeard = useRef<Levels>(DEFAULTS);

  // Restore saved levels once on the client.
  useEffect(() => {
    const l = load();
    setLevels(l);
    lastHeard.current = { atmos: l.atmos || DEFAULTS.atmos, voice: l.voice || DEFAULTS.voice };
  }, []);

  useEffect(() => {
    audio.setAtmosphere(levels.atmos);
    audio.setVoice(levels.voice);
    save(levels);
  }, [levels]);

  const set = (ch: Channel, v: number) => {
    if (v > 0) lastHeard.current[ch] = v;
    setLevels((l) => ({ ...l, [ch]: v }));
  };

  const toggle = (ch: Channel) => {
    set(ch, levels[ch] > 0 ? 0 : lastHeard.current[ch]);
    audio.hover();
  };

  return (
    <div className="deck" role="group" aria-label="Sound">
      {CHANNELS.map(({ id, label, Icon }) => {
        const v = levels[id];
        return (
          <div className="channel" key={id} data-silent={v === 0}>
            <button
              className="channel-icon"
              onClick={() => toggle(id)}
              aria-label={v > 0 ? `Mute ${label.toLowerCase()}` : `Unmute ${label.toLowerCase()}`}
              aria-pressed={v === 0}
              title={v > 0 ? `Mute ${label.toLowerCase()}` : `Unmute ${label.toLowerCase()}`}
            >
              <Icon level={v} />
            </button>
            <label className="channel-body" htmlFor={`level-${id}`}>
              <span className="channel-label">
                {label}
                <b>{Math.round(v * 100)}</b>
              </span>
              <input
                id={`level-${id}`}
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={v}
                style={{ "--v": `${v * 100}%` } as CSSProperties}
                onChange={(e) => set(id, Number(e.target.value))}
              />
            </label>
          </div>
        );
      })}
    </div>
  );
}
