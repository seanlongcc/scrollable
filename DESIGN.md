---
name: Scrollable
description: Mobile-first runtime media workbench for private feed viewing.
colors:
  background: "#070707"
  foreground: "#f4f4f4"
  surface: "#101010"
  surface-elevated: "#181818"
  popover: "#181818"
  primary: "#8fefe1"
  primary-hover: "#5eead4"
  primary-foreground: "#070707"
  secondary: "#e5f7a1"
  secondary-soft: "#181c08"
  muted: "#181818"
  muted-foreground: "#a0a0a0"
  accent: "#202020"
  destructive: "#f43f5e"
  border: "#2a2a2a"
  input: "#303030"
typography:
  display:
    fontFamily: "Geist, Geist Fallback, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "normal"
  body:
    fontFamily: "Geist, Geist Fallback, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Geist, Geist Fallback, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "normal"
  mono:
    fontFamily: "Geist Mono, Geist Mono Fallback, ui-monospace, monospace"
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

**Creative North Star: "The Pocket Projection Booth"**

Scrollable currently uses a dark, media-first product interface: blackened surfaces, thin borders, cyan-green controls, lime secondary accents, compact tool rails, and bottom-sheet mobile controls. It feels more like a runtime instrument than a document app.

The system should keep that instrument quality while shedding generic dark-app habits. Chrome should feel exact, quiet, and recoverable. The media should remain the stage. Privacy rules should be visible through metadata-only saved layouts and careful copy.

**Key Characteristics:**

- Dense controls wrapped around full-screen media.
- Cyan primary actions reserved for active state, progress, and command focus.
- Bottom-sheet mobile workflows and left-rail desktop workflows.
- Flat surfaces with subtle borders, not decorative depth.
- Geist Sans for utility, Geist Mono for product wordmark and technical values.

## 2. Colors

The palette is a near-black booth with cyan control light and lime auxiliary signal.

### Primary

- **Control Cyan** (#8fefe1): Primary actions, focus rings, progress bars, selected outlines, active icon states.
- **Control Cyan Hover** (#5eead4): Hover states and secondary active feedback.

### Secondary

- **Queue Lime** (#e5f7a1): Secondary signal color for charts, alternate emphasis, and future brand accents. Use sparingly beside Control Cyan.
- **Lime Lowlight** (#181c08): Background tint for subtle secondary states.

### Neutral

- **Booth Black** (#070707): App background and media stage.
- **Deck Surface** (#101010): Panels, cards, viewer frames, source slots.
- **Raised Deck** (#181818): Popovers, muted controls, elevated panels.
- **Soft Foreground** (#f4f4f4): Main text and icon color.
- **Muted Grey** (#a0a0a0): Secondary labels, counts, helper text.
- **Hairline Border** (#2a2a2a): Dividers, card strokes, panel outlines.
- **Input Track** (#303030): Input fields and inactive control tracks.

### Named Rules

**The Stage First Rule.** Booth Black and media occupy most of the screen. Accent color marks actions and state, not decoration.

**The No Preview Persistence Rule.** Saved configuration views may show metadata styling, but not third-party media previews.

## 3. Typography

**Display Font:** Geist, with system sans fallback
**Body Font:** Geist, with system sans fallback
**Label/Mono Font:** Geist Mono, with ui-monospace fallback

**Character:** Utility-first and compact. Type should feel like controls on a media instrument, not editorial prose.

### Hierarchy

- **Display** (600, 2.25rem, 1): Wordmark and rare brand-sized surfaces only.
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
- **Selected Glow** (`0 0 20px rgba(143,239,225,0.08)`): Selected free-layout source state only.

### Named Rules

**The Flat Deck Rule.** Panels are flat by default. Shadows appear for overlays, floating controls, drag state, and selection only.

## 5. Components

### Buttons

- **Shape:** Compact rounded rectangles for panel commands (8px), circles for floating icon tools, pills for workspace tabs and playback.
- **Primary:** Control Cyan background with Booth Black text. Use for active or primary action, not every command.
- **Hover / Focus:** Cyan hover, 3px focus ring at 50% opacity, active press translates 1px.
- **Secondary / Ghost / Tertiary:** Border or transparent background, foreground text, muted hover. These should carry most chrome actions.

### Chips

- **Style:** Workspace tabs are pill-shaped with thin borders, muted text, and selected cyan outline/glow.
- **State:** Active tabs should be obvious without relying only on color; keep shape, outline, and text contrast changes.

### Cards / Containers

- **Corner Style:** 8px to 12px radius. Keep cards tight because viewer cells already frame media.
- **Background:** Deck Surface and Raised Deck, often translucent over the stage.
- **Shadow Strategy:** No shadow unless surface floats above media or blocks interaction beneath it.
- **Border:** Hairline Border for separation on dark surfaces.
- **Internal Padding:** 8px to 12px for controls, 16px only for dialogs or dense form groups.

### Inputs / Fields

- **Style:** 32px to 36px height, rounded 8px, thin input border, transparent or dark input background.
- **Focus:** Ring color matches Control Cyan. Maintain visible focus at 200% zoom.
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
- **Do** use Control Cyan for state, progress, focus, and primary action.
- **Do** keep saved layout and collection surfaces metadata-only.
- **Do** make mobile controls thumb-reachable and touch targets at least 44px.
- **Do** document runtime-only errors clearly without persisting third-party payload details.

### Don't:

- **Don't** use generic SaaS dashboards, marketing hero layouts, pastel creator-tool blandness, neon cyberpunk overload, or AI-gradient spectacle.
- **Don't** use decorative glassmorphism. Backdrop blur is only for controls floating above media.
- **Don't** build repeated identical card grids for primary workflows.
- **Don't** show third-party media previews in saved or shared configuration browsing.
- **Don't** rely on hover-only controls for mobile or keyboard users.
