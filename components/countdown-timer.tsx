"use client";

import React, { useEffect, useState } from "react";

interface CountdownTimerProps {
  startDate: string;
  endDate: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

type EventStatus = "loading" | "upcoming" | "live" | "ended";

interface EventState {
  status: EventStatus;
  timeLeft?: TimeLeft;
}

function calculateTimeLeft(targetDate: string): TimeLeft | null {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff / 3_600_000) % 24),
    minutes: Math.floor((diff / 60_000) % 60),
    seconds: Math.floor((diff / 1_000) % 60),
  };
}

function getEventState(startDate: string, endDate: string): EventState {
  const now = Date.now();
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();

  if (now >= end) return { status: "ended" };
  if (now >= start) return { status: "live" };

  const timeLeft = calculateTimeLeft(startDate);
  return timeLeft ? { status: "upcoming", timeLeft } : { status: "live" };
}

const UNITS = [
  { key: "days",    label: "days" },
  { key: "hours",   label: "hours" },
  { key: "minutes", label: "min" },
  { key: "seconds", label: "sec" },
] as const;

function CountdownUnits({ timeLeft }: { timeLeft: TimeLeft | Record<string, number> }) {
  return (
    <div
      className="bg-white/[0.04] border border-white/10 px-4 py-3"
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto 1fr auto 1fr auto",
        rowGap: "6px",
        columnGap: "8px",
        alignItems: "center",
        maxWidth: "100%",
      }}
    >
      {/* Label row */}
      <span
        className="text-xs uppercase tracking-widest text-neutral-400 pb-2 border-b border-white/10 mb-1"
        style={{ gridColumn: "1 / -1" }}
      >
        until Since AI Hackathon 2026 begins
      </span>

      {/* Numbers row */}
      {UNITS.map(({ key }, i) => (
        <React.Fragment key={key}>
          <span
            className="text-white font-medium leading-none tabular-nums"
            style={{
              fontSize: "clamp(24px, 6.5vw, 80px)",
              letterSpacing: "-0.03em",
              gridRow: 2,
            }}
          >
            {String(timeLeft[key]).padStart(2, "0")}
          </span>
          {i < UNITS.length - 1 && (
            <span
              className="text-white/25 leading-none text-center"
              style={{
                fontSize: "clamp(16px, 3.5vw, 48px)",
                gridRow: 2,
              }}
            >
              :
            </span>
          )}
        </React.Fragment>
      ))}
      {/* Labels row */}
      {UNITS.map(({ key, label }, i) => (
        <React.Fragment key={`label-${key}`}>
          <span
            className="text-xs uppercase tracking-widest text-neutral-400"
            style={{ gridRow: 3 }}
          >
            {label}
          </span>
          {i < UNITS.length - 1 && <span style={{ gridRow: 3 }} />}
        </React.Fragment>
      ))}
    </div>
  );
}

export function CountdownTimer({ startDate, endDate }: CountdownTimerProps) {
  const [state, setState] = useState<EventState>({ status: "loading" });

  useEffect(() => {
    const tick = () => setState(getEventState(startDate, endDate));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startDate, endDate]);

  if (state.status === "loading") {
    return <CountdownUnits timeLeft={{ days: 0, hours: 0, minutes: 0, seconds: 0 }} />;
  }

  if (state.status === "upcoming" && state.timeLeft) {
    return <CountdownUnits timeLeft={state.timeLeft} />;
  }

  if (state.status === "live") {
    return (
      <p className="text-sm text-green-500 tracking-wide">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-2 align-middle" />
        Event is live
      </p>
    );
  }

  return (
    <p className="text-sm text-neutral-400">
      Event ended — see you next year.
    </p>
  );
}
