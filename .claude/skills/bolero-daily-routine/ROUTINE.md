# Scheduling the Bolero daily routine

The `bolero-daily-routine` skill is the *logic*. To make it actually run every
morning, attach it to a trigger. Pick the option that matches where you run
Claude Code.

## Option 1 — Scheduled session on Claude Code on the web (recommended)

This is the real "daily routine": a cron-style trigger spins up a fresh session
each morning and runs the skill automatically.

1. Open this repo in Claude Code on the web (https://claude.ai/code).
2. Create a **scheduled trigger** for the environment, e.g. weekdays at
   **08:15 CET** (before the 09:00 Euronext open).
3. Set the trigger's prompt to:

   ```
   /bolero-daily-routine
   Run Mode A (full morning routine). My holdings: <TICKERS>.
   My watchlist: <TICKERS>. Post the Decision Log when done.
   ```

4. Make sure the environment's **network policy allows finance sites** (so
   WebSearch/WebFetch can reach market data). See
   https://code.claude.com/docs/en/claude-code-on-the-web for triggers, sources,
   and network policies.

> Note: scheduled triggers are configured in the web UI / environment settings,
> not by a file in the repo — this doc records the intended schedule so it's
> reproducible.

## Option 2 — In-session recurring loop

If you keep a session open, run the routine on an interval with the `loop` skill:

```
/loop 24h /bolero-daily-routine Run Mode A. Holdings: <TICKERS>. Watchlist: <TICKERS>.
```

Caveat: loops live in the current session. On the web's ephemeral containers a
multi-hour loop won't survive container reclaim — use Option 1 for true daily runs.

## Option 3 — Manual

Just type `/bolero-daily-routine` whenever you sit down for your morning check,
optionally followed by a ticker for single-stock analysis (Mode B):

```
/bolero-daily-routine ASML
```

## Suggested cadence

- **Daily (weekday mornings):** Mode A full routine.
- **Before every buy:** Mode B on the specific ticker.
- **Monthly/quarterly:** review win rate / average R, rebalance to target
  weights, harvest the €10k capital-gains exemption, compare vs. a world-index ETF.
