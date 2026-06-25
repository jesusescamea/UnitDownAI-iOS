# UnitDown 2.0 — Product Charter

> **"Every rooftop unit should have a memory."**

> **"Equipment is the center of the platform. AI is a tool attached to the equipment — not the other way around."**

> **"UnitDown does not compete with OEM software. It complements it."**

---

## Mission

Save commercial HVAC technicians time. Reduce forgotten information. Reduce app switching. Reduce callbacks. Create a living history for every commercial HVAC unit they touch.

UnitDown exists to give every technician — from a one-person independent operator to a seasoned commercial specialist — a single, organized workspace they open first every morning and close last every afternoon.

---

## Product Vision

UnitDown is the **Commercial HVAC Workspace**.

It is not an AI diagnostic app with some extra features. It is not a note-taking tool. It is not a digital notepad. It is a purpose-built professional workspace designed around the daily reality of commercial HVAC field work.

The platform organizes a technician's entire workday:

- The units they manage
- The history of every unit they've ever touched
- The diagnoses they've run
- The repairs they've documented
- The follow-ups they need to schedule
- The reminders they need to honor

Everything centers around **equipment**. Every feature exists to serve that equipment record.

---

## North Star

A commercial HVAC technician should be able to arrive at any job site, pull up that unit's full history, run an AI-powered diagnosis, photograph the nameplate and fault codes, log their findings, and schedule a return visit — without ever opening another app.

**Measure of success:** How often do technicians open UnitDown on a typical workday? If the answer is more than three times per day, the platform is working.

---

## Product Philosophy

Every feature must answer YES to these four questions before it is built:

1. **Does it solve a real field problem?** — Not a theoretical problem, not a marketing problem. A problem a technician faces on a rooftop or in a mechanical room.
2. **Does it save technicians time?** — Every tap, every search, every input costs time. Features that cost more time than they save are liabilities.
3. **Does it make technicians open UnitDown more often?** — Stickiness comes from utility, not from lock-in. If it doesn't make the app indispensable, it doesn't belong.
4. **Does it strengthen UnitDown as the Commercial HVAC Workspace?** — Every feature either reinforces the platform story or dilutes it.

If the answer to any of these is NO — do not build it.

---

## Target Customers

### Free Tier
- Occasional commercial HVAC technician
- OEM technician using UnitDown alongside company software
- Students and new technicians learning diagnostics
- Residential technicians occasionally handling light commercial

### Pro Tier
- Independent commercial HVAC technicians
- Owner-operators managing their own client base
- Commercial specialists using UnitDown throughout the workday
- Technicians managing 10+ units across multiple sites

### Business Tier (Future)
- Commercial HVAC service companies
- Teams of 2–20 technicians
- Service managers needing company-wide dashboards
- Companies wanting shared equipment libraries across technicians

---

## Competitive Positioning

**UnitDown does not compete with OEM software. It complements it.**

Manufacturer diagnostic tools (Carrier iComfort, Trane Diagnostics, Daikin service apps) are excellent for their specific equipment lines. UnitDown serves a different need: the technician who works on Carrier RTUs in the morning, Trane chillers at noon, and York split systems in the afternoon — and needs one place that remembers all of it.

UnitDown is brand-agnostic by design. It is the technician's personal workspace, not the manufacturer's service portal.

---

## Equipment-First Architecture

The foundational architectural decision of UnitDown 2.0 is that **equipment records are the primary entity** in the system. Everything else — diagnoses, photos, reminders, notes, timeline events — belongs to a unit.

**What this means in practice:**

- A diagnosis without a unit is less valuable than a diagnosis attached to a unit
- The AI should be launched from within a unit record, not as a standalone first step
- The nameplate scanner exists to populate an equipment record, not to produce standalone data
- Reminders and PM schedules belong to units, not to abstract calendar events
- The technician's history is organized by unit, not by date or by feature used

**What this means for design:**

- Equipment Library is the second-most-important screen in the app (after My Workspace)
- Equipment Detail is the most information-dense screen and must never feel cluttered
- Every quick action on every screen should offer the option to attach to a unit

---

## Free Feature Set

The Free tier must feel complete. It must never feel intentionally crippled. Limitations are **capacity limits**, not capability removals.

### Included in Free (after 7-day Pro Trial)

| Feature | Free Limit |
|---|---|
| AI Diagnostics | 1 per 24 hours |
| Nameplate Scanner | Unlimited |
| OCR Capture & Copy | Unlimited |
| Equipment Library | Max 10 units |
| Equipment Timeline | Unlimited (read) |
| Equipment Photos | Unlimited |
| Equipment Resources | Unlimited |
| Basic Field Hub | Included |
| Equipment Search | Included |
| Diagnostic History | Included |
| Calendar | Historical only (no future planning) |
| Edit today's work | Included |
| Edit previous work | Included |

### 7-Day Pro Trial
All new accounts receive a 7-day Pro Trial with 25 initial diagnostic credits. This gives technicians a complete experience of the platform before hitting any capacity limits. The goal of the trial is not urgency — it is familiarity.

### Free Experience Goal
A Free user should think: *"I use this almost every day."* — not *"I need to upgrade immediately."*

