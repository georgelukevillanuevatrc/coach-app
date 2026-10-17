# Rules for this repo
- All coaching math lives in `src/coach/`, with unit tests and known examples.
- Never hardcode secrets or API keys. `.env.example` lists names only.
- Use fake body data in tests and seeds.
- Show how each target is calculated; never present numbers as medical advice.
- Respect the calorie safety floors (1500 men / 1200 women) and 1%/week loss cap; do not loosen without owner approval.
- UI must work at 375px, one-handed, 44px tap targets, with an empty state showing the next action.
- Do not add packages, accounts or backend services without asking.
- Update README and VERSION_LOG each release.
