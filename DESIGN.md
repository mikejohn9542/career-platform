---
name: Michael Johnson · Business Analytics & Full-Stack
description: A résumé read as a consulting deck; every section leads with the takeaway, every number is an exhibit.
colors:
  navy-950: "#060f22"
  navy-900: "#0a1730"
  navy-800: "#11234a"
  navy-600: "#2a3f6e"
  ink: "#0b1630"
  ink-soft: "#3c4a66"
  ink-mute: "#5d6a85"
  paper: "#ffffff"
  paper-2: "#f3f5fa"
  rule: "#d9dfeb"
  rule-strong: "#b7c1d6"
  cobalt: "#2f62ff"
  cobalt-bright: "#6f95ff"
  cobalt-wash: "#e8eeff"
  amber: "#f0a500"
  amber-ink: "#8a5a00"
  amber-wash: "#fff4d6"
  on-navy: "#f4f7ff"
  on-navy-soft: "#b6c3e3"
  hairline-on-navy: "rgba(182, 195, 227, 0.3)"
typography:
  display:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(2.9rem, 8.4vw, 6rem)"
    fontWeight: 800
    lineHeight: 0.98
    letterSpacing: "-0.035em"
    fontVariation: "\"wdth\" 115"
  figure:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(2.6rem, 5vw, 4rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontFeature: "\"tnum\" 1"
    fontVariation: "\"wdth\" 112"
  headline:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(2rem, 4vw, 3.1rem)"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.02em"
    fontVariation: "\"wdth\" 108"
  title:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(1.4rem, 2.4vw, 1.75rem)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 600
    lineHeight: 1
  caption:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "0.88rem"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  cell: "3px"
  tag: "4px"
  panel: "20px"
  pill: "999px"
spacing:
  space-1: "0.25rem"
  space-2: "0.5rem"
  space-3: "0.75rem"
  space-4: "1rem"
  space-5: "1.5rem"
  space-6: "2rem"
  space-7: "3rem"
  space-8: "4.5rem"
  space-9: "7rem"
components:
  button-primary:
    backgroundColor: "{colors.amber}"
    textColor: "{colors.navy-950}"
    rounded: "{rounded.pill}"
    padding: "0 1.5rem"
    height: "2.75rem"
  button-primary-dark:
    backgroundColor: "{colors.navy-900}"
    textColor: "{colors.on-navy}"
    rounded: "{rounded.pill}"
    padding: "0 1.5rem"
    height: "2.75rem"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.on-navy}"
    rounded: "{rounded.pill}"
    padding: "0 1.5rem"
    height: "2.75rem"
  button-secondary-confirmed:
    textColor: "{colors.amber}"
  lens-switch:
    backgroundColor: "rgba(6, 15, 34, 0.55)"
    rounded: "{rounded.pill}"
    padding: "4px"
  lens-option:
    textColor: "{colors.on-navy-soft}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    height: "2.75rem"
  lens-option-active:
    backgroundColor: "{colors.on-navy}"
    textColor: "{colors.navy-950}"
  chip:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
  chip-business-lit:
    backgroundColor: "{colors.amber-wash}"
  chip-technical-lit:
    backgroundColor: "{colors.cobalt-wash}"
  badge:
    backgroundColor: "{colors.amber}"
    textColor: "{colors.navy-950}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  deck-index-link:
    textColor: "{colors.ink-mute}"
    typography: "{typography.label}"
    padding: "0.5rem 0.75rem"
  deck-index-link-current:
    textColor: "{colors.ink}"
    padding: "0.5rem 0.75rem 0.5rem 1rem"
  closing-panel:
    backgroundColor: "{colors.paper-2}"
    rounded: "{rounded.panel}"
    padding: "3rem"
---

# Design System: Michael Johnson · Business Analytics & Full-Stack

## Overview

**Creative North Star: "The Exhibit"**