If Free users feel frustrated or blocked, the platform has failed. Capacity limits should feel like natural growth moments, not walls.

---

## Pro Feature Set

Pro removes limits. It does not reveal a different application. Everything already exists in Free — Pro simply unlocks unlimited capacity and future-planning capabilities.

### Pro Includes Everything in Free, Plus:

| Feature | Pro |
|---|---|
| AI Diagnostics | Unlimited |
| Equipment Library | Unlimited units |
| Photos per unit | Unlimited |
| Favorites | Included |
| Progress Tracker | Included |
| Advanced Dashboard | Included |
| Future Planning | Included |
| PM Scheduling | Included |
| Return Visit Reminders | Included |
| Recurring Reminders | Included |
| Priority Center | Included |
| Advanced Search | Included |
| Full Diagnostic History | Unlimited |
| Calendar (future) | Full access |

### Pro Experience Goal
A Pro user should think: *"I run my business from UnitDown."*

---

## Upgrade Philosophy

Upgrades should happen at **natural overflow moments** — when a user organically exceeds the Free tier's capacity, not when the platform engineers a moment of artificial frustration.

### Natural Upgrade Triggers
- Equipment Library reaches 10 units → "You've outgrown the Free workspace."
- Second diagnosis needed today → "Next diagnosis available in X hours, or upgrade for unlimited."
- Future reminder requested → "Future planning is a Pro feature."
- PM scheduling initiated → "Scheduling is a Pro feature."

### What Never Happens
- Diagnosing is never blocked mid-session
- Controls are never shown as disabled/grayed for non-Pro users unless they've hit a capacity limit
- No countdown timers, no fake urgency language, no "last chance" messaging
- No modal interruptions during active field work
- No dark patterns of any kind

### Upgrade Message Tone
- ✅ *"You've outgrown the Free workspace."*
- ✅ *"Next available in X hours, or upgrade."*
- ✅ *"Future planning is a Pro feature."*
- ❌ *"You've been blocked."*
- ❌ *"Upgrade now or lose access."*
- ❌ *"This feature requires Pro."* (without context)

---

## Design Principles

1. **Professional** — Every screen should feel like a tool a skilled tradesperson would trust, not a consumer app.
2. **Fast** — Technicians work fast and under pressure. Every interaction should complete in under 2 taps wherever possible.
3. **Clean** — No clutter. No decorative elements that serve no function. Every pixel must justify its existence.
4. **High information density** — Equipment cards, timeline events, and diagnostic results should convey maximum information in minimum space.
5. **Excellent mobile experience** — The primary device is a phone, often handled with gloves. Touch targets must be large. Text must be legible in direct sunlight.
6. **Minimal clutter** — Empty states must feel calm, not alarming. Loading states must be fast or indicate progress clearly.
7. **Purposeful animations** — Transitions convey context (entering a record, returning to a list). Animations never delay interaction.
8. **Premium without being flashy** — UnitDown blue, white, dark navy, and slate gray. No gradients, no neon, no gold. The Pro experience is subtly elevated, not theatrically different.
9. **Dark mode compatibility** — All screens must be designed for both light and dark themes from the start.
10. **Equipment always in context** — When a user is looking at a diagnosis, they should always know which unit it belongs to.

---

## Four-Phase Implementation Roadmap

### Phase 1 — Foundation
*Homepage, Navigation, My Workspace, Equipment Library, Free vs Pro presentation*

The goal of Phase 1 is to establish UnitDown as a workspace, not an app. The navigation structure, the home screen, and the equipment library must communicate the platform vision without a single word of explanation. A technician should understand the app in 5 seconds.

### Phase 2 — Equipment Depth
*Dashboard polish, Calendar, Equipment pages, Timeline, Photos, Resources*

Phase 2 makes the equipment record feel alive. Photos, timeline entries, and resources transform each unit from a data record into a living file. The calendar becomes the historical log of the technician's work.

### Phase 3 — Subscription Experience
*Subscription page, upgrade messaging, footer, Business teaser*

Phase 3 makes the Pro upgrade feel earned and obvious — not pressured. The subscription page clearly separates capacity tiers. The Business teaser is planted quietly for future customers.

### Phase 4 — Polish
*Animation, micro-interactions, performance optimization, accessibility*

Phase 4 is where UnitDown stops feeling like software and starts feeling like a professional instrument. Micro-interactions reward careful use. Transitions convey spatial context. Performance is optimized for field conditions (low connectivity, older devices).

---

## Business Tier Roadmap (Teaser)

> 🚀 **UnitDown Business — Coming Soon**

Business is intentionally not part of the current redesign. However, it is the natural evolution of the platform. When a Pro technician becomes a service company, they should not need to switch apps.

Business will include:
- Shared Equipment Libraries across technician teams
- Company-wide dashboards
- Technician management and assignment
- Team diagnostic history
- Company billing

The Business teaser appears only on the Subscription page. No disabled controls, no placeholder sections, no "coming soon" locks on existing features. One teaser, one "Notify Me" button.

---

*Last updated: June 2026 — UnitDown 2.0 Feature Branch*
