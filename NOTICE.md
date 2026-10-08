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

The full history of changes is in the git log.
