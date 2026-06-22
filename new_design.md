Flux — Health Overview Dashboard

Design Specification

Extracted directly from the provided screenshot (colors sampled pixel-by-pixel from the source image, so hex values below are accurate to the design, not guessed).


0. Two Layers in This Shot

This is a Dribbble "presentation," which means there are really two things going on:

LayerWhat it isDo you need it on your site?Presentation frameThe bright lime page background + thick rounded black border around everythingOptional — purely decorative staging for the Dribbble shotProduct UIThe dark sidebar + light content area (the actual dashboard)This is the real, reusable component

The spec below covers both, but when you build this for your site, you'll mainly be implementing the Product UI section.


1. Color Palette

SwatchNameHexUsed for🟢Lime Accent#DAF15FActive badges, progress fill, highlighted chart bar, logo mark🟡Page Background Lime#DCE992Outer presentation background only⚫Ink / Near-Black#1E1D20Sidebar background, Sleep Analysis card background⬛Text Black#000000Headings, large stat numbers⚪White#FFFFFFCard backgrounds, pill buttons◽Content Background#E7E7E5Main content area (behind the white cards)🟣Purple Accent#B7AEF5Secondary chart color (energy bubble, progress bar, sleep duration)🟣Purple Tint#DEDAF8Lighter dots in the Wellness Index chart◽Icon Circle Gray#F3F3F3Round icon containers inside white cards◽Track Gray#F0F0F0Empty progress bar track⚫Dark Pill Gray#434244"Monthly" dropdown on the dark Sleep card◽Muted Text Gray#8C8C8CSecondary/helper text (emails, dates, labels)

css:root {
  --lime-accent: #DAF15F;
  --page-bg-lime: #DCE992;
  --ink: #1E1D20;
  --text-black: #000000;
  --white: #FFFFFF;
  --content-bg: #E7E7E5;
  --purple: #B7AEF5;
  --purple-tint: #DEDAF8;
  --icon-circle-gray: #F3F3F3;
  --track-gray: #F0F0F0;
  --dark-pill-gray: #434244;
  --text-muted: #8C8C8C;
}


2. Typography

The typeface is a bold geometric sans-serif (tight spacing, slightly rounded terminals). Closest free practical matches: Inter, General Sans, or Switzer.

ElementSizeWeightColorPage heading ("Health Overview")40–44px800 (Extra Bold)--text-blackCard stat number ("4,3k", "62", "78")32–36px700--text-black (white on dark cards)Sleep card stat ("85%", "7h 15m")26–28px700--whiteCard title ("Energy Used", "Heart Rate"...)15–16px600--text-black / --white on darkBody / subtitle text14px400--text-mutedSmall unit labels ("kcal", "bpm", "Avg 78 Bpm")12–13px500--text-mutedBadge text ("+5%", "+10%")12px700--text-blackNav items14–15px500--white / --text-black if activeChart axis labels (Jun, Jul...)12px500--text-muted (active month: --white, 700)


3. Layout & Grid

Reference frame: 1197×865px. Structure is two top-level columns: Sidebar + Main Content.

┌─────────────┬──────────────────────────────────────────────┐
│             │  Header: avatar/name ······ search ·· bell    │
│   SIDEBAR   │  "Health Overview" ················ Today ▾  │
│   (~244px)  ├───────────────┬──────────┬─────────────────────┤
│             │               │ Heart    │                     │
│  logo       │  Energy Used  │ Rate     │   Wellness Index    │
│  nav items  │  (tall card,  ├──────────┤   (tall card)       │
│  ...        │   spans both  │ Activity │                     │
│  promo card │   rows)       │          │                     │
│             ├───────────────┴──────────┴─────────────────────┤
│             │           Sleep Analysis (full width)          │
└─────────────┴──────────────────────────────────────────────┘

CSS skeleton:

css.dashboard {
  display: grid;
  grid-template-columns: 244px 1fr;
  min-height: 100vh;
  background: var(--content-bg);
}

.sidebar {
  background: var(--ink);
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
}

.main-content {
  padding: 32px 40px;
}

.cards-area {
  display: grid;
  grid-template-columns: 350px 1fr 1fr;
  gap: 20px;
}

.card-energy   { grid-row: 1 / 3; }                 /* tall, left */
.card-heart    { grid-column: 2; grid-row: 1; }
.card-activity { grid-column: 2; grid-row: 2; }
.card-wellness { grid-column: 3; grid-row: 1 / 3; } /* tall, right */
.card-sleep    { grid-column: 2 / 4; grid-row: 3; }

