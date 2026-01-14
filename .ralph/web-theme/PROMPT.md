# Ralph Workstream: 8-bit Pixel Art Theme

## Objective
Create the 8-bit Simpsons-inspired pixel art UI theme for Ralph Web using Tailwind CSS and shadcn/ui components.

## Context
Ralph Web uses an 8-bit retro game aesthetic inspired by The Simpsons (via colors and naming, avoiding IP issues). The technical specification is at `/Users/ryanbeck/.claude/plans/agile-marinating-candy.md`.

## Prerequisites
- web-foundation workstream must be complete (Next.js 14 + Tailwind set up)

## Scope

### Include
- Install and configure shadcn/ui as component base
- Create pixel art CSS theme with:
  - Pixelated fonts (Press Start 2P from Google Fonts, VT323)
  - Simpsons color palette (#FFD90F yellow, #70D1FE sky blue, #D6E69F green, #F14C38 red)
  - 8-bit border styles (pixelated borders)
  - Retro button hover effects
- Create pixel UI components:
  - PixelButton.tsx
  - PixelCard.tsx
  - PixelProgress.tsx (progress bar)
  - PixelInput.tsx
- Create placeholder RalphSprite.tsx component (will use actual sprites later)
- Set up public/sprites/ directory structure

### Exclude
- Do NOT create actual pixel art sprites yet (placeholder colored boxes for now)
- Do NOT implement page layouts yet
- Do NOT add sound effects yet

## Deliverables

1. **web/src/styles/pixel-theme.css** with CSS variables:
   ```css
   :root {
     --simpson-yellow: #FFD90F;
     --simpson-blue: #70D1FE;
     --simpson-green: #D6E69F;
     --simpson-red: #F14C38;
     --simpson-brown: #8B5E34;
     --pixel-border: 4px solid;
   }
   ```

2. **web/tailwind.config.ts** extended with pixel theme colors and fonts

3. **Pixel Components** in `web/src/components/pixel/`:
   - PixelButton.tsx - 8-bit styled button with hover animation
   - PixelCard.tsx - Container with pixel borders
   - PixelProgress.tsx - Retro progress bar
   - PixelInput.tsx - Text input with pixel styling
   - RalphSprite.tsx - Placeholder sprite component

4. **Font setup** - Press Start 2P from Google Fonts

5. **public/sprites/** directory with placeholder README

## Instructions

1. Check if web-foundation is complete (turbo.json, Next.js app exists)
2. If not complete, write "NEEDS_INPUT: Waiting for web-foundation workstream to complete"
3. Read PROGRESS.md to see what's been done
4. Pick next uncompleted task
5. Implement with minimal changes
6. Test components render correctly
7. Update PROGRESS.md
8. If all done, write "## Status: COMPLETE"

## Design References

### Simpsons Color Palette
- Primary Yellow: #FFD90F (Homer's skin, main accent)
- Sky Blue: #70D1FE (backgrounds)
- Grass Green: #D6E69F (secondary)
- Bart's Red: #F14C38 (errors, alerts)
- Brown: #8B5E34 (borders, outlines)
- White: #FFFFFF (text on dark)
- Dark: #1a1a2e (backgrounds)

### Font Stack
- Headings: "Press Start 2P", monospace
- Body: "VT323", monospace
- Fallback: system-ui, monospace
