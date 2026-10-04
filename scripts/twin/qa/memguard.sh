#!/bin/bash
# Memory guard for the campus twin's QA on a shared 16 GB Mac (other projects, Docker).
# Prints an event when free memory gets low; below the hard floor it kills the headless Chromium
# instances that THIS project's scripts started (never the user's own browsers or other projects).
WARN=${WARN:-25}
HARD=${HARD:-15}
MINE="//"
state=ok
mine_shells() {
  for p in $(pgrep -f "chrome-headless-shell|headless_shell" 2>/dev/null); do
    q=$p
    for _ in 1 2 3 4 5 6; do
      q=$(ps -o ppid= -p "$q" 2>/dev/null | tr -d ' ')
      [ -z "$q" ] || [ "$q" = "1" ] && break
      if ps -o command= -p "$q" 2>/dev/null | grep -Eq "$MINE"; then echo "$p"; break; fi
    done
  done
}
while true; do
  if [ -r /proc/meminfo ]; then
    free=$(awk '/MemTotal/ {t=$2} /MemAvailable/ {a=$2} END {printf "%d", 100*a/t}' /proc/meminfo)
  else
    free=$(memory_pressure 2>/dev/null | sed -n 's/.*free percentage: \([0-9]*\)%.*/\1/p')
  fi
  free=${free:-100}
  if [ "$free" -lt "$HARD" ]; then
    pids=$(mine_shells | sort -rn | head -6 | tr '\n' ' ')
    if [ -n "$pids" ]; then kill $pids 2>/dev/null; fi
    echo "MEMORY CRITICAL $(date +%H:%M:%S): ${free}% free — killed project browsers: ${pids:-none}"
    state=critical
  elif [ "$free" -lt "$WARN" ]; then
    [ "$state" = ok ] && echo "memory low $(date +%H:%M:%S): ${free}% free"
    state=low
  else
    [ "$state" != ok ] && echo "memory ok again $(date +%H:%M:%S): ${free}% free"
    state=ok
  fi
  sleep 5
done
