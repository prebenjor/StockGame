Original prompt: Build a fun comprehensive browser stock/wealth game where the player starts poor, can trade stocks, buy and manage property, rent or sell buildings, work jobs, and grow into a broader financial empire.

2026-03-25
- Added dedicated loan-product depth work in progress: starter credit cards, business loans, and student-loan grace-period polish.
- Debt accounts now support product-specific metadata such as credit limits and linked businesses.
- Banking and business panels now expose the new borrowing paths directly instead of keeping them implicit.
- Save key bumped to `street-to-stock-save-v7` because debt-account shape changed.
- Verification passed with `npm run lint`, `npx tsc -b`, and `npm run build`.
- Browser automation hooks are still missing: no `render_game_to_text` or `advanceTime` hook is present, and `npx playwright --version` timed out instead of confirming a local ready install.
- Added the next stock-market pass: ETFs, persistent watchlists, and month-end market news with earnings reactions and watchlist alerts.
- Market UI now surfaces portfolio view, recent tape/news, ETF metadata, and watch/unwatch controls.
- Save key bumped again to `street-to-stock-save-v8` because market state now includes watchlists and news.
- Reworked the app shell so the game is no longer one giant stacked page. It now uses section navigation with one active system screen at a time plus an overview tab.
- Split the overview itself into multiple focused panels instead of one massive summary card. Condition, pressure, world/credit, milestones/tips, and latest events now live in separate overview sections.
- Refactored the main turn loop from month-by-month to week-by-week with `4 weeks = 1 month`.
- Core economics now settle weekly, while macro shifts, listings, opportunities, education month progress, and monthly history snapshots still resolve on the slower month cadence.
- Added `week` and `weekOfMonth` state, switched the main CTA to `Advance Week`, and bumped the save key to `street-to-stock-save-v9`.
- Added a recurring side-job layer on top of the weekly system: dedicated side jobs now pay every week and affect stress, energy, knowledge, reputation, and contacts.
- Rebalanced the weekly loop around that change: action points are now 3 per week, one-off gig payouts were reduced, and side work is now the steadier way to supplement a main path.
- Save key bumped again to `street-to-stock-save-v10` because side-job state was added.
- Side work is no longer one flat slot. It now supports multiple concurrent commitments when schedules do not conflict, plus internships and seasonal roles with real availability windows.
- Save key bumped again to `street-to-stock-save-v11` because side work moved from one id to an array of scheduled commitments.
- Added card images across career, education, lifestyle, and network content so jobs, gigs, skills, living-condition options, contacts, rivals, and opportunities all read as more visual systems instead of plain text grids.
- Shared media metadata now exists on more game content types, and the affected panels render those images through the same card-media pattern already used by property and business cards.
- Replaced the duplicated per-panel media helpers with one shared `CardMedia` component that now handles load failures cleanly and shows a labeled fallback block instead of a giant broken image area.
- Tightened default media height and introduced a `compact` media treatment for dense tabs such as lifestyle, career, education, banking, market, and network so images support the text instead of dominating the card.
- Re-verified after the shared-media pass with `npm run lint`, `npx tsc -b`, and `npm run build`.
- Rebalanced the weekly opening loop after noticing the week-based conversion was still applying monthly-scale pain in several places.
- Softened starter lifestyle condition shifts, reduced the early random life-event rate, raised the floor on starter jobs, lowered the shelter/food/foot monthly costs, and made the salary penalty from low health or energy less severe.
- Starter state is now less physically broken and the survival arrears payment is lighter, so a careful early run can hover near break-even instead of auto-spiraling.
- Verification passed with `npm run lint`, `npx tsc -b`, and `npm run build`.
- `npx playwright --version` now works outside the sandbox and reports Playwright `1.58.2`, but the repo still does not expose `render_game_to_text` or `advanceTime`, so the full `develop-web-game` automation loop is still blocked.

TODO
- Add browser-test hooks if the repo should support the `develop-web-game` Playwright loop.
- Verify the new debt-product flow interactively in browser once those hooks or a local Playwright setup exist.
- Verify ETF/watchlist/news flow interactively in browser once those hooks or a local Playwright setup exist.
- Verify weekly pacing in-browser and rebalance salary, rent, business, and stress numbers if the new cadence feels too harsh or too soft.
- Consider making schedule choice even more explicit next: visible weekly calendar blocks, part-time/full-time toggles, and side-job churn events.
- If the overview still feels busy, reduce copy and collapse low-priority metrics before adding more systems.
- Consider margin accounts or richer credit-card behavior later if the finance layer needs another step.
