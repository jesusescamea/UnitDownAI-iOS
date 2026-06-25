# UnitDown 2.0 — Design System

> The design system is not a component library. It is a set of principles that ensure every screen, every interaction, and every decision reinforces the same product vision: **UnitDown is the Commercial HVAC Workspace.**

---

## Core Principles

### 1. Equipment-First Architecture

Every screen exists in relation to equipment. When a technician views a diagnosis, they should always know which unit it belongs to. When they add a photo, it should always be attachable to a unit. When they set a reminder, it should reference the unit that needs the follow-up.

**In practice:**
- Navigation surfaces the Equipment Library within two taps of any screen
- Diagnoses are always presented with their associated unit (if one exists)
- Quick actions always offer "attach to unit" as the first option
- Orphaned records (diagnosis without a unit, photo without a unit) are valid but flagged for attachment

**Design implication:** Equipment cards appear more frequently than any other component in the app. Their visual language must be immediately recognizable, consistent, and information-dense.

---

### 2. One Primary Action Per Screen

Every screen has a single most important action. That action is always visually dominant and reachable within one tap. Supporting actions are accessible but visually subordinate.

| Screen | Primary Action |
|---|---|
| My Workspace | Open recent unit or start diagnosis |
| Equipment Library | Open a unit or add a new unit |
| Equipment Detail | Run AI Diagnosis |
| AI Diagnosis | Submit symptoms |
| Nameplate Scanner | Capture |
| Calendar | View day / tap event |
| Field Hub | Open unit visited today |
| Account | Navigate to Subscription |

Secondary actions (share, export, delete, settings) live in overflow menus (`⋮`) or secondary tabs — never competing with the primary CTA.

---

### 3. Every Action Creates History

Every meaningful action a technician takes is automatically logged to the unit's timeline. This is not optional and not a feature — it is infrastructure.

**Actions that create timeline entries:**
- Running an AI diagnosis
- Adding a photo
- Scanning a nameplate
- Adding a manual note
- Completing a PM task
- Marking a return visit complete
- Editing unit info

**Why this matters:** Technicians forget. They get called to the next job. They deal with multiple units in one day. The timeline is their memory. They should never have to manually "save" anything — the platform does it.

---

### 4. No Dead Ends

Every screen must offer a path forward. Empty states are opportunities, not failures.

| State | Message | Action |
|---|---|---|
| Empty Equipment Library | "Your equipment library is empty. Add your first unit." | [+ Add Equipment] |
| No diagnoses | "No diagnoses yet. Describe a symptom to get started." | [Run Diagnosis] |
| No photos | "No photos on this unit. Add one from the field." | [+ Add Photo] |
| No timeline events | "No activity recorded yet." | [+ Log Activity] |
| No reminders (Free) | "Future reminders are a Pro feature." | [Learn More] |

Empty states never use error iconography. They use calm, neutral illustrations or iconography and a single constructive action.

---

### 5. Mobile-First

UnitDown is primarily used on a phone, in the field, often with gloves on. Every design decision defaults to mobile before desktop.

**Touch target minimums:** 44px × 44px (iOS HIG standard)
**Text minimums:** 14px body, 12px secondary, 11px caption
**Tap depth maximum:** 3 taps to reach any piece of content
**Thumb zone:** Primary actions live in the lower 60% of the screen on mobile

Desktop and tablet layouts are additive — they take advantage of additional space without requiring it.

---

### 6. High Information Density

Commercial HVAC technicians are professionals who handle complex systems. They can process dense information quickly. The design should respect this — packing meaningful data into compact components without making them feel cluttered.

**Equipment card (compact):**
```
┌────────────────────────────────────┐
│ 🔶 RTU-04                 2h ago  │
│ Carrier 50XC · 5T · Main Bldg     │
│ 3 photos · 7 diagnoses · ⚠️ open  │
└────────────────────────────────────┘
```

Three lines. Unit name, model/location, activity summary. Everything a technician needs to decide whether to open the record.

---

### 7. Fast Interactions

