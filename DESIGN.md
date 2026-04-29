---
name: Scrollable
description: Mobile-first runtime media workbench for private feed viewing.
colors:
  background: "oklch(14.5% 0.012 338)"
  foreground: "oklch(92.5% 0.018 55)"
  surface: "oklch(18.5% 0.018 340)"
  surface-elevated: "oklch(24.5% 0.024 342)"
  popover: "oklch(24.5% 0.024 342)"
  primary: "oklch(62% 0.145 18)"
  primary-hover: "oklch(69% 0.15 20)"
  primary-foreground: "oklch(14% 0.012 338)"
  secondary: "oklch(76% 0.08 68)"
  secondary-soft: "oklch(24% 0.035 55)"
  muted: "oklch(24.5% 0.024 342)"
  muted-foreground: "oklch(70.5% 0.025 35)"
  accent: "oklch(28.5% 0.026 342)"
  destructive: "oklch(64% 0.18 24)"
  border: "oklch(33.5% 0.022 342)"
  input: "oklch(28.5% 0.026 342)"
typography:
  display:
    fontFamily: "Instrument Serif, Georgia, serif"
    fontSize: "2.25rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "normal"
  body:
    fontFamily: "Sora, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Sora, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "normal"
  mono:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: "4.8px"
  md: "6.4px"
  lg: "8px"
  xl: "11.2px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "0 10px"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "0 10px"
  panel:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    padding: "12px"
---

# Design System: Scrollable

## 1. Overview

**Creative North Star: "The Velvet Viewing Booth"**

Scrollable uses a dark, media-first product interface: black-plum surfaces, warm bone type, oxblood command controls, champagne progress/focus, compact tool rails, and bottom-sheet mobile controls. It should feel like a private media booth: sensual in material, productive in structure, and robust in controls.

The system should keep that instrument quality while shedding generic dark-app habits. Chrome should feel exact, quiet, and recoverable. The media should remain the stage. Privacy rules should be visible through metadata-only saved layouts and careful copy.

**Key Characteristics:**

- Dense controls wrapped around full-screen media.
- Oxblood Rose reserved for primary actions, active state, and selected outlines.
- Champagne reserved for focus, progress, timer, and saved-success moments.
- Bottom-sheet mobile workflows and left-rail desktop workflows.
- Flat surfaces with subtle borders, not decorative depth.
- Instrument Serif for elegant display moments, Sora for dense UI, IBM Plex Mono for technical metadata.

## 2. Colors

The palette is a black-plum booth with oxblood command light. Lime and cyan are no longer default workbench accents.

### Primary

- **Oxblood Rose** (`oklch(62% 0.145 18)`): Primary actions, selected outlines, active icon states, and source focus.
- **Oxblood Hover** (`oklch(69% 0.15 20)`): Hover states and stronger active feedback.

### Secondary

- **Champagne Signal** (`oklch(76% 0.08 68)`): Focus rings, progress bars, timer emphasis, saved-state confirmation, and compact secondary emphasis.
- **Champagne Lowlight** (`oklch(24% 0.035 55)`): Background tint for subtle secondary states.
- **Slate Blue** (`oklch(68% 0.075 220)`): Provider hints and informational status only. Use rarely.

### Neutral

- **Black Plum** (`oklch(14.5% 0.012 338)`): App background and media stage.
- **Velvet Deck** (`oklch(18.5% 0.018 340)`): Panels, cards, viewer frames, source slots.
- **Raised Fig** (`oklch(24.5% 0.024 342)`): Popovers, muted controls, elevated panels.
- **Warm Bone** (`oklch(92.5% 0.018 55)`): Main text and icon color.
- **Muted Warm Grey** (`oklch(70.5% 0.025 35)`): Secondary labels, counts, helper text.
- **Hairline Border** (`oklch(33.5% 0.022 342)`): Dividers, card strokes, panel outlines.
- **Input Track** (`oklch(28.5% 0.026 342)`): Input fields and inactive control tracks.

### Named Rules

**The Stage First Rule.** Black Plum and media occupy most of the screen. Accent color marks actions and state, not decoration.

**The No Preview Persistence Rule.** Saved configuration views may show metadata styling, but not third-party media previews.

## 3. Typography

**Display Font:** Instrument Serif, with Georgia fallback
**Body Font:** Sora, with system sans fallback
**Mono Font:** IBM Plex Mono, with ui-monospace fallback

**Character:** Private, adult, and tactile. Instrument Serif gives the wordmark, shared-page titles, and dialog headings a more elegant editorial edge. Sora keeps controls styled and younger than a neutral SaaS face without losing product clarity. IBM Plex Mono keeps URLs, counters, durations, and source identifiers precise.

