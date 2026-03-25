Original prompt: Build a fun comprehensive browser stock/wealth game where the player starts poor, can trade stocks, buy and manage property, rent or sell buildings, work jobs, and grow into a broader financial empire.

2026-03-25
- Added dedicated loan-product depth work in progress: starter credit cards, business loans, and student-loan grace-period polish.
- Debt accounts now support product-specific metadata such as credit limits and linked businesses.
- Banking and business panels now expose the new borrowing paths directly instead of keeping them implicit.
- Save key bumped to `street-to-stock-save-v7` because debt-account shape changed.
- Verification passed with `npm run lint`, `npx tsc -b`, and `npm run build`.
- Browser automation hooks are still missing: no `render_game_to_text` or `advanceTime` hook is present, and `npx playwright --version` timed out instead of confirming a local ready install.

TODO
- Add browser-test hooks if the repo should support the `develop-web-game` Playwright loop.
- Verify the new debt-product flow interactively in browser once those hooks or a local Playwright setup exist.
- Consider margin accounts or richer credit-card behavior later if the finance layer needs another step.
