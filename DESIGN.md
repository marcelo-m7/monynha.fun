---
name: Tube O2
description: Human-curated cultural video platform with geometric, high-contrast UI.
colors:
  neon-lime-core: "#eeff00"
  neon-lime-hover: "#dbeb00"
  absolute-ink: "#000000"
  signal-white: "#ffffff"
  steel-mist: "#62748d"
  soft-panel: "#f5f5f5"
  low-contrast-fill: "#f2f2f2"
  field-border: "#e0e0e0"
  alert-red: "#c12715"
typography:
  display:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "clamp(3rem, 8vw, 6rem)"
    fontWeight: 900
    lineHeight: 0.92
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 3.5vw, 2.25rem)"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "0.04em"
  title:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.04em"
  body:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.75
    letterSpacing: "0"
  label:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 900
    lineHeight: 1.2
    letterSpacing: "0.1em"
rounded:
  none: "0px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.neon-lime-core}"
    textColor: "{colors.absolute-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 20px"
  button-primary-hover:
    backgroundColor: "{colors.neon-lime-hover}"
    textColor: "{colors.absolute-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 20px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.absolute-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 20px"
  card-default:
    backgroundColor: "{colors.signal-white}"
    textColor: "{colors.absolute-ink}"
    rounded: "{rounded.none}"
    padding: "24px"
  input-default:
    backgroundColor: "{colors.signal-white}"
    textColor: "{colors.absolute-ink}"
    rounded: "{rounded.none}"
    padding: "0 12px"
---

# Design System: Tube O2

## 1. Overview

**Creative North Star: "Curation Grid Reactor"**

Tube O2 presents curation as an active system, not a passive catalog. The interface is strict, geometric, and high-contrast: hard edges, uppercase labels, dense visual hierarchy, and immediate interaction feedback. The product voice should read as engineered and alive, with clear directional momentum in every route.

This system rejects enterprise blandness and static minimalism by design. Saturated accent is used as a high-value signal, not decoration; most surfaces stay monochrome so important actions and live metrics hit with precision. Motion should preserve velocity and state legibility, never become ornamental choreography.

**Key Characteristics:**
- Hard-edge geometry with zero-radius surfaces and controls.
- High contrast baseline (ink on white, lime as command accent).
- Uppercase, heavy-weight labels for action framing and scan speed.
- Fast, purposeful transitions with reduced-motion parity.
- Editorial data density without enterprise dashboard blandness.

## 2. Colors

The palette is restrained and tactical: monochrome structure with one high-energy lime signal.