### Hierarchy

- **Display** (400, 2.25rem, 1): Wordmark and rare brand-sized surfaces only.
- **Headline** (600, 1.25rem, 1.2): Dialog titles and major workflow headings.
- **Title** (600, 0.875rem, 1.3): Panel section titles and selected source labels.
- **Body** (400, 0.875rem, 1.5): Form text, helper text, source metadata, and descriptions.
- **Label** (600, 0.75rem, 1.2): Control group labels, field labels, badges, compact captions.
- **Mono** (500, 0.75rem, 1.4): URLs, subreddit names, counters, durations, and technical identifiers.

### Named Rules

**The Compact Control Rule.** Workbench labels stay small and scannable. Do not use hero-scale text inside control panels.

## 4. Elevation

The current system uses tonal layering plus heavy dark shadows on overlays, rails, bottom navigation, and dialogs. Shadows should communicate temporary chrome above media, not decorative depth. Resting stage surfaces should stay mostly flat.

### Shadow Vocabulary

- **Mobile Sheet Lift** (`0 -18px 70px rgba(0,0,0,0.55)`): Bottom sheets and mobile dialogs.
- **Desktop Dialog Lift** (`0 24px 80px rgba(0,0,0,0.72)`): Centered or anchored dialogs.
- **Floating Rail Lift** (`0 10px 28px rgba(0,0,0,0.45)`): Mobile rail buttons and floating playback controls.
- **Selected Glow** (`0 0 20px oklch(62% 0.145 18 / 0.12)`): Selected free-layout source state only.

### Named Rules

**The Flat Deck Rule.** Panels are flat by default. Shadows appear for overlays, floating controls, drag state, and selection only.

## 5. Components

### Buttons

- **Shape:** Compact rounded rectangles for panel commands (8px), circles for floating icon tools, pills for workspace tabs and playback.
- **Primary:** Oxblood Rose background with Black Plum text. Use for active or primary action, not every command.
- **Hover / Focus:** Oxblood hover, champagne focus ring at 50% opacity, active press translates 1px.
- **Secondary / Ghost / Tertiary:** Border or transparent background, foreground text, muted hover. These should carry most chrome actions.

### Chips

- **Style:** Workspace tabs are pill-shaped with thin borders, muted text, and selected oxblood outline/glow.
- **State:** Active tabs should be obvious without relying only on color; keep shape, outline, and text contrast changes.

### Cards / Containers

- **Corner Style:** 8px to 12px radius. Keep cards tight because viewer cells already frame media.
- **Background:** Deck Surface and Raised Deck, often translucent over the stage.
- **Shadow Strategy:** No shadow unless surface floats above media or blocks interaction beneath it.
- **Border:** Hairline Border for separation on dark surfaces.
- **Internal Padding:** 8px to 12px for controls, 16px only for dialogs or dense form groups.

### Inputs / Fields

- **Style:** 32px to 36px height, rounded 8px, thin input border, transparent or dark input background.
- **Focus:** Ring color uses Champagne Signal. Maintain visible focus at 200% zoom.
- **Error / Disabled:** Destructive rose for errors, dimmed input background for disabled.

### Navigation

- **Style:** Desktop uses a left contextual rail and fixed header tabs. Mobile uses bottom nav, right-side floating tools, and bottom sheets.
- **Typography:** Navigation labels are mostly hidden behind icon buttons and titles. Every icon action needs an accessible name and tooltip/title.
- **Mobile Treatment:** Touch targets should meet 44px minimum even when desktop buttons remain 32px.

### Signature Component

**Media Stage:** The stage is a bordered, nearly black grid or free-layout canvas with subtle grid lines in free mode. It should feel like arranging live media panes, not placing cards on a dashboard.

## 6. Do's and Don'ts

### Do:

- **Do** keep media as the dominant surface and make chrome easy to hide.
- **Do** use Oxblood Rose for primary actions and active state.
- **Do** use Champagne Signal for progress, focus, and timer emphasis.
- **Do** keep saved layout and collection surfaces metadata-only.
- **Do** make mobile controls thumb-reachable and touch targets at least 44px.
- **Do** document runtime-only errors clearly without persisting third-party payload details.

### Don't:

- **Don't** use generic SaaS dashboards, marketing hero layouts, pastel creator-tool blandness, neon cyberpunk overload, or AI-gradient spectacle.
- **Don't** use decorative glassmorphism. Backdrop blur is only for controls floating above media.
- **Don't** build repeated identical card grids for primary workflows.
- **Don't** show third-party media previews in saved or shared configuration browsing.
- **Don't** rely on hover-only controls for mobile or keyboard users.
