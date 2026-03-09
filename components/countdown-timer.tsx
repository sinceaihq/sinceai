"use client";

import { useEffect, useState } from "react";

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

type EventStatus =
  | "loading"
  | "upcoming"
  | "live"
  | "ended";

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

  if (now >= end) {
    return { status: "ended" };
  }

  if (now >= start) {
    return { status: "live" };
  }

  const timeLeft = calculateTimeLeft(startDate);
  if (timeLeft) {
    return { status: "upcoming", timeLeft };
  }

  return { status: "live" };
}

const TIME_UNITS = ["Days", "Hours", "Minutes", "Seconds"] as const;

export function CountdownTimer({ startDate, endDate }: CountdownTimerProps) {
  const [state, setState] = useState<EventState>({ status: "loading" });

  useEffect(() => {
    const tick = () => {
      setState(getEventState(startDate, endDate));
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startDate, endDate]);

  // Loading state - avoids hydration mismatch
  if (state.status === "loading") {
    return (
      <div className="flex items-center justify-center gap-3 md:gap-6 mb-10">
        {TIME_UNITS.map((label) => (
          <div key={label} className="flex flex-col items-center">
            <div className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-sm">
              <span className="text-2xl md:text-3xl lg:text-4xl font-bold text-white tabular-nums">
                --
              </span>
            </div>
            <span className="text-xs md:text-sm text-neutral-500 mt-2 font-medium uppercase tracking-wider">
              {label}
            </span>
          </div>
        ))}
      </div>
    );
  }

  // Event is upcoming - show countdown
  if (state.status === "upcoming" && state.timeLeft) {
    return (
      <div className="flex items-center justify-center gap-3 md:gap-6 mb-10">
        {TIME_UNITS.map((label) => (
          <div key={label} className="flex flex-col items-center">
            <div className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-sm">
              <span className="text-2xl md:text-3xl lg:text-4xl font-bold text-white tabular-nums">
                {String(state.timeLeft![label.toLowerCase() as keyof TimeLeft]).padStart(2, "0")}
              </span>
            </div>
            <span className="text-xs md:text-sm text-neutral-500 mt-2 font-medium uppercase tracking-wider">
              {label}
            </span>
          </div>
        ))}
      </div>
    );
  }

  // Event is live
  if (state.status === "live") {
    return (
      <div className="mb-10">
        <div className="inline-block px-8 py-4 rounded-2xl bg-green-500/30 backdrop-blur-sm bg-green-950/50 border border-green-500/50">
          <span className="text-xl md:text-2xl font-bold text-green-400 flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            Event is Live!
          </span>
        </div>
      </div>
    );
  }

  // Event has ended
  return (
    <div className="mb-10">
      <div className="inline-block px-8 py-4 rounded-2xl bg-white/10 backdrop-blur-sm bg-black/50 border border-white/20">
        <span className="text-xl md:text-2xl font-bold text-white">
          Event ended, see you next year!
        </span>
      </div>
    </div>
  );
}
