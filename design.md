# Zeitro Design System

## Brand Identity
Zeitro is a premium gamified countdown task tracker. The design should feel sleek, modern, and motivating - like a high-end productivity cockpit, not a generic SaaS template.

## Color Palette

### Primary Colors
| Token | Hex | Usage |
|---|---|---|
| Primary | #3B82F6 | Active countdown timers, primary CTAs, focused states |
| Secondary | #F59E0B | Urgency indicators, warnings, approaching deadlines |
| Tertiary | #10B981 | Completed tasks, earned currency, success states |
| Error | #EF4444 | Missed deadlines, currency loss, overdue tasks |

### Dark Mode (Default)
| Token | Value |
|---|---|
| Background | #0F0F1A |
| Card Surface | rgba(30, 30, 46, 0.8) + backdrop-blur-xl |
| Card Border | rgba(255, 255, 255, 0.06) |
| Text Primary | #E2E8F0 |
| Text Secondary | #94A3B8 |

### Light Mode
| Token | Value |
|---|---|
| Background | #F8FAFC |
| Card Surface | rgba(255, 255, 255, 0.9) |
| Card Border | rgba(0, 0, 0, 0.06) |
| Text Primary | #1E293B |
| Text Secondary | #64748B |

## Typography
| Role | Font | Weight |
|---|---|---|
| Headlines | Space Grotesk | 600-700 |
| Body | Inter | 400-500 |
| Labels/UI | Geist | 400-500 |
| Countdown digits | Geist Mono / tabular-nums | 700 |

## Spacing & Layout
- Border radius: 12px (rounded-xl)
- Card padding: 20px (p-5)
- Grid gap: 16px (gap-4)
- Mobile: single column
- Tablet: 2 columns
- Desktop: 3 columns

## Component Patterns

### Task Card (Glassmorphism)
- Rounded-xl corners
- Semi-transparent background with backdrop-blur-xl
- Subtle border (1px, white 6% opacity in dark mode)
- Countdown timer prominently displayed in large monospace digits
- Tags as pill-shaped badges
- Hover: subtle glow matching task state color

### Urgency States
- Normal: blue border glow (#3B82F6)
- Approaching: amber border glow (#F59E0B), pulsing animation
- Overdue: red border glow (#EF4444), steady pulse
- Completed: green checkmark, muted card

### Currency Badge
- Coin-like circular badge
- Running total with rupee symbol
- Green for positive changes, red for penalties
- Subtle bounce animation on value change

### Pomodoro Timer
- Circular progress ring (SVG)
- Primary color fill progressing clockwise
- Center shows remaining time in countdown digits

### Navigation
- Bottom nav on mobile (3 items: Dashboard, Analytics, Settings)
- Sidebar on desktop
- Active state: filled icon + primary color
- Inactive: outline icon + secondary text color

## Design Principles
1. **Glassmorphism cards** - subtle backdrop blur, semi-transparent backgrounds, soft borders
2. **Motion matters** - countdown numbers should feel alive, smooth transitions on state changes
3. **Information density** - dashboard shows multiple task cards without feeling cluttered
4. **Progressive disclosure** - card summary view vs expanded detail view
5. **Mobile-first** - thumb-friendly tap targets, swipe gestures for card actions