The page is a consulting deck. A full-bleed deck-navy title slide carries a monumental two-line action title and a strip of numbered exhibits; below it, white slides each open with a takeaway headline and read like the body of a client presentation. Structure comes from hairline rules, fixed-slot figures and an index rail, not from boxes. Density is moderate. The negative space around the action titles is there on purpose, and the supporting rows are tight and scannable.

Color carries meaning. Cobalt is the system's single signal for links, focus, selection, the scroll-progress bar and the "technical" lens. Amber is the second line: proof figures, the primary résumé action, the first-place badge and the "business" lens. The role lens is the signature interaction. It dims whatever is off-lens and lights the matching chips in that lens's wash, so one page can serve two kinds of reader.

Motion is short and eased out (one curve, `cubic-bezier(0.16, 1, 0.3, 1)`). Titles and exhibits rise in, figures count up into slots reserved at their final width, and all of it collapses under reduced motion.

**Key Characteristics:**
- Navy title slide, white content slides, one closing panel in paper-2.
- Archivo set wide (wdth 108–115) and heavy (800) for action titles and figures; Hanken Grotesk for everything read.
- Hairline exhibit rules (1px) in place of cards; no cards nested in cards.
- Tabular figures in fixed-width slots; figures inside sentences are set in the display face.
- Pill-shaped controls; the 44px minimum touch height is held on every button and link row.
- Two-lens color coding: cobalt = technical, amber = business.

## Colors

A cool navy-and-ink neutral field with one electric cobalt signal and one warm amber second line.

### Primary
- **Electric Cobalt** (cobalt): links, link-list markers, the focus ring on paper, the text-selection fill, the scroll-progress bar, the datathon base cells, and the "technical" lens outline.
- **Lit Cobalt** (cobalt-bright): cobalt lifted for use on navy. It sets the second line of the hero title.
- **Cobalt Wash** (cobalt-wash): the fill of a technical chip lit by the lens.

### Secondary
- **Exhibit Amber** (amber): proof figures on navy, the primary résumé button, the "1st place" badge, the skip link, the focus ring on navy, the confirmed state of Copy email, and the "business" lens outline.
- **Amber Wash** (amber-wash): the fill of a business chip lit by the lens.
- **Amber Ink** (amber-ink): a deep amber defined for amber-toned text on paper. It is reserved in the tokens but not yet used on the shipped surface.

### Neutral
- **Deck Navy** (navy-900): the hero ground and the dark primary button.
- **Midnight** (navy-950): text on amber, and the translucent base of the lens switch.
- **Slide Rule Navy** (navy-800): the faint horizontal rules drawn every 6rem across the hero ground.
- **Slate Navy** (navy-600): the scrollbar thumb.
- **Ink** (ink): primary text on paper, dates and inline figures.
- **Soft Ink** (ink-soft): roles, summaries and bullets.
- **Muted Ink** (ink-mute): row meta, index links at rest and captions on paper.
- **Paper** (paper) / **Paper Two** (paper-2): the slide ground, and the closing panel.
- **Rule** (rule): 1px exhibit dividers on paper. **Strong Rule** (rule-strong): chip outlines.
- **On-Navy** (on-navy) / **On-Navy Soft** (on-navy-soft): primary and secondary text on navy.
- **Navy Hairline** (hairline-on-navy): proof-exhibit rules, plus the outlines of the secondary button and lens switch, all on navy.

### Named Rules
**The Two Lenses Rule.** Cobalt means technical and amber means business. Wherever the lens is involved, the hue tells the reader which reading they are in. Never swap them, and never add a third lens hue.

**The One Signal Rule.** On paper, cobalt is the only accent for interaction (links, focus, selection, progress). Amber on paper is limited to the badge, the business lens and the warm washes.

## Typography

**Display Font:** Archivo (variable width axis, self-hosted via next/font), with system-ui fallback
**Body Font:** Hanken Grotesk (self-hosted via next/font), with system-ui fallback

**Character:** Archivo widened and set at 800 has the presence of a deck headline. Hanken Grotesk stays quiet and legible underneath it, so the titles carry the argument and the body supplies the evidence.

