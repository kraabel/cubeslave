import type { Guide } from "@/lib/guides";

/** A hand-drawn mark for each guide: an eye, a case file, a quill, a threaded needle. */
export default function GuideGlyph({ kind, speaking = false }: { kind: Guide["glyph"]; speaking?: boolean }) {
  return (
    <svg className="glyph" data-speaking={speaking} viewBox="0 0 48 48" aria-hidden>
      <circle className="halo" cx="24" cy="24" r="22" />
      {kind === "eye" && (
        <>
          <path d="M8 24 Q24 11 40 24 Q24 37 8 24 Z" />
          <circle cx="24" cy="24" r="5.5" />
          <circle className="fill" cx="24" cy="24" r="2" />
        </>
      )}
      {kind === "file" && (
        <>
          <path d="M11 15 H20 L23 18 H37 V34 H11 Z" />
          <path d="M16 24 H32 M16 28.5 H28" />
          <path className="accent" d="M30 13 L34 13 L34 20" />
        </>
      )}
      {kind === "quill" && (
        <>
          <path d="M35 10 Q22 14 17 30 L15 36" />
          <path d="M35 10 Q33 22 20 29" />
          <path d="M22 22 L27 20 M20 26 L25 24" />
          <path className="accent" d="M12 38 H28" />
        </>
      )}
      {kind === "thread" && (
        <>
          <path d="M34 11 L16 33" />
          <ellipse cx="33" cy="12.5" rx="1.6" ry="3" transform="rotate(40 33 12.5)" />
          <path className="accent" d="M33 12 C42 18 30 24 24 30 C18 36 30 40 36 37" />
        </>
      )}
    </svg>
  );
}
