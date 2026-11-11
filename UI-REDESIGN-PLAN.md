# BookClub CTUT · Premium editorial redesign

## Scope and baseline · 2026-11-11

Local source of truth: v1.1.0, commit `c94c855`. Preserve the existing uncommitted `VERIFICATION.md` and the backup, release-readiness, role-review and live-test scripts. No database, Auth/RLS/RPC/schema changes, production writes, commit, push or deployment.

Routes: `/` Home; `/:eventCode` event; `/:eventCode/:guestAlias` invitation; `/admin/login`; guarded `/admin/`, `/admin/new`, `/admin/edit/:eventCode`, `/admin/guests`, `/admin/roles`; `/auth/accept`. All retain basename `/bookclub` and the Pages `404.html` recovery.

## Audit

| Current state | Problem | Proposed improvement | Priority |
|---|---|---|---|
| K2D imposed with universal `!important`; layered stylesheet | Conflicting palettes, heading weights and broad `footer` rules leak into calendars | Semantic tokens, scoped CSS modules by surface, K2D type scale | P0 |
| Simple title and event rows | Little brand identity or visual depth | Editorial masthead, original paper/book composition, prominent dates and clear filter feedback | P1 |
| Static public detail, no agenda rendered | Event content lacks structure; agenda unavailable here | Event hero, readable content, schedule, venue and program | P1 |
| Invitation cover unmounts immediately | No meaningful opening, focus stays on removed control | CSS paper-opening sequence, immediate readable content, explicit focus transfer | P0 |
| Invitation colors mix navy/rose and emerald | Inconsistent brand; repetitive boxed sections | Emerald/cream/champagne letter, contrasting sections and connected timeline | P1 |
| Hidden background audio retries on any gesture | No user control or clear consent | Explicit play/pause and status, safe signing/refresh/cleanup | P0 |
| Admin nav is a row inside the public layout | Navigation and content compete; poor mobile hierarchy | Separate responsive admin shell, active state, role-aware existing guards | P1 |
| Dashboard is a repeated panel list | Scanability limited; no overview | Real-data counts, compact management rows and filter results | P1 |
| Editor mixes content/media/time in one fieldset | Long form difficult to scan | Anchored sections and restrained sticky save controls | P1 |
| Agenda items use index identity; no drag reorder | Local picker state can move between items | Stable UI IDs, existing dnd-kit with keyboard/button alternatives | P0 |
| Guest selection has no search | Long lists hard to use | Search, selected rows, accurate bulk selection/count | P1 |
| Guest directory already has drag, drawer and dirty guards | Visual hierarchy inconsistent | Preserve data flow, refine panel/navigation/focus | P1 |
| Role directory already enforces capability checks | Forms and rows visually dense | Clear role labels and accessible dialogs; preserve backend checks | P1 |
| Native confirm dialog; date panel lacks Escape/focus return | Inconsistent keyboard behavior | Native dialog foundation and disclosure focus restoration | P0 |
| Admin routes lazy; public routes eager | Unneeded invitation code on home | Lazy public detail/invitation; inspect actual chunks | P1 |

Preserve: public Draft exclusion; UTC+7 and 24h conversion; multi-day calendar; safe rich document renderer; uploaded venue/music signing; individual/group snapshots; primary-only aliases; dirty state and retry; Admin/Editor capabilities; CRUD and ordering RPC contracts; logo order Đoàn/Hội/CTUT/BookClub.

## Direction

Modern editorial / literary culture. K2D remains the only family; Vietnamese fully supported. Paper folds and the book gutter become the identity motif. Original CSS/SVG art uses no unlicensed photographs or invented event content. ENERGY 3 / RHYTHM 3 / MOTION 3 for public and invitation; 1 / 2 / 1 for administration. Gold marks the seal and focus, not every surface.

Motion: transform/opacity; 120/180/300/550/900ms tokens; one shared reveal primitive; CSS scroll timeline with visible fallback; opening sequence never gates content; reduced motion disables spatial movement. No scroll hijack, WebGL, or new animation library unless evidence requires one.

## Execution and evidence

1. Baseline: typecheck PASS; lint PASS; build PASS. Initial unit run 113/114 (rich editor timeout under parallel load, investigate). Playwright baseline running with two workers. Sandbox initially blocked cache/native subprocesses; approved local checks run through the normal permission mechanism.
2. Design foundation and public pages, inspect desktop/mobile before next phase.
3. Invitation, audio and motion; individual/group/long/minimal content tests.
4. Admin shell, overview, editor, agenda, guest and role surfaces.
5. Polish, keyboard/reduced motion, nine specified widths and state screenshots.
6. Regression, bundle/performance measurement and final evidence report.

Baseline build: main 386.36 kB (117.35 gzip), shared Feedback/Supabase 248.30 kB (66.35 gzip), icon-related shared chunk 95.09 kB (31.67 gzip), EventForm 469.05 kB (149.84 gzip), CSS 34.83 kB (8.59 gzip).

All data-changing browser tests use intercepted `bookclub-test.invalid` requests. Screenshots are test fixtures, never claims about real events. Historical live reports do not prove this redesign works against production.

## Design references

Read source Markdown only, saved locally under `.local/design-references/`: Hallmark (MIT), Taste (MIT), UI UX Pro Max (MIT), Impeccable (Apache-2.0), GSAP React (MIT) and Scroll Craft (MIT). Anti-slop core/UI/human/mobile/copy are installed locally. User art direction and preservation requirements override advisory style restrictions. No remote skill executable, generated scaffold, external AI review, 3D package, or asset copied. Sites guidance used only for existing-checkout local preview, no hosting operations.

## Outcome · 2026-11-11

All eight local phases implemented and reviewed. Public, invitation and administration use the shared editorial system; screenshots cover nine requested widths and optional/long/loading/error states. Final full regression: TypeScript/ESLint/build PASS, 116 unit tests PASS, 101 Playwright tests PASS, 9 intentional duplicate matrix skips. Added only axe and Lighthouse dev dependencies; no new runtime animation dependency.

Mobile Lighthouse local fixture scores: Performance 100/93/94 and Accessibility 100 for home/detail/cover. LCP detail/cover still misses the 2.5s target; field INP, physical phone performance, Safari and live Supabase verification remain unverified. No production actions performed. Full before/after, evidence, bundle numbers and limitations: [UI-REDESIGN-VERIFICATION.md](UI-REDESIGN-VERIFICATION.md).