Loading states must be either instant (< 200ms) or clearly indicated (skeleton loaders, not spinners where possible). Transitions should complete within 250ms.

**Rules:**
- No full-page loading screens after initial app load
- Skeleton loaders for lists and cards
- Optimistic UI updates for quick actions (add note, add photo) — show immediately, sync in background
- Never block the UI waiting for a network response unless data integrity demands it

---

## Visual Language

### Color Palette

| Token | Value | Use |
|---|---|---|
| `brand-blue` | `#2563EB` (blue-600) | Primary actions, active nav, links, highlights |
| `brand-blue-dark` | `#1D4ED8` (blue-700) | Hover states for primary actions |
| `brand-blue-glow` | `#3B82F6/20` (blue-500 at 20%) | Pro-status glow, premium accents |
| `surface-white` | `#FFFFFF` | Cards, modals, primary backgrounds (light) |
| `surface-slate` | `#F8FAFC` (slate-50) | Page backgrounds (light) |
| `surface-dark` | `#020617` (slate-950) | Footer, modals (dark), page backgrounds (dark) |
| `surface-card-dark` | `#0F172A` (slate-900) | Cards (dark mode) |
| `text-primary` | `#0F172A` (slate-900) | Headings, primary labels |
| `text-secondary` | `#475569` (slate-600) | Body text, descriptions |
| `text-muted` | `#94A3B8` (slate-400) | Captions, timestamps, placeholder |
| `border-subtle` | `#E2E8F0` (slate-200) | Card borders, dividers (light) |
| `border-dark` | `#1E293B` (slate-800) | Card borders, dividers (dark) |
| `status-operational` | `#10B981` (emerald-500) | Unit operational |
| `status-monitoring` | `#3B82F6` (blue-500) | Unit under observation |
| `status-followup` | `#F59E0B` (amber-500) | Needs follow-up |
| `status-critical` | `#EF4444` (red-500) | Critical issue |
| `status-archived` | `#94A3B8` (slate-400) | Archived unit |

**Rules:**
- Red (`status-critical`) is used exclusively for critical equipment states and destructive actions. Never for marketing, upgrade prompts, or warnings about plan limits.
- Gold/yellow is never used for Pro status. Pro is expressed through blue glow and the Pro logo mark — never a gold theme.
- Upgrade prompts use `brand-blue`, not amber or red.

---

### Typography

| Role | Weight | Size (mobile) | Size (desktop) |
|---|---|---|---|
| Page title | 800 (extrabold) | 28px | 36px |
| Section heading | 700 (bold) | 20px | 24px |
| Card title | 700 (bold) | 16px | 18px |
| Body | 500 (medium) | 15px | 16px |
| Secondary | 500 (medium) | 13px | 14px |
| Caption/meta | 600 (semibold) | 11px | 12px |
| Monospace (serial, model) | 500 | 13px | 14px |

Font stack: System font (`-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`) — no web font dependency for fast field performance.

---

### Spacing

Base unit: 4px. All spacing is a multiple of 4.

| Token | Value | Use |
|---|---|---|
| `space-1` | 4px | Tight internal spacing |
| `space-2` | 8px | Component internal padding |
| `space-3` | 12px | Small gaps |
| `space-4` | 16px | Standard element spacing |
| `space-5` | 20px | Card padding |
| `space-6` | 24px | Section spacing |
| `space-8` | 32px | Large section breaks |
| `space-10` | 40px | Page-level breathing room |

---

### Border Radius

| Context | Radius |
|---|---|
| Buttons (pill/CTA) | 9999px (full) |
| Buttons (standard) | 12px |
| Cards | 16px |
| Modals | 20px |
| Badges | 9999px (full) |
| Input fields | 12px |
| Icon containers | 12px |
| Avatar | 9999px (full) |

---

### Iconography

Source: Lucide React (consistent with existing codebase)

**Icon sizing:**
| Context | Size |
|---|---|
| Navigation tabs | 20px |
| Card icons | 16px |
| Inline text icons | 14px |
| Status indicators | 12px |
| Button icons | 16px |