Spacing & radius tokens:

TokenValueCard border-radius20pxOuter frame radius (if using presentation frame)36pxPill / button radius999px (full)Bubble / avatar shapes50% (circle)Card padding24pxGrid gap20pxIcon circle size40×40px


4. Component Breakdown

Sidebar Navigation


Dark background (--ink), full height, ~244px wide
Logo: lime leaf/flower glyph + "flux" wordmark, white, bold, lowercase
Nav items (icon + label): Dashboard, Home, Nutrition, Reports, Users, Messages

Active item ("Dashboard"): white pill background, black icon + text, full-width rounded
Inactive items: white/light icon + text on transparent dark background
Two items carry a small lime circular count badge (Dashboard: 3, Reports: 1)



Promo card (bottom, pinned): lime background, rounded corners, bold black "Upgrade to Pro" heading, small gray-black subtext, a decorative rocket/bubbles illustration, and a full-width black pill button "Upgrade Now" with white text


Header Bar


Left: circular avatar photo, name (bold black, "Lucas Bennett"), email below (gray, smaller), small dropdown chevron
Right: white rounded search input with magnifying-glass icon and "Search..." placeholder; circular white notification button with bell icon and a small lime count badge ("2") at top-right corner


Page Title Row


Large bold black H1: "Health Overview"
Gray subtitle below: "Take control of your health today!"
Right-aligned: gray date text ("12 July, 2024") + white pill dropdown ("Today ▾")


Stat Card: Energy Used (tall, left column)


Header row: icon (lightning bolt) in light-gray circle, title, three-dot menu (⋮)
Big number "4,3k" + small lime "+5%" badge, with "kcal today" caption below
Bubble breakdown chart: three overlapping circles sized proportionally to value:

Purple circle — "2,6k kcal" (largest)
Black circle — "1,2k kcal" (medium)
Lime circle — "500 kcal" (smallest)



Progress list below (percentage + label + horizontal bar):

45% Running — purple fill
30% Workouts — black fill
25% Walking — lime fill
Bars sit on a light gray track (--track-gray)





Stat Card: Heart Rate


Heart icon in gray circle, title, ⋮ menu
Big number "62" + "bpm" unit, right-aligned helper text "Avg 78 Bpm"


Stat Card: Activity


Running-figure icon in gray circle, title, ⋮ menu
Big number "5,8" + "km" unit, right-aligned helper text "Active 75 Min"


Stat Card: Wellness Index (tall, right column)


Percent icon in gray circle, title, ⋮ menu
Big number "78" + "%" and a lime "+10%" badge
Dot-matrix chart: columns of small circles forming a bar-chart silhouette, using two purple tones (--purple for denser/upper dots, --purple-tint for lighter/lower dots) — purely decorative data visualization


Sleep Analysis (dark card, full width under columns 2–3)


Background: --ink, same as sidebar
Header: moon icon in dark-gray circle, "Sleep Analysis" (white), right-aligned gray pill dropdown "Monthly ▾"
Two stat blocks side-by-side, each with a small vertical color bar as an icon:

Lime bar + "85%" (white, bold) / "Sleep Efficiency" caption
Purple bar + "7h 15m" (white, bold) / "Sleep Duration" caption



Bar chart: 7 months (Jun–Dec), each month showing a pair of bars

Default state: dark diagonal hatch/stripe texture (low-contrast, on the dark background)
Highlighted month ("Sept"): two solid bars — lime and purple — with the label bolded in white and a small ↗ arrow icon
Axis labels in gray, active label in white/bold






5. Icons

Simple, single-weight line icons (~1.5px stroke), consistent sizing (~18–20px):
lightning bolt, heart outline, running figure, percent sign, moon/crescent, search/magnifier, bell, chevron-down, three-dot menu, house, clipboard/nutrition, bar-chart, people/users, chat bubble.

A free icon set like Lucide or Phosphor will match this style closely.


6. Build Notes


This is clearly built mobile-first-unfriendly as a desktop dashboard — for responsive use, plan to collapse the sidebar to icons-only or an off-canvas drawer below ~1024px, and stack the card grid to a single column below ~768px.
Numbers use a comma as the decimal separator ("4,3k", "2,6k") — likely European locale formatting; swap to a period if building for a US audience.
All "cards" share the same white background + 20px radius + subtle shadow — define once as a .card base class and extend.