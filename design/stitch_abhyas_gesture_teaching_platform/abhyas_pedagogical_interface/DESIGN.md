---
name: Abhyas Pedagogical Interface
colors:
  surface: '#fff7fc'
  surface-dim: '#f2ceff'
  surface-bright: '#fff7fc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#feefff'
  surface-container: '#fbe8ff'
  surface-container-high: '#f9e0ff'
  surface-container-highest: '#f6d9ff'
  on-surface: '#2f0346'
  on-surface-variant: '#4d4350'
  inverse-surface: '#461d5c'
  inverse-on-surface: '#fdebff'
  outline: '#7f7381'
  outline-variant: '#d0c2d1'
  surface-tint: '#8440a5'
  primary: '#813da2'
  on-primary: '#ffffff'
  primary-container: '#9c57bd'
  on-primary-container: '#fffbff'
  inverse-primary: '#e9b3ff'
  secondary: '#8242a2'
  on-secondary: '#ffffff'
  secondary-container: '#de98ff'
  on-secondary-container: '#662687'
  tertiary: '#635867'
  on-tertiary: '#ffffff'
  tertiary-container: '#7c7180'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#f7d8ff'
  primary-fixed-dim: '#e9b3ff'
  on-primary-fixed: '#310048'
  on-primary-fixed-variant: '#6a258b'
  secondary-fixed: '#f6d9ff'
  secondary-fixed-dim: '#e9b3ff'
  on-secondary-fixed: '#310048'
  on-secondary-fixed-variant: '#682888'
  tertiary-fixed: '#eddef0'
  tertiary-fixed-dim: '#d0c2d3'
  on-tertiary-fixed: '#211925'
  on-tertiary-fixed-variant: '#4d4351'
  background: '#fff7fc'
  on-background: '#2f0346'
  surface-variant: '#f6d9ff'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 56px
    fontWeight: '700'
    lineHeight: 64px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.01em
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '600'
    lineHeight: 48px
    letterSpacing: -0.015em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Nunito Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Nunito Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Nunito Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 3rem
  margin-mobile: 1.25rem
  space-xs: 0.375rem
  space-sm: 0.75rem
  space-md: 1.25rem
  space-lg: 2rem
  space-xl: 3.5rem
  space-2xl: 5rem
---

## Brand & Style

This design system establishes a warm, accessible, and fatigue-reducing environment for educators using touchless and gesture-driven digital instruction. Moving away from sterile administrative enterprise tools, the design embodies gentle clarity, organic shapes, and a tactile, pastel-forward presence inspired by contemporary educational illustration.

### Personality & Emotional Tenor
- **Calm & Unhurried:** Soft lilac tones reduce eye strain during extended classroom presentations and whiteboard sessions.
- **Empathetic & Approachable:** Pill shapes, friendly rounded typography, and generous negative space remove the intimidation factor from advanced camera-based gesture tracking.
- **Fluid & Responsive:** Curved section dividers, soft floating cards, and clear spatial affordances give teachers immediate, non-verbal feedback for physical hand gestures.

### Movement & Influences
The visual language merges warm modernism with tactile soft-minimalism. Large pill elements, smooth undulating section transitions, and rich plum typographic accents ensure the UI remains legible from across a classroom while feeling inviting up close.

## Colors

The palette derives directly from soft botanical purples, lilacs, and deep plum neutrals. High-contrast pure black and sterile cold whites are avoided in favor of tinted, gentle canvas surfaces.

### Functional Roles
- **Primary (`#A55FC6`):** Focal actions, pill buttons, gesture target confirmations, and primary interactive highlights.
- **Secondary (`#7A3A9A`):** Deep lavender-violet used for active states, focused indicators, and prominent sub-headings.
- **Tertiary (`#F5E6F8`):** Gentle tinted container backgrounds, secondary chip fills, and subtle module alternating bands.
- **Neutral / Text (`#4A2160`):** Rich plum neutral replacing standard black or dark slate. Delivers high contrast (AAA rating on white and light lavender) without the harshness of monochrome black.
- **Canvas Base (`#FAF4FC`):** The primary page canvas, providing warm contrast against white (`#FFFFFF`) elevated cards and lilac containers.
- **Gesture Affirmation (`#D988ED`):** Dynamic feedback color indicating hand tracking detection and mid-air hover states.

## Typography

The pairing combines the open, friendly geometry of **Plus Jakarta Sans** for structural elements and titles with the balanced, legibility-first cadence of **Nunito Sans** for longer instructional text and instructional guides.

- **Headlines & Action Labels:** Rendered in Plus Jakarta Sans with a soft terminal profile that echoes the rounded pill aesthetic. Line-heights are intentionally generous to accommodate digital whiteboard displays and distance readability.
- **Instructional Body Copy:** Handled by Nunito Sans, offering open counters and gentle curves that keep classroom lesson plans and curriculum summaries relaxed and easy to scan.
- **Letter Spacing:** Tighter letter spacing on large display titles maintains visual cohesion, while interactive labels feature slight positive tracking for crisp readability across gesture target zones.

## Layout & Spacing

Layouts balance desktop display monitors, interactive digital screens, and teacher tablets. The layout relies on an open fluid grid anchored by distinctive curved, wave-like horizontal section transitions.