**Icon color rules:**
- Primary actions: `brand-blue`
- Status icons: use corresponding status color
- Navigation (active): `brand-blue`
- Navigation (inactive): `text-muted` (slate-400)
- Destructive actions: `status-critical` (red-500)

---

## Navigation Rules

### Global Navigation Structure

The bottom tab bar is the primary navigation system on mobile. Five tabs, always labeled, always visible.

```
┌────┬──────────┬─────┬──────┬──────────┐
│ 🏠 │    🏢    │  ⚡  │  📅  │    👤    │
│Home│ Library  │ AI  │ Cal. │ Account  │
└────┴──────────┴─────┴──────┴──────────┘
```

**Why these five tabs:**

- **Home (My Workspace):** The command center. Where every session begins. Daily activity, recent equipment, quick actions.
- **Library (Equipment Library):** The primary long-term asset. The reason technicians keep coming back.
- **AI (Diagnosis):** Direct access to the diagnostic engine. Powerful enough to deserve a tab, but positioned centrally (not first) to reflect its role as a tool, not the identity.
- **Calendar:** Historical log for Free. Full planning suite for Pro. The tab communicates continuity — this app remembers.
- **Account:** Profile, subscription, devices, preferences, sign out.

**Why AI is not the first tab:**
The first tab communicates what the app *is*. Placing AI first sends the message "this is a diagnostic app." Placing Workspace first sends the message "this is your workspace, and one of the tools in it is AI." This is the correct message.

**Why Scanner is not a tab:**
The Nameplate Scanner is a capture utility — a camera-based input method. It is accessed via quick actions on the Home screen, within Equipment Detail, and when adding a new unit. Making it a tab would imply it has ongoing state, which it does not. Tabs are for destinations, not tools.

**Field Hub:**
Field Hub is not a separate tab. It is a focused view within the Home/Workspace tab, accessible via a card or button. It shows today's work in a condensed operational format. Technicians who use Field Hub heavily will reach it via the Home tab — it does not need its own navigation slot.

---

### Depth Rules

No screen should require more than 3 taps from any tab to reach its content.

| Destination | Path |
|---|---|
| Last visited unit | Home → unit card (1 tap) |
| Any unit in Library | Library → search → tap (2 taps) |
| Run diagnosis on a unit | Library → unit → Run Diagnosis (2 taps) |
| Add a photo to a unit | Library → unit → + tab → photo (3 taps) |
| View today's calendar | Calendar tab (1 tap) |
| Subscription page | Account → Subscription (2 taps) |

---

## Equipment Lifecycle

Every unit in the Equipment Library has a status. Status is set by the technician (manually or via diagnosis outcome) and displayed consistently across all equipment cards, lists, and timeline entries.

### Status Definitions

#### Operational ✅
**Color:** Emerald (green)
**Meaning:** The unit is functioning normally. No open issues. No pending follow-ups.
**When to use:** After a successful PM, after a fault is resolved and confirmed, or as the default state for a newly added unit with no history.
**Visual treatment:** Green dot or checkmark on equipment card.

#### Monitoring 🔵
**Color:** Blue
**Meaning:** The unit is running but is being watched. A condition exists that doesn't require immediate action but warrants observation.
**When to use:** After a diagnosis reveals a developing fault, intermittent issue, or borderline reading that doesn't require shutdown.
**Visual treatment:** Blue dot on equipment card. Timeline entry notes the monitoring reason.

#### Needs Follow-up 🔶
**Color:** Amber
**Meaning:** A confirmed issue exists that requires a return visit, a part order, or owner authorization before repair.
**When to use:** When a technician has identified the fault but cannot complete the repair in the current visit. A reminder should be set.
**Visual treatment:** Amber dot on equipment card. Reminder visible in Calendar and Field Hub.

#### Critical 🔴
**Color:** Red
**Meaning:** The unit has a fault that poses an immediate risk — equipment damage, safety concern, or complete failure.
**When to use:** When a diagnosis returns critical priority, or when the technician manually escalates the status based on field observations.
**Visual treatment:** Red dot on equipment card. Appears at the top of equipment lists. Visible in Field Hub priority section.

