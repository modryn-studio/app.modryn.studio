# Modryn Studio — Customer Discovery Summary
_Completed April 2026_

---

## The Problem Space

Trading is the domain where the consistency problem is most expensive and measurable. Traders have plans. They break their plans under pressure. The cost is immediate and financial. This is the market Luke understands from the inside — three years of active prop firm trading before founding Modryn.

---

## What We Discovered

### The Central Insight
Every existing trading journal — TraderSync, Edgewonk, Tradervue, TradesViz, and 10+ others — auto-imports trade data from brokers. The manual input problem for trade data is already solved. The gap nobody has closed: **auto-generating the journal narrative**. The trade imports automatically. The trader still has to write the notes, describe the setup, document the deviation, record the emotional state. That's where the friction lives.

### The Agentic Opportunity
All existing tools are built on the assumption that humans do the journaling work. An agentic system that watches trade execution, compares it to a documented plan, and writes the narrative automatically — without the trader typing anything — does not exist. This maps directly to the thesis: proposal/approval UX. The agent generates the entry. The trader reviews and edits if needed.

### The Central Unsolved Problem
**Making the trading plan machine-readable.** Broker connection is solved by existing infrastructure (Tradovate WebSocket, TraderSync/Tradesyncer APIs). The harder problem: trading plans live in traders' heads, notes apps, Discord messages, PDFs. No standard format. The agent can't compare execution against a plan it can't read. This is the problem the team session must solve.

---

## Customer Discovery Conversations

### Messenger Trader
- **Workaround:** Uses Facebook Messenger to log trades — types each trade as a message to himself, numbered, timestamped, waits for TP/SL before hitting send
- **Why Messenger, not a dedicated tool:** It's already open. Frictionless. Dedicated tools require opening another app and manually entering data
- **What would make him switch:** Something that tells him what worked more than what didn't. AI that structures his rough notes so he understands the trade later when reviewing. Screenshot attachment.
- **On automated narrative:** "Absolutely, but I would want to be able to add notes if needed" — confirmed proposal/approval UX
- **Willingness to pay:** $20/month — "If it could actually help me make better decisions tomorrow"
- **Key condition:** The value promise is *better decisions tomorrow*, not better analytics

### Excel Trader
- **Workaround:** Custom Excel spreadsheet as position size calculator and trade log
- **What would make him switch:** Something that does the same thing but with guidance or suggestions on position sizing. Easier to organize.
- **Specific pain:** Has to manually update position size tool after each trade based on account balance or drawdown amount
- **Willingness to pay:** $10/month maybe

### Detailed Trader (Reddit)
- **System:** Four fields only — setup type, planned risk, actual risk, followed plan Y/N, one sentence on deviation
- **Key insight:** "Review improved my trading only when I tied it to hard numbers. Once I saw that most damage came from 2-3 oversized trades, it was obvious what to fix."
- **Signal:** People in the thread immediately asked what tools he uses. He had no good answer. That's the gap.

### Broader Reddit Pattern
- Traders say "data collection is crucial" but don't do it consistently
- Common responses to losing days: revenge trade, step away, ignore the journal
- Multiple traders building their own tools in Lovable/GPT rather than using existing products
- Complaints about existing tools: "made my eyes glass over," "unnecessarily bloated," "not worth the cumbersome structure"
- One trader recommended Tradnite specifically for auto-cutting trades when limits are hit — prop firm compliance as a distinct need

---

## Price Signals

| Trader | Workaround | Price Signal | Condition |
|--------|-----------|-------------|-----------|
| Messenger trader | Facebook Messenger | $20/month | "If it actually helps me make better decisions tomorrow" |
| Excel trader | Custom spreadsheet | $10/month | Position sizing guidance + easier organization |

**The $10-$20 gap matters.** These are different users with different needs. Steve Jobs needs to know this gap exists before locking in a product identity sentence. The Excel trader wants a tool. The Messenger trader wants outcomes.

---

## Competitive Landscape

### What Exists
- **TraderSync** — 900+ broker integrations, AI coaching (Cypher), $30-50/month
- **Edgewonk** — Psychology-focused, deep analytics, highly loyal users, ~$169/year
- **Tradervue** — 200,000+ users, community features, 80+ broker integrations
- **Tradesyncer** — Real-time sync with Tradovate/NinjaTrader/ProjectX, no CSV needed
- **TradesViz** — 600+ stats, AI Q&A, most features at lowest price
- **RizeTrade** — Emotion tagging, rule adherence tracking, psychology-focused
- **FlowFutures** — Native NinjaTrader sync, prop firm compliance tracking built in

### The Actual Gap
All these tools auto-import trade data. None auto-generate the journal narrative. The human context — the why, the plan, the deviation, the emotional state — still requires manual input. That's where the Messenger trader is still using Messenger despite these tools existing.

---

## Technical Assessment (Michelle Lim)

### Path A: Build on existing journal APIs (TraderSync/Tradesyncer webhooks)
- **Timeline:** 1-2 weeks if clean, 4 weeks if messy data format
- **Main risk:** Their schema changes silently and breaks narrative generation with no SLA
- **Advantage:** Someone else maintains the broker connection

### Path B: Direct Tradovate WebSocket
- **Timeline:** 3-4 weeks to do reliably (not just demo)
- **Main risk:** Connection drops at market open — exactly when traders need it most
- **Reality:** Tradovate API is real, documented, and supports JavaScript examples on GitHub

### The Harder Problem (Michelle's key flag)
"Real-time comparison against a documented plan assumes the plan is machine-readable. How is that plan structured and stored? That's the actual complexity — not the broker connection."

**This is the central unsolved problem for the team session.**

---

## What Charlie Concluded

- Signal is real. Validation is not complete.
- One trader at $20/month is a price floor signal, not market validation.
- Four product pivots in one conversation — each logical, none fully validated.
- The machine-readable plan problem is legitimate input for the team.
- **Frame the team session as "here's the central problem to solve" — not "here's what we're building."**
- The $10/$20 price gap between the two traders matters and Steve needs to know it before locking identity.

---

## Product Direction (Current)

**Not greenlit to build. Under active discovery.**

Direction: AI-generated trading journal for prop firm futures traders. Specifically: eliminate manual journal narrative by having an agent watch trade execution, compare to documented plan, and generate the entry automatically. Trader reviews and edits. Proposal/approval UX.

**The roadmap logic:**
- Day 1: Trader writes their plan (manual, structured)
- After each trade: Agent generates journal narrative from execution data + plan comparison
- Over time: Pattern recognition surfaces what works vs. what degrades
- Mature product: Agent generates the plan itself based on accumulated history

**The open question for the team:**
How do you make a trading plan machine-readable without adding friction that kills adoption on day one?

---

## What the Team Session Is For

Not to decide what to build. To attack the machine-readable plan problem with five different thinking frameworks simultaneously:

- **Charlie Munger** — Is this the right problem to solve first? What does this fail at guaranteed?
- **Steve Jobs** — What is this product in one sentence? What's the identity given the $10/$20 price gap?
- **Marc Lou** — What's the smallest version that generates real signal? What ships in days?
- **Michelle Lim** — Can this be built by one person? What's the technical prerequisite sequence?
- **Dieter Rams** — Nothing to evaluate yet. Will note when there's a surface to review.

---

_Document created April 2026. Living document — update as discovery continues._
