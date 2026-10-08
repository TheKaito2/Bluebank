# Notice of modification

LightBluePrep is a modified version of **Bluebank**
(https://github.com/jackwangxyw/Bluebank, Copyright its contributors),
distributed under the GNU General Public License v3 (see LICENSE).

Modified by TheKaito2 (https://github.com/TheKaito2). Changes include:

- 2026-10-06: Home page rebuilt as a question browser: filter sidebar with a
  domain/skill tree, full question list with per-question status, Hide done,
  Mixed / By topic / Random ordering, open-at-first-unanswered.
- 2026-10-06: College Board question IDs stored (`questions.cb_id`) and shown
  in the list and on each question, with copy and YouTube search.
- 2026-10-08: Rebranded as LightBluePrep (name, logo, favicon, link preview,
  About and privacy pages); upstream sync endpoints removed from the build;
  optional donation link.
- 2026-10-08: Own Google sign-in and sync: Worker `lightblueprep-sync` with its
  own D1 database and OAuth client; privacy page updated for accounts;
  YouTube button searches the bare question ID.
- 2026-10-08: Phone layout: bottom tab bar, one-row toolbar, two-line list
  rows, filters as a bottom sheet, compact question header.
- 2026-10-08: Support links (Ko-fi in the nav, Ko-fi and Buy Me a Coffee on
  About); privacy page lists the donation platforms.
- 2026-10-08: Question ID search on the home list; anonymous bug/feedback
  form (Worker /feedback, rate limited) with an owner-only inbox.
- 2026-10-08: Security headers (CSP, frame blocking) via web/public/_headers;
  review fixes (feedback kind, inbox cap, privacy wording, a11y roles).
- 2026-10-08: Topic-first Home (question list removed; ID search opens a
  question directly), streaks and an estimated-score trend (lib/progress.ts,
  /api/history), Support popup with Ko-fi, Buy Me a Coffee and PromptPay.
- 2026-10-08: Design system (web/src/tokens.css, DESIGN.md): section colours
  (Reading and Writing pink, Math light blue), icons instead of emoji,
  asymmetric progress layout, loading skeletons.
- 2026-10-08: Bolder identity: Bricolage Grotesque display type, coloured
  hero band, section panels (pink / light blue), filled progress tiles, dark
  start bar with a chunky Start button.
- 2026-10-08: No gradients (flat colour, clipped discs); new nav with icon pill
  tabs; solid-colour page heads for Review (amber), Stats (mint) and About
  (ink); Stats, Review and About restyled with section panels and cards.
- 2026-10-08: Resources page (Khan Academy, James Lu SAT) and a 404 page.

The full history of changes is in the git log.