#### Archived 🔘
**Color:** Slate (gray)
**Meaning:** The unit is no longer in service. The record is preserved for historical reference but excluded from active views by default.
**When to use:** When a unit is decommissioned, replaced, or removed from a technician's active portfolio.
**Visual treatment:** Dimmed card style. Excluded from search results unless "Show archived" is enabled. Archive action is irreversible in the standard flow (restore requires deliberate action).

---

## Upgrade Philosophy

The upgrade experience is part of the product. A bad upgrade experience damages trust. A good upgrade experience feels like a natural next step.

### Principles

**1. Never interrupt active field work.**
If a technician is mid-diagnosis, mid-note, or mid-photo — never interrupt. Let them finish. Show the upgrade prompt after the task is complete.

**2. Upgrade at natural overflow.**
The upgrade prompt appears exactly when the user would naturally need more capacity. Not before.

**3. One upgrade message per session maximum.**
If a technician sees an upgrade prompt and dismisses it, do not show it again in the same session. Repeated prompts signal desperation. One clear, respectful message is enough.

**4. Never show fake disabled controls.**
A control that a Free user cannot use should either not appear at all, or appear with a context-appropriate capacity message — never as a grayed-out locked button. Disabled controls imply the user is missing something they were promised.

**5. The message is never "you're blocked."**
The message is always "you've grown beyond this tier." The framing is positive and forward-looking, never punitive.

### Upgrade Message Templates

| Trigger | Message |
|---|---|
| 10th unit added | "Your library has 10 units — the Free workspace maximum. Upgrade to Pro for unlimited equipment." |
| Second diagnosis attempted today | "You've used today's diagnosis. Next available in X hours. Pro includes unlimited daily diagnostics." |
| Future reminder attempted | "Future planning is a Pro feature. Free records the past — Pro manages the future." |
| PM scheduling attempted | "PM scheduling is a Pro feature. Upgrade to start planning preventive maintenance." |

---

## Pro Visual Language

Pro status should feel subtly elevated — not theatrically different.

### What changes for Pro users:
- The **UnitDown Pro logo mark** replaces the generic icon in: nav badge, account profile, footer badge, subscription section
- A soft blue glow (`brand-blue-glow`) appears on the Pro status badge — nowhere else
- The nav badge reads **"Pro Member"** or **"Pro Active"** instead of **"Join Premium"**
- The subscription page shows the Pro logo prominently

### What does NOT change for Pro users:
- The main app identity (the header logo is always the standard UnitDown mark)
- The installed app icon
- The navigation structure
- The overall visual theme

Pro is an account status indicator, not a separate application theme.

---

## Component Patterns

### Equipment Card
Used in: Library, Workspace recent list, Field Hub, search results.

```
┌────────────────────────────────────┐
│ [status dot] [Unit Name]  [time]   │
│ [Make/Model] · [Capacity] · [Loc]  │
│ [X photos] · [X diagnoses] · [tag] │
└────────────────────────────────────┘
```

- Tap area: full card
- Swipe right (mobile): quick actions (add note, add photo, run diagnosis)
- Long press: select mode (future feature)

### Timeline Entry
Used in: Equipment Detail timeline tab.

```
[●] [time] — [event type]
    [Description or excerpt]
    [Thumbnail if photo]  [Action link if applicable]
```

Events are grouped by date. Most recent is always at top.

### Status Badge
Used in: Equipment cards, nav, account page.

```
[● status-color] [Status Label]
```

Always pill-shaped. Never uses red for non-critical statuses.

### Upgrade Nudge (inline)
Used in: At natural capacity overflow points only.

```
┌────────────────────────────────────┐
│ [icon] You've reached the Free     │
│ workspace limit for [X].           │
│ [Upgrade to Pro →]    [Not now]    │
└────────────────────────────────────┘
```

Appears inline below the triggering action. Never as a blocking modal during active work.

---

*Last updated: June 2026 — UnitDown 2.0 Feature Branch*
