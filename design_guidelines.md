# Design Guidelines: Deepak Items

## Design Approach
**System**: Material Design (mobile-optimized)
**Rationale**: Utility-focused app requiring clear status indicators, action buttons, and information density. Material Design provides excellent mobile patterns for cards, lists, and state changes.

## Typography
- **Primary Font**: Inter (Google Fonts)
- **Hierarchy**:
  - Product titles: text-lg font-semibold
  - Buyer names: text-base font-medium
  - Prices/times: text-sm
  - Descriptive text: text-sm text-gray-600
  - Status labels: text-xs font-medium uppercase tracking-wide

## Layout System
**Spacing Units**: Tailwind 2, 4, 6, 8 (p-2, p-4, p-6, p-8, etc.)
- Mobile-first with full-width cards
- Screen padding: px-4 on mobile
- Card spacing: gap-4 between items
- Internal card padding: p-4
- Section spacing: py-6 between major sections

## Component Library

### Product Cards
- Full-width cards with rounded-lg borders
- Image at top (aspect-ratio-square or 4:3)
- Product info below: title, description, price
- Buyer queue section with expandable list
- Action buttons at bottom (Mark Sold, Remove)
- Status badge (Active, Sold, Removed) in top-right corner

### Buyer Queue Items
- Horizontal layout with avatar placeholder
- Left: Buyer name + time slot
- Right: Offered price (or "FREE" badge)
- Status indicators: Active (green accent), Missed (crossed out with opacity-50)
- Next-in-line gets subtle highlight background

### Status Indicators
- Chips/badges with color coding:
  - Active: Green background
  - Missed: Red with strikethrough
  - Sold: Blue background
  - Next in line: Amber/yellow highlight

### Buttons
- Primary action (Add Listing, Mark Sold): Full-width on mobile, solid background
- Secondary (Remove, Cancel): Outlined style
- Floating Action Button (FAB) for "Add New Listing" in bottom-right

### Forms (Add/Edit Listing)
- Full-screen modal on mobile
- Image upload area with preview (prominent at top)
- Text inputs with labels above
- Price input with currency symbol
- Description textarea
- Submit button at bottom (sticky)

### Navigation
- Top app bar with title and menu icon
- Tab navigation for: Active Listings | Sold Items
- Bottom sheet for buyer claiming flow

## Mobile Optimizations
- Swipe gestures: Swipe card left to remove, right to mark sold
- Pull-to-refresh on listing view
- Touch-friendly tap targets (min 44px)
- Bottom sheets for secondary actions
- Sticky headers when scrolling buyer queues

## Images
**Product Images**: Required for each listing
- Placement: Top of each product card, full-width
- Aspect ratio: Square (1:1) or 4:3
- Upload placeholder: Dashed border rectangle with camera icon
- Multiple images: Horizontal scroll gallery within card

**No hero image needed** - This is a utility app, launches directly into product listing view.

## Animations
- Card entry: Subtle fade-in stagger (100ms delay between cards)
- Status transitions: Color fade when marking missed/sold
- List reordering: Smooth position transitions when buyer moves up
- Keep minimal - prioritize performance on mobile

## Key Interactions
- Tap product card to expand/collapse buyer queue
- Long-press card for quick actions menu
- Tap "Claim" button opens bottom sheet with buyer form
- Auto-refresh every 30 seconds to check for missed pickup times
- Toast notifications for status changes