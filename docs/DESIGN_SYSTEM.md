# DESIGN_SYSTEM

Feel: trustworthy, calm, urgent only when needed. Deep navy dominates, yellow marks action and alerts, white gives clarity. Source of truth for values is `packages/ui-tokens`; this doc describes intent.

## Colour tokens
| Token | Light | Dark |
|---|---|---|
| `bg` | `#FFFFFF` | `#050E24` |
| `surface` | `#F4F6FB` | `#0A1A3F` |
| `surface-elevated` | `#FFFFFF` | `#102353` |
| `primary` (navy) | `#0A1F4D` | `#1B3A8A` |
| `on-primary` | `#FFFFFF` | `#FFFFFF` |
| `accent` (yellow) | `#FFC933` | `#FFC933` |
| `on-accent` | `#0A1F4D` | `#0A1F4D` |
| `text` | `#0A1F4D` | `#F2F5FF` |
| `text-muted` | `#5B6B8C` | `#9FB0D6` |
| `border` | `#DDE3F0` | `#1D3170` |
| `focus-ring` | `#0A1F4D` | `#FFC933` |
| `success` / `warning` / `danger` / `info` | `#1A7F4B` / `#B7791F` / `#C53030` / `#3E63DD` | tuned lighter variants |
| severity critical / high / medium / low | `#E5484D` / `#F76B15` / `#FFC933` / `#3E63DD` | tuned for dark |

Verify every text/background pair reaches WCAG AA (4.5:1 body, 3:1 large and UI). Add a contrast test in `packages/ui-tokens`.

## Usage rules
- Yellow is scarce: primary CTA ("Report an incident"), active/selected states, critical highlights. Text on yellow is navy.
- Severity is never colour-only: always icon + label (e.g. ▲ Critical).
- One primary action per screen.

## Theming
Light / Dark / System toggle, persisted (cookie on web, secure storage on mobile). No flash of wrong theme: web sets the class before hydration via a blocking inline script (nonce-allowed by CSP). Tokens are CSS variables on web, a theme object on mobile.

## Typography and spacing
Inter (or Plus Jakarta Sans). Scale: 12/14/16/18/20/24/30/36. 4-px spacing grid. Radius 8 (inputs/buttons), 12 (cards), 16 (sheets). Support dynamic type / text scaling to 200%.

## Components (build in `apps/web` with shadcn/ui; mirror in mobile)
Button (primary/secondary/ghost/danger), Input, Select, Textarea, Switch, Tabs, Dialog/Sheet, Toast, Badge (severity, status, verified), TicketCard, Timeline, MapMarker/Cluster, FilterBar, EmptyState, Skeleton, OfflineBanner, ThemeToggle, ConsentBanner.

## States to design for every screen
Loading (skeleton), empty, error (with retry), offline, partial (queued report), permission-denied (location/notifications), success.

## Accessibility (WCAG 2.2 AA)
Semantic HTML, labelled controls, visible focus (never removed), logical focus order, 44×44 px targets, keyboard-complete flows, ARIA only when needed, VoiceOver/TalkBack labels, reduced-motion support, map has a list alternative, form errors announced, no time-limited interactions without extension.

## Content and tone
Plain, calm language. Emergency disclaimer on landing and report screen: "For emergencies, call your local emergency number first." Avoid alarmist wording in push text. Never show raw coordinates.

## Responsive
Mobile-first, verified from 320 px; breakpoints 640 / 768 / 1024 / 1280. Safe areas respected on mobile.

## Maps
MapLibre style with navy/white palette in both themes; clusters in navy with white count, selected marker yellow; heat layer yellow→orange→red.

## Iconography and motion
One icon set (Lucide). Motion subtle (150–250 ms), disabled under reduced-motion.