### Primary
- **Neon Lime Core** (#eeff00): Primary CTA backgrounds, active signal bars, status beacons, and emphasis moments that require immediate visual priority.
- **Neon Lime Hover** (#dbeb00): Hover and pressed transitions for primary controls to keep energy while preserving contrast against black text.

### Neutral
- **Absolute Ink** (#000000): Primary text, strong borders, and command surfaces that need maximum authority.
- **Signal White** (#ffffff): Main canvas and default card surfaces; keeps typographic contrast uncompromised.
- **Soft Panel** (#f5f5f5): Secondary regions and grouped sections where hierarchy needs a subtle surface step.
- **Low Contrast Fill** (#f2f2f2): Muted backgrounds and passive containers.
- **Field Border** (#e0e0e0): Input and low-emphasis outline strokes.
- **Steel Mist** (#62748d): Secondary body copy, metadata, and supportive textual context.

### Named Rules
**The Signal Scarcity Rule.** Neon lime is reserved for actions, active state, and live emphasis. If lime starts feeling ambient, the screen is over-accented.

**The Contrast Floor Rule.** Body copy on neutral surfaces must stay at or above a 4.5:1 contrast ratio; muted text cannot collapse into decorative gray.

## 3. Typography

**Display Font:** Space Grotesk (with system-ui, sans-serif)
**Body Font:** Space Grotesk (with system-ui, sans-serif)
**Label/Mono Font:** Space Grotesk mono fallback (with monospace)

**Character:** The type system is compact, forceful, and engineered. Display layers are heavy and compressed; body copy stays readable with generous line height.

### Hierarchy
- **Display** (900, clamp(3rem, 8vw, 6rem), 0.92): Hero statements and major sectional pivots only.
- **Headline** (800, clamp(1.5rem, 3.5vw, 2.25rem), 1.05): Section leaders and high-level content frames.
- **Title** (700, 1.125rem, 1.2): Card/module titles and navigation-level headings.
- **Body** (500, 1rem, 1.75): Narrative and explanatory copy; keep prose lines in the 65-75ch range.
- **Label** (900, 0.75rem, 1.2, 0.1em tracking, uppercase): Buttons, chips, signal captions, and utility metadata.

### Named Rules
**The One Family Rule.** Space Grotesk carries display, body, and labels; consistency is preferred over decorative font pairing in product flows.

**The Uppercase Intent Rule.** Uppercase is reserved for controls, labels, and structural headings; long-form body text must remain mixed case.

## 4. Elevation

Tube O2 is flat by default and lifts only in response to interaction or focus. Depth is conveyed through border authority, outline contrast, and short shadow ramps rather than ambient floating layers.

### Shadow Vocabulary
- **Resting Surface** (`box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08)`): Default interactive cards and controls at rest.
- **Interactive Lift** (`box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12)`): Hover/focus on actionable surfaces.
- **Emphasis Lift** (`box-shadow: 0 8px 16px rgba(0, 0, 0, 0.16)`): Hero-level or priority surfaced blocks.
- **Dark Surface Lift** (`box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4)`): Equivalent depth in dark mode.

### Named Rules
**The Flat-Until-Action Rule.** Surfaces do not float by default; elevation appears only to confirm affordance or state change.

## 5. Components

### Buttons
- **Shape:** hard-edge rectangle (0px radius).
- **Primary:** neon-lime fill with black text, 1.5px border, heavy uppercase labels, compact spacing.
- **Hover / Focus:** hover shifts to lime-hover and shadow-md; focus uses 2px ring in primary signal.
- **Secondary / Ghost / Outline:** same geometry, reduced fill commitment, still preserving high border clarity.

### Chips
- **Style:** compact uppercase labels, high-weight text, neutral backgrounds unless selected.
- **State:** selected chips should flip to primary-accent or high-contrast neutral inversion, never low-contrast gray-on-gray.

### Cards / Containers
- **Corner Style:** zero-radius blocks (0px).
- **Background:** signal-white or soft-panel depending on hierarchy.
- **Shadow Strategy:** shadow-sm at rest, shadow-md on interaction.
- **Border:** 1.5px structural border as baseline.
- **Internal Padding:** 16px-24px for standard cards, increasing with content density.

### Inputs / Fields
- **Style:** 1.5px border, card background, no rounded corners, medium body text.
- **Focus:** border flips to primary with subtle shadow cue.
- **Error / Disabled:** destructive red states for error; disabled opacity and cursor lock.

### Navigation
- **Desktop:** sticky top bar, dense horizontal nav, active states with primary-tinted background.
- **Mobile:** right-side sheet with clear hierarchy and preserved control vocabulary.
- **State model:** muted foreground for inactive links, high-contrast foreground for active/current context.

## 6. Do's and Don'ts

### Do:
- **Do** keep core surfaces geometric and hard-edged (0px radius) to preserve the engineered brand signature.
- **Do** reserve neon lime for command, active, and live-signal states; keep passive areas neutral.
- **Do** use uppercase heavy labels for controls and operational metadata.
- **Do** keep motion responsive and state-driven, with full reduced-motion parity.
- **Do** maintain WCAG 2.2 AA contrast and keyboard-visible focus in all primary flows.

### Don't:
- **Don't** make this feel like a traditional corporate enterprise UX (SAP/Oracle/Microsoft 365 style visual language).
- **Don't** reduce the experience to a minimal static website aesthetic with low motion and low visual personality.
- **Don't** drift into generic blog-like or business-dashboard visual identity.
- **Don't** use decorative motion that does not communicate state.
- **Don't** use side-stripe border accents or gradient text treatments.