### Hierarchy
- **Display** (800, clamp(2.9rem, 8.4vw, 6rem), 0.98, wdth 115): the two-line hero action title only. Each line rises in on its own stagger.
- **Figure** (800, clamp(2.6rem, 5vw, 4rem), 1, wdth 112, tabular): proof-exhibit numerals on navy, in amber.
- **Headline** (800, clamp(2rem, 4vw, 3.1rem), 1.05, wdth 108): slide action titles, max 22ch, written as takeaways. The closing title uses the same voice at clamp(2.2rem, 5vw, 3.6rem).
- **Title** (700, clamp(1.4rem, 2.4vw, 1.75rem), 1.05): row titles (company, project, field of study).
- **Body** (400, 1.0625rem, 1.6): running text, with lede, summary and bullets capped at 62–70ch. The hero lede scales to clamp(1.05rem, 1.6vw, 1.25rem).
- **Label** (600–700, 0.95–0.98rem, 1): buttons, lens options, index links, chips (0.92rem) and the badge (0.78rem). Labels are always sentence case.
- **Caption** (400, 0.88rem): exhibit source notes and the identity line under the name.

### Named Rules
**The Fixed Slot Rule.** Every displayed figure uses tabular numerals. A figure that animates reserves its final width before it moves, so nothing reflows, and the final value is server-rendered for screen readers and no-JS readers.

**The Figure-in-Sentence Rule.** Numerals and "first place" inside body copy are set in Archivo 700 in ink, so a scanning eye lands on the evidence. Four-digit years are excluded.

## Layout

- **Width and gutter:** content is capped at 76rem and centered, with a fluid gutter of clamp(1rem, 4vw, 3rem).
- **Spacing rhythm:** a nine-step scale from 0.25rem to 7rem. space-9 (7rem) separates slides, space-7 and space-8 handle section-level padding, and space-6 is the gap inside a slide.
- **Hero:** a full-bleed navy band with a top bar (name and identity on the left, actions on the right, wrapping). The action title has a fluid top margin of clamp(3.5rem, 11vh, 7.5rem). Below come the lens row and a three-column proof strip.
- **Deck:** a two-column grid with an 11rem sticky index rail and the slides beside it. Each row inside a slide is also two columns: a 12rem meta column (dates, location, exhibit graphic) and the content.
- **Skills:** an auto-fit grid of 16rem-minimum columns.
- **At 960px:** the deck collapses to one column and the index rail is hidden. The 3px progress bar stays.
- **At 720px:** rows and the proof strip stack. Proof dividers switch from vertical to horizontal, the lens row stacks, and hero spacing tightens to space-5 and space-6.

## Elevation & Depth

The system is flat. Depth comes from the navy/paper split, the paper-2 closing panel and 1px rules. The only shadows are the soft colored glows under the two filled pill buttons, and they mark those buttons as the primary action.

### Shadow Vocabulary
- **Amber glow** (`box-shadow: 0 10px 30px -12px rgba(240, 165, 0, 0.7)`): under the amber résumé button on navy.
- **Navy glow** (`box-shadow: 0 12px 30px -16px rgba(10, 23, 48, 0.8)`): under the navy résumé button on paper.

### Named Rules
**The Hairline Exhibit Rule.** Sections, rows and proof slots are separated by 1px rules (rule on paper, navy hairline on navy), never by cards, borders on every side, or shadows.

## Shapes

- **Interactive controls are pills (999px):** buttons, the lens switch and its thumb, chips and badges.
- **Content panels:** the single closing panel uses a 20px radius.
- **Small elements:** the PDF tag uses 4px, the datathon base cells 3px, and focus outlines 4px.
- **Content rows:** these have no container at all. They are defined only by a top rule.
- **Hero ground:** horizontal navy-800 lines every 6rem give it the feel of slide paper.

## Components

