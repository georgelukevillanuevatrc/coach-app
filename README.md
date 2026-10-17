# Coach

Personal coach PWA: calorie/macro targets, meal tracker, weight trend, workout plan and logger. Local-first (IndexedDB via Dexie); no accounts, no server. Not medical advice.

## Run
```
npm install
npm run dev      # http://localhost:5173
npm test         # coaching math tests (Vitest)
npm run build    # production build in dist/
```

## Install on iPhone
Host `dist/` on any static HTTPS host (Render static site, Netlify, GitHub Pages), open it in Safari, Share > Add to Home Screen.

## Your data
Everything is stored on the phone. Clearing browser data or losing the phone loses it. Use Me > Export backup monthly. Progress photos are stored separately and are not in the JSON backup.

## Layout
- `src/coach/` all coaching math (tested)
- `src/lib/` types, Dexie database, dates
- `src/features/{today,train,progress,me,reminders}/` the screens

See `../PLAN.md` for the plan and `VERSION_LOG.md` for releases.
