---
name: Technical Support System
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#45464d'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#001a42'
  on-tertiary-container: '#3980f4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#d8e2ff'
  tertiary-fixed-dim: '#adc6ff'
  on-tertiary-fixed: '#001a42'
  on-tertiary-fixed-variant: '#004395'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  display-sm:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  title-lg:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  code-md:
    fontFamily: monospace
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 20px
  margin: 24px
---

## Brand & Style
The design system is engineered for high-performance technical environments where clarity, speed of cognition, and reliability are paramount. The brand personality is authoritative yet unobtrusive, functioning as a sophisticated tool rather than a decorative interface. 

The style is **Corporate Modern** with a focus on data density and high-contrast readability. It utilizes a structured hierarchy to guide support engineers through complex workflows without visual fatigue. The aesthetic leans into professional utility, using subtle borders and a refined color application to differentiate between information layers.

## Colors
The palette is rooted in a "Deep Navy" foundation for primary text and structural navigation, ensuring a grounded, serious tone. "Slate Grays" provide the secondary tier for supporting information and borders, while "Light Gray" serves as the primary canvas to minimize glare during long shifts.

Status colors are strictly reserved for urgency signals:
- **Critical:** Urgent action required; system failures or SLA breaches.
- **High:** Immediate attention needed; priority tickets.
- **Medium:** Standard workflow; active investigations.
- **Low:** Non-urgent updates or resolved states.

Use white (#FFFFFF) for component surfaces to create a clear "lift" from the light gray background.

## Typography
This design system utilizes **Inter** for its exceptional legibility and systematic weight distribution. 

- **Weight Usage:** Use Bold (700) and Semi-Bold (600) for headers to establish immediate hierarchy. Use Regular (400) for all body text and ticket descriptions.
- **Data Display:** For ticket IDs or technical logs, fallback to a system-stack monospaced font to differentiate technical strings from human-readable text.
- **Contrast:** Ensure all body text maintains at least a 4.5:1 contrast ratio against background surfaces, specifically using Deep Navy for maximum readability.

## Layout & Spacing
The layout follows a **12-column fluid grid** for the main content area, with a fixed sidebar for primary navigation (240px wide). 

- **Density:** This is a high-density UI. Use 8px (sm) and 16px (md) increments for internal component padding to allow more information on screen.
- **Information Groups:** Vertical sections in ticket views should be separated by 32px (xl) to create clear mental breaks between distinct datasets (e.g., Ticket History vs. User Details).
- **Responsive Behavior:** On tablet, the sidebar collapses into an icon-only rail (64px). On mobile, the layout reflows into a single column with a bottom navigation bar for quick access to "Open Tickets" and "Search."

## Elevation & Depth
In this design system, depth is communicated through **Low-contrast outlines** and **Tonal Layering** rather than heavy shadows.

- **Surface Levels:** 
  - Level 0: Background (#F8FAFC)
  - Level 1: Cards and main containers (#FFFFFF) with a 1px border (#E2E8F0).
  - Level 2: Modals and Popovers (#FFFFFF) with a soft, diffused shadow (0 10px 15px -3px rgba(15, 23, 42, 0.08)).
- **Interaction:** Hover states on interactive rows should use a subtle background shift to #F1F5F9 rather than increasing elevation. This maintains a flat, efficient feel suitable for a professional dashboard.

## Shapes
The design system employs **Soft** geometry. This provides a modern, approachable feel while maintaining the structural integrity of a professional tool.

- **Components:** Buttons, Input fields, and Cards use a 4px (0.25rem) corner radius.
- **Status Pills:** Chips for status (e.g., "Critical") use a larger 12px radius to distinguish them as distinct interactive or semantic metadata elements.
- **Icons:** Use 24px bounding boxes with a 2px stroke weight to match the clean lines of the Inter typeface.

## Components
- **Buttons:** Primary buttons use Deep Navy (#0F172A) with white text. Secondary buttons use a Slate Gray outline. Ghost buttons are reserved for tertiary actions in toolbars.
- **Input Fields:** Use a 1px border (#CBD5E1) that thickens and changes to Blue (#3B82F6) on focus. Labels must always be visible above the field in `body-sm` bold.
- **Status Chips:** High-contrast background with white text for "Critical" and "High". Light tinted background with dark text for "Medium" and "Low" to reduce visual noise on the dashboard.
- **Data Tables:** Use zebra-striping (alternating #F8FAFC) for long ticket lists. Row height should be fixed at 48px to optimize data density.
- **Alert Banners:** Full-width banners at the top of the dashboard for system-wide outages, utilizing the "Critical" red palette.
- **Activity Feed:** A vertical timeline component with small circular nodes and connector lines to visualize ticket history.