### Buttons
- **Shape:** pill (999px), with a minimum height of 2.75rem and padding of 0 1.5rem. The label is Hanken 700 at 0.98rem, and an inline "PDF" tag (4px radius, 0.72rem) may follow it.
- **Primary (on navy):** amber fill, midnight text, amber glow.
- **Primary dark (on paper):** navy-900 fill, on-navy text, navy glow.
- **Secondary (on navy):** transparent, with a 1px outline in on-navy-soft at 45% and on-navy text. On hover it gets an 8% on-navy wash. In the confirmed "Copied" state, the border and text turn amber for 2.2s.
- **Hover:** filled buttons lift 2px. Transitions run 260ms on the system ease.

### Chips
- **Style:** paper fill, 1px rule-strong outline, pill shape, 6px 12px padding, Hanken 600 at 0.92rem.
- **Lens states:** chips on the active lens take that lens's wash and full-hue outline (amber-wash/amber or cobalt-wash/cobalt). Off-lens chips dim with the rest of the off-lens content.

### Badge
- An amber pill with midnight Hanken 700 at 0.78rem, set inline after a row title. It is used only for a real distinction, such as "1st place".

### Cards / Containers
- **Corner Style:** the 20px panel radius. It is used once, on the closing "Let's talk" panel.
- **Background:** paper-2.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Internal Padding:** space-7, dropping to space-6/space-5 on mobile.
- Everything else is an exhibit row, not a card.

### Navigation
- **Deck index:** a sticky rail of section links. Each link has a 1px left rule, ink-mute text and Hanken 600 at 0.95rem. The current section turns ink, its rule turns cobalt, and it indents to 1rem (300ms). The rail is hidden below 960px.
- **Progress bar:** a 3px fixed cobalt bar at the top of the viewport. It scales along the x-axis with scroll.
- **Skip link:** an amber pill-ish tab (6px radius) that drops into view when it receives focus.

### Role Lens (signature)
- **Switch:** a three-option radiogroup (Both, Business, Technical) on navy. It sits in a pill track with a 4px inset, a 55% midnight fill and a hairline outline. A solid on-navy thumb slides under the active option (380ms). The active option's text is midnight and inactive options are on-navy-soft.
- **Effect:** any element tagged for the other lens drops to 0.42 opacity with saturate(0.4), on a 420ms transition. Chips on the active lens light in their wash. The lens re-weights the page and never hides content.

### Proof Exhibit (signature)
- A three-slot list on navy. Each slot holds an amber figure, a label (Hanken 600, 1.05rem) and a source note (caption, on-navy-soft). Slots are divided by navy hairlines.
- Slots rise in on a 140ms stagger, and figures count up over 1.4s once 60% of the strip is visible.

### Exhibit Graphic
- A small grid of cobalt cells, 0.85rem square with a 3px radius and a 6px gap. There is one cell per real counted unit (for example, 21 bases). Cells pop in on a 45ms stagger. A caption with the figure sits below.

### Links and Focus
- **Links:** cobalt with a 1px underline at a 0.22em offset, thickening to 2px on hover. External links carry a 12px stroked arrow SVG.
- **Focus:** a 3px cobalt outline at a 3px offset with a 4px radius. Inside navy regions the outline is amber.
- **Selection:** cobalt fill with paper text.

## Do's and Don'ts

### Do:
- **Do** open every slide with a takeaway headline (Archivo 800, wdth 108, max 22ch), not a category label.
- **Do** set every figure in tabular numerals and reserve its final width before animating it.
- **Do** separate rows and exhibits with 1px rules (rule on paper, navy hairline on navy).
- **Do** keep cobalt = technical and amber = business wherever the role lens touches.
- **Do** keep every button, lens option and link row at least 2.75rem tall.
- **Do** use `cubic-bezier(0.16, 1, 0.3, 1)` for all motion and honor prefers-reduced-motion.
- **Do** switch the focus ring to amber inside navy regions.

### Don't:
- **Don't** wrap rows or exhibits in cards, and never nest a card inside a card. The closing panel is the only filled container.
- **Don't** let the lens hide content. It only dims (0.42 opacity) and lights.
- **Don't** introduce a third accent hue or swap the lens hue assignments.
- **Don't** put shadows on anything other than the two filled primary buttons.
- **Don't** animate a figure that was not server-rendered at its final value first.
