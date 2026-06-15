# SplitEase Design System Specification

## Design Inspiration

Reference:
https://dribbble.com/shots/25683483-Dashboard-UI

Design Style:

* Modern SaaS Dashboard
* Dark Theme
* Minimal & Premium
* Card-Based Layout
* Clean Data Visualization
* High Contrast
* Soft Shadows
* Rounded Components

---

# Overall Layout

## Desktop

Structure:

Sidebar (Left)
+
Main Content Area (Center)

Sidebar Width:
280px

Content Area:
Remaining Width

Max Content Width:
1440px

Padding:
24px

Gap:
24px

---

# Color System

## Backgrounds

Primary Background:
#0F1117

Secondary Background:
#151922

Card Background:
#1A1F2B

Hover Background:
#242A38

Border:
#2D3445

---

## Accent Colors

Primary Green:
#22C55E

Success Green:
#16A34A

Orange:
#F59E0B

Red:
#EF4444

White:
#FFFFFF

Light Gray:
#9CA3AF

Muted Gray:
#6B7280

---

# Typography

Font Family:
Inter

Fallback:
sans-serif

Heading 1:
32px
700

Heading 2:
24px
600

Heading 3:
18px
600

Body:
14px
400

Small:
12px
400

---

# Sidebar Design

Position:
Fixed Left

Components:

* App Logo
* Dashboard
* Groups
* Expenses
* Analytics
* Settings
* Logout

Style:

* Rounded menu items
* Active item highlighted in green
* Smooth hover effect
* Icon + Text

---

# Login Page

Layout:
Centered Card

Components:

* SplitEase Logo
* Welcome Text
* Email Field
* Password Field
* Login Button
* Register Link

Card Width:
420px

Border Radius:
20px

Shadow:
Soft Glow

---

# Dashboard Page

## Top Header

Contains:

* Greeting
* Search Bar
* User Profile Avatar

---

## Statistics Cards

4 cards in one row

Card 1:
Total Expenses

Card 2:
You Paid

Card 3:
You Owe

Card 4:
Groups Count

Style:

* Rounded 20px
* Dark Card
* Small trend indicator
* Colored icon

---

## Group Cards Section

Card Content:

* Group Name
* Members Count
* Total Expenses
* Last Activity

Actions:

* View
* Add Expense

Grid:
2 columns desktop
1 column mobile

---

## Recent Expenses Section

Expense Card:

* Expense Name
* Amount
* Paid By
* Date
* Group Name

Layout:
Card List

---

## Balance Summary

Show:

"You owe"

"You are owed"

Settlement Suggestions

Example:

Raj owes Arjun ₹500

Style:

Green highlight for positive balance

Orange highlight for pending balance

---

# Add Expense Page

Form Card

Fields:

* Group Selector
* Expense Name
* Amount
* Paid By
* Split Members
* Notes

Submit Button:
Full Width

Primary Green

---

# Component Design

## Buttons

Height:
48px

Radius:
12px

Primary:
Green

Secondary:
Dark Gray

Hover:
Brightness Increase

---

## Inputs

Height:
48px

Radius:
12px

Dark Background

Green Border On Focus

---

## Cards

Radius:
20px

Background:
#1A1F2B

Border:
1px solid #2D3445

Padding:
20px

---

# Animations

Duration:
0.25s

Effects:

* Hover Lift
* Fade In
* Smooth Card Scaling
* Button Press Effect

---

# Mobile Design

Breakpoint:
768px

Changes:

* Sidebar becomes Drawer Menu
* Cards become Single Column
* Statistics Cards become Horizontal Scroll
* Full Width Forms
* Responsive Tables

---

# UX Requirements

* Fast Loading
* Clean Navigation
* No Clutter
* Maximum 3 Clicks To Any Action
* Mobile First Responsiveness
* Smooth Animations
* Consistent Card-Based Design

---

# Final Visual Goal

Create a premium SaaS dashboard experience similar to modern fintech and analytics platforms while adapting it for SplitEase expense tracking.

The interface should feel:

* Professional
* Modern
* Premium
* Fast
* Easy To Understand

Use dark mode as the default theme.