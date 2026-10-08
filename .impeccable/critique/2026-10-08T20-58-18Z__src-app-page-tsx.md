---
target: my website (home page)
total_score: 20
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 3
target_identity: "file:C:\\Users\\mjjoh\\OneDrive\\Desktop\\ISBA Projects\\career-platform\\src\\app\\page.tsx"
target_fingerprint: "sha256:d6ad6471131a9675975415d32a856f621c0c651a68b7b602c9f05649d3b649b6"
target_path: "C:\\Users\\mjjoh\\OneDrive\\Desktop\\ISBA Projects\\career-platform\\src\\app\\page.tsx"
timestamp: 2026-10-08T20-58-18Z
slug: src-app-page-tsx
---
Method: dual-agent (A: design review, B: detector + rendered-HTML evidence). No browser automation: visual claims inferred from source and live HTML.

## Design Health Score
| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | External links don't signal they leave the site |
| 2 | Match System / Real World | 3 | "Datathon" title is a category; .pptx opens GitHub viewer |
| 3 | User Control and Freedom | 3 | No jump links on a long scroll |
| 4 | Consistency and Standards | 2 | Job/education/project detail lines formatted differently; education is prose |
| 5 | Error Prevention | 3 | resume.pdfUrl points to LinkedIn |
| 6 | Recognition Rather Than Recall | 2 | No section nav; comma-string skills; GPA/honors buried |
| 7 | Flexibility and Efficiency | n/a | Portfolio, no repeat workflows |
| 8 | Aesthetic and Minimalist Design | 1 | Browser-default styling, no emphasis, headline repeats summary |
| 9 | Error Recovery | 3 | Snapshot fallback; no user errors |
| 10 | Help and Documentation | n/a | Not needed for a résumé page |
| Total | | 20/32 | Acceptable |

## Design Specificity Verdict
Unstyled browser-default HTML; category-interchangeable. Detector: exit 0, 0 findings (weak evidence: little styling to flag). HTML checks: resume PDF 404 live; no :focus styles; no colors set; lang/viewport/heading order pass. No overlay (no browser injection available).

## Priority Issues
1. [P1] No résumé download (PDF exists, unlinked, 404 live). Fix: primary download button in header; pdfUrl to https://michaeljportfolio.me/michael-johnson-resume.pdf (needs VM re-seed). clarify + layout
2. [P1] No visual identity or hierarchy (page.tsx:28). Fix: type pairing, spacing scale, one accent, styled links + focus. typeset + colorize
3. [P1] Business + technical positioning not visible above the fold (headline page.tsx:31 duplicates summary). Fix: headline naming both halves + 3-item proof strip (copy needs approval). clarify
4. [P2] Wall-of-text bullets; metrics unbolded; education one paragraph; comma skills. distill
5. [P2] Weak project evidence: "Datathon" title, .pptx GitHub link, stack on one line. polish

## Persona Red Flags
Priya (analytics recruiter): GPA buried, Tableau 7th, no PDF, bagroom title framing. Casey (mobile): header line wraps with tight targets; stack run-on; no reachable CTA. Sam (a11y): two "GitHub" links, no skip link, "·" read aloud, default focus. Jordan: no nav, links don't look like actions, .pptx link.

## Minor Observations
Default 8px body margin, no tokens/dark mode; generic metadata, no Open Graph; coursework noise.

## Questions to Consider
Which 3 facts must the first screen carry? Lead with business half, technical as proof? A version for both a CFO and a CTO?
