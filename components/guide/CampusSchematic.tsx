/**
 * Isometric overview of the three event venues — topology only, seen from
 * the north-east. Labelled "schematic, not to scale": it explains the
 * EduCity → courtyard → BioCity/Joki relationship and never replaces the
 * floor plans.
 *
 * Plan coordinates: x = east, y = south (metres-ish, not to scale).
 */

type P3 = [number, number, number];

const COS = Math.cos(Math.PI / 6);
const S = 3.6;
const OX = 434;
const OY = 138;

/** Isometric projection with the viewer in the north-east. */
function iso([x, y, z]: P3): [number, number] {
  return [OX + (-y - x) * COS * S, OY + ((x - y) * 0.5 - z) * S];
}

const pts = (points: P3[]) =>
  points
    .map(iso)
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");

/** Box with its north and east faces (the ones facing the viewer) and top. */
function Box({ x0, y0, x1, y1, h }: { x0: number; y0: number; x1: number; y1: number; h: number }) {
  return (
    <g stroke="var(--color-event)" strokeWidth={1.2} strokeLinejoin="round">
      <polygon
        points={pts([
          [x0, y0, 0],
          [x1, y0, 0],
          [x1, y0, h],
          [x0, y0, h],
        ])}
        fill="var(--color-schematic-front)"
      />
      <polygon
        points={pts([
          [x1, y0, 0],
          [x1, y1, 0],
          [x1, y1, h],
          [x1, y0, h],
        ])}
        fill="var(--color-schematic-side)"
      />
      <polygon
        points={pts([
          [x0, y0, h],
          [x1, y0, h],
          [x1, y1, h],
          [x0, y1, h],
        ])}
        fill="var(--color-event)"
        fillOpacity={0.18}
      />
    </g>
  );
}

function Tower({ cx, cy, r, h }: { cx: number; cy: number; r: number; h: number }) {
  const arc = (z: number, from: number, to: number, steps: number) =>
    Array.from({ length: steps + 1 }, (_, i) => {
      const a = from + ((to - from) * i) / steps;
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r, z] as P3;
    });
  // The half of the wall facing the viewer (north-east): angles −135° … 45°.
  const front = arc(0, (-3 * Math.PI) / 4, Math.PI / 4, 24);
  const side = [
    ...front,
    ...front
      .slice()
      .reverse()
      .map(([x, y]) => [x, y, h] as P3),
  ];
  return (
    <g stroke="var(--color-event)" strokeWidth={1.2}>
      <polygon points={pts(side)} fill="var(--color-schematic-front)" />
      <polygon points={pts(arc(h, 0, Math.PI * 2, 40))} fill="var(--color-event)" fillOpacity={0.28} />
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
    [76, 6, 0],
    [66, -6, 0],
    [48, -13, 0],
    [31.5, -5, 0],
  ];
  const d = route
    .map(iso)
    .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
  const [ex, ey] = iso([30.4, -4.4, 0]);
  const [cx, cy] = iso([58, -16, 0]);

  return (
    <figure className="guide-avoid-break min-w-0">
      <svg viewBox="0 0 540 420" role="img" aria-labelledby="campus-title campus-desc" className="h-auto w-full">
        <title id="campus-title">Schematic overview of the event venues</title>
        <desc id="campus-desc">
          Seen from the north-east. EduCity on the left. About 200 m along the raised campus deck (3 min) leads to
          BioCity&apos;s courtyard-side event entrance on the right. Joki is joined to BioCity; its round tower (the Q&amp;A
          floors) stands on the courtyard. Schematic, not to scale.
        </desc>
        <defs>
          <marker
            id="campus-arrow"
            viewBox="0 0 10 10"
            refX="7"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M0 0 L10 5 L0 10 z" fill="var(--color-event)" />
          </marker>
        </defs>

        <polygon
          points={pts([
            [-4, -26, 0],
            [100, -26, 0],
            [100, 36, 0],
            [-4, 36, 0],
          ])}
          fill="var(--color-fg)"
          fillOpacity={0.015}
          stroke="var(--color-fg)"
          strokeOpacity={0.08}
        />
        <polygon
          points={pts([
            [33, -24, 0],
            [70, -24, 0],
            [70, -3, 0],
            [33, -3, 0],
          ])}
          fill="var(--color-event)"
          fillOpacity={0.07}
          stroke="var(--color-event)"
          strokeOpacity={0.35}
          strokeDasharray="4 5"
        />

        {/* Back to front, as seen from the north-east. */}
        <Box x0={0} y0={-4} x1={30} y1={32} h={14} />
        <Box x0={32} y0={12} x1={54} y1={32} h={6} />
        <Tower cx={43} cy={4} r={6} h={10} />
        <Box x0={72} y0={6} x1={96} y1={34} h={12} />

        <path
          d={d}
          fill="none"
          stroke="var(--color-event)"
          strokeWidth={3}
          strokeDasharray="7 6"
          markerEnd="url(#campus-arrow)"
        />
        <circle cx={ex} cy={ey} r={5} fill="var(--color-event)" />

        <Name at={[15, 14, 18]}>BioCity</Name>
        <Name at={[43, 22, 9]}>Joki</Name>
        <Name at={[84, 20, 16]}>EduCity</Name>
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          fill="var(--color-fg)"
          fillOpacity={0.75}
          fontSize={15}
          fontFamily="var(--font-mono)"
        >
          Courtyard
        </text>
        <text
          x={ex + 10}
          y={ey + 22}
          textAnchor="start"
          fill="var(--color-event)"
          fontSize={15}
          fontWeight={700}
          fontFamily="var(--font-mono)"
        >
          Event entrance
        </text>
        <text
          x={530}
          y={410}
          textAnchor="end"
          fill="var(--color-fg)"
          fillOpacity={0.5}
          fontSize={13}
          fontFamily="var(--font-mono)"
          letterSpacing="2"
        >
          SCHEMATIC · NOT TO SCALE
        </text>
      </svg>
      <figcaption className="mt-4 space-y-1.5 text-xs text-neutral-400">
        <p>
          <span className="font-semibold text-white">EduCity</span>
          {" — "}arrival, opening, briefings, Sunday winners and finals
        </p>
        <p>
          <span className="font-semibold text-white">BioCity</span>
          {" — "}build hall, meals, partner stands
        </p>
        <p>
          <span className="font-semibold text-white">Joki</span>
          {" — "}build areas, Q&amp;A tower, Company Lounge
        </p>
        <p className="pt-1 text-white/55">
          Schematic, not to scale. Doors are signposted on the day — follow volunteers and event signs.
        </p>
      </figcaption>
    </figure>
  );
}
