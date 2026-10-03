/**
 * Isometric overview of the three event venues — topology only.
 * Labelled "schematic, not to scale": it explains the EduCity → courtyard →
 * BioCity/Joki relationship and never replaces the floor plans.
 */

type P3 = [number, number, number];

const COS = Math.cos(Math.PI / 6);
const S = 4;
const OX = 205;
const OY = 112;

function iso([x, y, z]: P3): [number, number] {
  return [OX + (x - y) * COS * S, OY + ((x + y) * 0.5 - z) * S];
}

const pts = (points: P3[]) =>
  points
    .map(iso)
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");

function Box({ x0, y0, x1, y1, h }: { x0: number; y0: number; x1: number; y1: number; h: number }) {
  return (
    <g stroke="var(--color-event)" strokeWidth={1.2} strokeLinejoin="round">
      <polygon points={pts([[x0, y1, 0], [x1, y1, 0], [x1, y1, h], [x0, y1, h]])} fill="#0d0c16" />
      <polygon points={pts([[x1, y0, 0], [x1, y1, 0], [x1, y1, h], [x1, y0, h]])} fill="#09080f" />
      <polygon points={pts([[x0, y0, h], [x1, y0, h], [x1, y1, h], [x0, y1, h]])} fill="rgba(139,123,255,0.18)" />
    </g>
  );
}

function Tower({ cx, cy, r, h }: { cx: number; cy: number; r: number; h: number }) {
  const ring = (z: number, from = 0, to = Math.PI * 2, steps = 40) =>
    Array.from({ length: steps + 1 }, (_, i) => {
      const a = from + ((to - from) * i) / steps;
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r, z] as P3;
    });
  // Visible half of the side wall (facing the viewer: +x / +y).
  const front = ring(0, -Math.PI / 4, (3 * Math.PI) / 4, 24);
  const side = [...front, ...front.slice().reverse().map(([x, y]) => [x, y, h] as P3)];
  return (
    <g stroke="var(--color-event)" strokeWidth={1.2}>
      <polygon points={pts(side)} fill="#0d0c16" />
      <polygon points={pts(ring(h))} fill="rgba(139,123,255,0.28)" />
    </g>
  );
}

function Name({ at, children }: { at: P3; children: string }) {
  const [x, y] = iso(at);
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fill="#fff"
      fontSize={22}
      fontWeight={700}
      fontFamily="var(--font-mono)"
      paintOrder="stroke"
      stroke="#000"
      strokeWidth={5}
    >
      {children}
    </text>
  );
}

export function CampusSchematic() {
  const route: P3[] = [
    [70, 27, 0],
    [57, 25, 0],
    [46, 18, 0],
    [41.5, 18, 0],
  ];
  const d = route
    .map(iso)
    .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
  const [ex, ey] = iso([40.6, 18, 0]);
  const [cx, cy] = iso([55, 14, 0]);

  return (
    <figure className="guide-avoid-break min-w-0">
      <svg viewBox="0 0 540 420" role="img" aria-labelledby="campus-title campus-desc" className="h-auto w-full">
        <title id="campus-title">Schematic overview of the event venues</title>
        <desc id="campus-desc">
          EduCity on the right. A short outdoor walk across the campus courtyard leads to the BioCity event
          entrance. Joki, with its round Showroom tower facing the courtyard, is connected to BioCity. Schematic,
          not to scale.
        </desc>
        <defs>
          <marker id="campus-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0 0 L10 5 L0 10 z" fill="var(--color-event)" />
          </marker>
        </defs>

        <polygon
          points={pts([[-6, -6, 0], [102, -6, 0], [102, 56, 0], [-6, 56, 0]])}
          fill="rgba(255,255,255,0.015)"
          stroke="rgba(255,255,255,0.08)"
        />
        <polygon
          points={pts([[43, 6, 0], [67, 6, 0], [67, 36, 0], [43, 36, 0]])}
          fill="rgba(139,123,255,0.07)"
          stroke="rgba(139,123,255,0.35)"
          strokeDasharray="4 5"
        />

        <Box x0={0} y0={0} x1={40} y1={30} h={16} />
        <Box x0={14} y0={32} x1={40} y1={50} h={7} />
        <Tower cx={46} cy={41} r={6.5} h={11} />
        <Box x0={70} y0={10} x1={96} y1={44} h={22} />

        <path d={d} fill="none" stroke="var(--color-event)" strokeWidth={3} strokeDasharray="7 6" markerEnd="url(#campus-arrow)" />
        <circle cx={ex} cy={ey} r={5} fill="var(--color-event)" />

        <Name at={[20, 15, 21]}>BioCity</Name>
        <Name at={[27, 41, 12]}>Joki</Name>
        <Name at={[83, 27, 28]}>EduCity</Name>
        <text x={cx} y={cy + 6} textAnchor="middle" fill="rgba(255,255,255,0.75)" fontSize={15} fontFamily="var(--font-mono)">
          Courtyard
        </text>
        <text x={ex - 8} y={ey + 26} textAnchor="end" fill="var(--color-event)" fontSize={15} fontWeight={700} fontFamily="var(--font-mono)">
          Event entrance
        </text>
        <text x={530} y={410} textAnchor="end" fill="rgba(255,255,255,0.5)" fontSize={13} fontFamily="var(--font-mono)" letterSpacing="2">
          SCHEMATIC · NOT TO SCALE
        </text>
      </svg>
      <figcaption className="mt-4 space-y-1.5 text-xs text-neutral-400">
        <p>
          <span className="font-semibold text-white">EduCity</span> — arrival, opening, briefings, closing
        </p>
        <p>
          <span className="font-semibold text-white">BioCity</span> — build hall, meals, partner stands
        </p>
        <p>
          <span className="font-semibold text-white">Joki</span> — build areas, Q&amp;A tower, Company Lounge
        </p>
        <p className="pt-1 text-neutral-500">
          Schematic, not to scale. Doors are signposted on the day — follow volunteers and event signs.
        </p>
      </figcaption>
    </figure>
  );
}