### Grid Rhythm & Composition
- **Desktop (1024px+):** 12-column fluid grid, 24px gutters, and 48px canvas margin. Lesson modules and dashboard widgets sit in symmetrical 3- or 4-column groupings.
- **Tablet (768px - 1023px):** 8-column layout with 20px gutters and 32px canvas margin. Toolbars and gesture zones default to comfortable touch targets (minimum 48px).
- **Mobile / Handheld Preview (Below 768px):** 4-column single-stack arrangement, 16px gutters, and 20px canvas margin.

### Organic Section Transitions
Sections transition using gentle convex and concave SVG curved masks (`border-radius: 50% 50% 0 0 / 24px 24px 0 0` or equivalent SVG curve divider). This eliminates sharp horizontal lines and produces the calm, rolling wave effect shown in the primary interface sections.

## Elevation & Depth

Visual hierarchy uses soft tonal layering and tinted ambient illumination rather than harsh, dark drop shadows. Surfaces reflect a natural glow of lavender light.

### Depth Hierarchy
- **Level 0 (Base Canvas):** Flat `#FAF4FC` tinted surface. All section dividers and structural waves cut across this plane.
- **Level 1 (Subtle Containers & Panels):** Light lavender surfaces (`#F8EFFF`) with a faint 1px border rendered in `rgba(165, 95, 198, 0.15)`. No drop shadow.
- **Level 2 (Active Cards & Lesson Blocks):** Pure white (`#FFFFFF`) card surfaces floating above the lavender ground, illuminated by a tinted ambient shadow: `0 8px 24px -4px rgba(74, 33, 96, 0.06), 0 2px 6px -1px rgba(165, 95, 198, 0.08)`.
- **Level 3 (Modals, Gesture Menus & Hover Overlays):** Elevated white surfaces with enhanced depth: `0 16px 36px -6px rgba(74, 33, 96, 0.12), 0 4px 12px -2px rgba(165, 95, 198, 0.1)`.
- **Gesture Hover State:** When a mid-air hand gesture locks onto a target, the element scales up subtly (`scale(1.03)`) and gains a soft primary halo: `0 0 0 4px rgba(165, 95, 198, 0.25)`.

## Shapes

The design system is strictly pill-shaped and rounded (`roundedness: 3`). There are zero hard 90-degree corners anywhere in interactive or content surfaces.

### Geometric Rules
- **Interactive Buttons & Chips:** Full rounded pill form (`border-radius: 9999px`).
- **Cards & Functional Panels:** Rounded corners set to `2rem` (32px), creating friendly, pebble-like surfaces.
- **Modal Dialogs & Large Containers:** Outer radius set to `3rem` (48px).
- **Curved Section Breaks:** Sweeping downward or upward convex arcs with an amplitude of 40px to 64px, giving whole sections an illustrated page-turn aesthetic.
- **Gesture Reticles:** Perfectly circular indicator targets (`50%` radius) that fill clockwise as gestures hold position.

## Components

### Buttons
- **Primary Pill:** Background `#A55FC6`, text `#FFFFFF`, full border radius (`9999px`), vertical padding `0.875rem`, horizontal padding `2rem`. On hover or gesture hold, smooth transition to `#7A3A9A`.
- **Secondary / Ghost Pill:** Background `#F5E6F8`, text `#7A3A9A`, no border, padded identically. Hover brings a subtle outline of `rgba(165, 95, 198, 0.4)`.
- **Gesture Circular Action:** 56px circular floating buttons containing centered plum or white iconography with a 3px radial progress border tracking gesture activation.

### Cards & Lesson Tiles
- Surface: `#FFFFFF` or `#F8EFFF`.
- Radius: `2rem` (32px).
- Internal Padding: `2rem`.
- Structure: Centered or balanced left-aligned content with a soft rounded illustrative icon container (often `#F5E6F8` fill) at the top. Circular arrow or action affordances sit at the base of the card.

### Chips & Filters
- Compact pill elements (`border-radius: 9999px`) with `0.5rem` vertical and `1.25rem` horizontal padding.
- Inactive state: `#F8EFFF` background, `#7A3A9A` text.
- Active state: `#A55FC6` background, `#FFFFFF` text.

### Form Inputs & Text Fields
- Container: Fully rounded capsules (`9999px`) for single-line inputs and search fields; `1.5rem` radius for multi-line lesson inputs.
- Background: `#FFFFFF` with a 1.5px solid border in `#E8D5F0`.
- Focus / Active: Border transitions to `#A55FC6` with a soft purple ambient ring (`0 0 0 3px rgba(165, 95, 198, 0.2)`).
- Text: `#4A2160`, placeholder text in `rgba(74, 33, 96, 0.45)`.

### Checkboxes & Radio Buttons
- Custom circular selection nodes. Checkboxes use rounded squares (`0.5rem` radius), radios use full circles (`50%`).
- Unchecked: `#FFFFFF` fill with `2px` solid border `#D4B3E2`.
- Checked: `#A55FC6` solid fill with a crisp white checkmark or inner dot.

### Specialized Ed-Tech & Gesture Components
- **Gesture Calibration Target:** A floating dual-ring indicator in `#A55FC6` with an inner pulsing circle that provides clear visual confirmation of hand detection distance.
- **Floating Lesson Toolbar:** A horizontal pill dock anchored at the base of the screen, housing tools (pen, highlighter, slide advance) in soft `#FFFFFF` with subtle purple iconography and active purple indicator pills.