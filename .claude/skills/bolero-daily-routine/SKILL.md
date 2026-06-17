---
name: bolero-daily-routine
description: Run the Bolero investor's daily research routine for a ~€35k Belgian portfolio. Use when the user asks to "run my morning routine", "do the daily market check", "scan the market", "analyse a stock for Bolero", or names a ticker to evaluate. Performs a market-context scan, news/holdings check, swing scan, long-term review, and runs the structured stock-analysis prompt — pulling live data with WebSearch/WebFetch and finishing with a decision log. Always reminds the user to verify figures and that this is not financial advice.
---

# Bolero Daily Research Routine

A repeatable ~30–45 minute morning routine plus an on-demand single-stock
analysis, for a ~€35,000 portfolio on **Bolero** (Euronext
Brussels/Amsterdam/Paris, Xetra, US NYSE/Nasdaq; returns measured in euros).

Full reference lives in [`bolero-investor-routine/`](../../../bolero-investor-routine/README.md).

> **Always state up front:** this is general information and an educational
> process, **not personalised financial or tax advice**. Verify every figure
> against primary sources (filings, Bolero, TradingView) before trading.

## Fixed risk rules (use these unless the user overrides)

- Per-swing-trade risk = **1% of capital (€350)**. Position size = risk ÷ (entry − stop).
- Long-term: **12–20 positions**, ~€1,750–€3,000 each; single-position cap ~7–10%.
- Minimum **2:1 reward-to-risk** for swings, or skip the trade.
- Belgian frictions: **0.35% TOB each way** (~0.7% round-trip) + **10% capital-gains
  tax above the €10k/yr exemption from 2026**. Favour fewer, higher-conviction trades.

## Mode A — Full morning routine

Run these steps in order. Prefer batching the live-data lookups. Keep it tight.

1. **Market context (5 min).** Use `WebSearch`/`WebFetch` to get current levels &
   direction for: S&P 500 + Nasdaq (and futures), Euro Stoxx 50, **BEL 20, AEX,
   CAC 40, DAX**; **VIX**; US 10-yr + German Bund yields; **EUR/USD**; oil & gold.
   Then check today's **economic & earnings calendar** (ECB/Fed, CPI, jobs).
   Output a one-line **regime read**: risk-on / neutral / risk-off, and flag any
   high-impact release due today (→ avoid taking fresh risk into it).
2. **News & holdings check (5 min).** Search headlines for the user's holdings &
   watchlist (ask for the list if not provided). Note any earnings dates this week.
3. **Swing scan (10 min).** Apply the swing screen: price > 50-day MA (ideally >
   200-day), RSI 40–60 (pullback) or new-high momentum, tight base with volume
   dry-up, high relative strength, leading sector, liquid. Surface the 3–5
   cleanest candidates. For each, give a concrete **entry / stop / target**,
   confirm **≥2:1**, and compute **position size for €350 risk**.
4. **Long-term review (10 min).** Usually no action. Optionally advance one
   watchlist name through the quality checklist (ROIC>15% & >WACC, growing FCF,
   net debt/EBITDA <~3, durable moat, margin of safety). Confirm no held thesis
   is broken (deteriorating ROIC, lost moat, balance-sheet stress).
5. **Decision & log (5 min).** Recommend only **pre-planned** actions. Most
   mornings the correct action is **do nothing**. Emit a dated decision-log
   entry (what / why / orders / alerts to set).

## Mode B — Single-stock analysis (when a ticker is given)

Run the full **Ultimate Stock Analysis Prompt** at
[`bolero-investor-routine/prompts/ultimate-stock-analysis-prompt.md`](../../../bolero-investor-routine/prompts/ultimate-stock-analysis-prompt.md).
Pull live fundamentals/technicals with `WebSearch`/`WebFetch`. Produce all 10
sections (TL;DR verdict → final plan), separate fact from estimate, give the
bear case and the quantitative "broken-thesis" triggers, and end with:
*"Verify these figures against primary sources before trading; I may be wrong or
out of date."*

If asked to *generate* candidates, propose 3–5 names fitting the criteria and run
Mode B on each.

## Output format

End every run with a **Decision Log** block:

```
## Decision Log — <YYYY-MM-DD>
- Regime: <risk-on/neutral/risk-off> | High-impact today: <yes/no, what>
- Holdings/watchlist notes: ...
- Swing candidates: <ticker — entry/stop/target/RR/size> (or "none clean")
- Long-term: <action or "no action; theses intact">
- Action taken: <orders/alerts or "none — do nothing">
- Verify figures against primary sources. Not financial advice.
```

## Notes

- AI/web data can be stale — always caveat and tell the user the as-of date.
- Reddit is for frameworks/ideas, **not** trade signals.
- If outbound network access is blocked by the environment's network policy,
  say so and ask the user to paste the data (or run the routine on the web with
  a network policy that allows finance sites).
