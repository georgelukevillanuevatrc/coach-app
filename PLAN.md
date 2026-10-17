# Personal Coach App: PLAN.md

**Working name:** Coach (rename anytime)
**Version:** 0.1 (Sprint 0, plan only, no code yet)
**Owner / user:** Luke (single user for now)
**Status:** DRAFT. Not medical advice. A coaching and tracking tool only.

---

## 1. Goal

One app on my phone that acts as a personal coach:
1. Tells me my daily calorie and macro targets based on my body and goal.
2. Lets me log meals fast, and shows protein, carbs, fat and calories left for the day.
3. Tracks my weight and shows the real trend, not the daily noise.
4. Builds me a personalized workout plan, lets me log each session, and tells me when to add weight.
5. Checks in weekly and adjusts targets if progress is off.

**Design principles**
1. Phone first, one-handed, works at the gym with bad signal (offline).
2. Logging a meal takes under 15 seconds for foods I eat often.
3. The coach is rule-based first (predictable, free), AI-assisted later.
4. Collect only what the coach needs. Body and health data is sensitive.
5. Small enough to finish. Resist feature creep.

---

## 2. Assumptions (change anytime)

- Single user (Luke). No accounts or sharing in MVP.
- Goal types supported: lose fat, build muscle, maintain.
- Tracks calories, protein, carbs, fat. Fiber and micronutrients are out of scope.
- Metric units (kg, cm). Asia/Manila time.
- Workouts at gym, home, or both (set in the profile).
- Many meals are Filipino dishes, so a "My foods" library matters more than a big database.

---

## 3. Modules

### M1. Profile and goals (onboarding, 2 minutes)
- Inputs: age, sex, height, current weight, goal weight, goal type, target pace, activity level, training days per week, equipment (gym / home / dumbbells only), experience level (beginner / intermediate), injuries or limits (free text, optional).
- Output: daily calorie target and macro targets (Section 5), shown with a plain explanation of how they were calculated.

### M2. Meal and macro tracker
- Daily view: calories and macros as progress rings, remaining amounts, meals grouped by Breakfast / Lunch / Dinner / Snacks.
- Add food by: (a) My foods and Recents (one tap), (b) search Open Food Facts or USDA FoodData Central, (c) manual entry (name, serving, calories, P/C/F), (d) barcode scan (Phase 2).
- Saved meals: bundle several foods into one tap (e.g., a regular lunch).
- Copy yesterday's meals; edit servings with a quick slider.
- Rule: estimated values (from AI or guesswork) are tagged "estimate" so I know which numbers are solid.

### M3. Weight and progress
- Log weight in 5 seconds. Optional waist measurement weekly.
- Chart shows daily weights plus a 7-day moving average (the real trend).
- Progress toward goal weight, expected date at current pace.
- Optional progress photos stored on device only (Phase 2).

### M4. Workout plan generator
- Builds a weekly split from my days per week, equipment and experience (Section 5).
- Exercise library (seeded, about 60 common exercises) with muscle group, equipment, substitutions.
- Plan is editable: swap an exercise, change sets/reps, move a day.
- Plan reviewed every 4 to 6 weeks (new block, deload week).

### M5. Workout logger
- Start today's workout; each exercise shows target sets/reps and last session's numbers.
- Log weight x reps per set, rest timer, finish session.
- Progressive overload hints: "Hit 3x10 last time, try +2.5 kg today" (Section 5).
- Works fully offline.
- Personal records (PRs) tracked per exercise.

### M6. Weekly check-in (the coach)
- Every Monday: compares the 7-day weight trend with the goal pace, adherence (days logged, workouts done, protein hit), and suggests one change: keep going, adjust calories by a small step, or deload.
- Always asks me to confirm before changing targets.
- Plain, supportive wording. No shaming, no guilt messages for missed days.

### M7. Reminders (Phase 2)
- Push notification to log weight, a workout day reminder, an evening "log your dinner" nudge. Quiet hours respected. On iPhone requires the app on the home screen.

### M8. AI coach (Phase 3, optional)
- Chat with a coach that sees my numbers (targets, last 4 weeks of weight, workouts).
- Estimate macros from a text description or meal photo ("2 cups rice, chicken adobo, egg").
- Calls the Claude API from a server function only. The API key never lives in the app code.
- Cost is per use; set a monthly cap and verify current API pricing before building.

### Out of scope
Social features, meal plans from recipes, wearable sync, medical advice, supplement advice, anything for other users.

---

## 4. Screens (bottom nav, 4 tabs)

| Tab | Contents |
|---|---|
| **Today** | Calories and macro rings, meals list with "+" per meal, today's workout card, weight logged check |
| **Train** | Today's session, weekly plan, exercise library, history and PRs |
| **Progress** | Weight trend chart, measurements, adherence, weekly check-in card |
| **Me** | Profile, goals, targets explained, units, export data, backup, settings |

---

## 5. Coaching logic (rule-based, no AI needed for MVP)

**Calories**
- BMR (Mifflin-St Jeor): men = 10 x kg + 6.25 x cm - 5 x age + 5; women = 10 x kg + 6.25 x cm - 5 x age - 161.
- TDEE = BMR x activity factor (1.2 sedentary, 1.375 light, 1.55 moderate, 1.725 very active).
- Goal: fat loss = TDEE minus 10 to 20% (default 15%); maintain = TDEE; muscle gain = TDEE plus 5 to 10%.
- **Safety floors:** never suggest below about 1,500 kcal/day for men or 1,200 for women, and cap loss pace at about 1% of body weight per week. If the numbers hit a floor, the app says so and suggests a slower pace. Anyone with a medical condition should check with a doctor first (shown during onboarding).

**Macros**
- Protein: 1.6 to 2.2 g per kg body weight (default 1.8; higher when cutting).
- Fat: about 25% of calories (not below 0.6 g/kg).
- Carbs: the remaining calories.
- Calories per gram: protein 4, carbs 4, fat 9.

**Weight trend and adjustments**
- Trend = 7-day moving average of logged weights (need at least 4 entries in the week).
- If the trend is off target pace for 2 consecutive weeks, suggest a calorie change of 100 to 150 kcal (never more per step). Ask to confirm.

**Workout plan templates**
| Days/week | Split |
|---|---|
| 2 | Full body A / B |
| 3 | Full body A / B / A (alternate) |
| 4 | Upper / Lower / Upper / Lower |
| 5 | Push / Pull / Legs / Upper / Lower |
- Beginner: compound lifts, 2 to 3 sets, 8 to 12 reps. Intermediate: add volume, 3 to 4 sets, mix of 5 to 8 and 8 to 15 rep ranges.
- Equipment filter picks the right exercise variant (barbell / dumbbell / machine / bodyweight).
- Injury notes exclude or flag exercises, and the app suggests checking with a professional.
- **Progressive overload (double progression):** work in a rep range (e.g., 8 to 12). When all sets reach the top of the range, add weight (2.5 kg upper body, 5 kg lower) and drop back to the bottom of the range.
- **Deload:** every 4 to 6 weeks, one lighter week (about 60% volume).

---

## 6. Data model

| Table | Key fields |
|---|---|
| **profile** | id, age, sex, height_cm, activity_level, goal_type, goal_weight_kg, goal_pace, training_days, equipment, experience, limits_note, units |
| **targets** | id, effective_from, calories, protein_g, carbs_g, fat_g, reason (onboarding / check-in) |
| **foods** | id, name, serving_desc, serving_g, calories, protein_g, carbs_g, fat_g, source (manual / OFF / USDA / estimate), is_favorite |
| **saved_meals** | id, name, items[] (food_id, servings) |
| **food_logs** | id, date, meal_type, food_id, servings, calories, protein_g, carbs_g, fat_g (snapshot values), created_at |
| **weight_logs** | id, date, weight_kg, waist_cm (optional), note |
| **exercises** | id, name, muscle_group, equipment, is_compound, substitutes[] |
| **plans** | id, name, start_date, weeks, status (active / archived) |
| **plan_days** | id, plan_id, day_index, name, exercises[] (exercise_id, sets, rep_min, rep_max) |
| **workout_sessions** | id, plan_day_id, date, started_at, finished_at, notes |
| **set_logs** | id, session_id, exercise_id, set_no, weight_kg, reps, is_pr |
| **checkins** | id, week_start, trend_kg, adherence, suggestion, accepted |

Food logs store a snapshot of the macros at the time of logging, so editing a saved food later never rewrites history.

---

## 7. Tech stack (reuse what the CRM plan already uses)

| Layer | Choice | Why |
|---|---|---|
| Language | TypeScript | One language, fewer mistakes, Claude Code writes it well |
| App | React + Vite PWA (vite-plugin-pwa) | Installs to home screen, works offline, no app store |
| Styling | Tailwind CSS + shadcn/ui (Radix) + Lucide icons | Fast, accessible, we own the code |
| Bottom sheets | Vaul | iOS-style sheets that slide up and close with a pull-down gesture |
| Animation and gestures | Motion (formerly Framer Motion) | Spring transitions, swipe to delete, swipe between days |
| Local data (MVP) | IndexedDB via Dexie | Data lives on the phone: no accounts, works offline, no server cost |
| Charts | Recharts | Weight trend, macro rings, PRs |
| Forms | React Hook Form + Zod | Quick forms with validation |
| Dates | date-fns, Asia/Manila | No timezone bugs |
| Food search | Open Food Facts API (free), USDA FoodData Central (free key) | Packaged and generic foods; verify current API terms |
| Tests | Vitest (coaching formulas and progression logic), Playwright (375px phone flows) | The math must be right |
| Hosting | Render static site | Already used for your other tools |
| Phase 2+ sync | Supabase (Auth + Postgres + RLS) | Multi-device sync and backup when needed |
| Phase 3 AI | Supabase Edge Function calling the Claude API | Keeps the API key off the phone |

**Why local-first for MVP:** health and body data is sensitive, and keeping it on your own phone avoids accounts, hosting a database and privacy paperwork. **The catch:** clearing browser data or losing the phone loses everything. So the MVP includes **Export / Import backup (JSON file)** and a reminder to back up monthly. Phase 2 adds cloud sync to remove that risk.

**Package check:** Claude Code must confirm the licence and current version compatibility (React, Tailwind) of Vaul and Motion before installing, and tell me what each does.

---

## 7b. UI and feel (make it feel like an iPhone app)

**Look**
- iOS design language: system font (`-apple-system`), large titles that collapse on scroll, bottom tab bar (Today / Train / Progress / Me), rounded grouped lists, plenty of white space.
- Automatic dark mode (follows the phone setting). Calm palette with one accent color; progress rings and bars are the visual focus of the Today screen.
- Large, thumb-reachable controls (at least 44px). Primary actions sit in the bottom half of the screen.

**Interaction**
- Adding a food, logging weight, or editing a set opens a **bottom sheet** (Vaul), not a pop-up dialog.
- Data is saved locally first, so every save feels instant. Skeleton placeholders only where something really loads (food search).
- Motion: animate position and opacity only, spring physics, transitions under about 300 ms. Respect the phone's reduced-motion setting.
- Gestures: swipe a food entry to delete (with Undo), swipe between days, pull down to close a sheet.
- Number keypad for weights, reps and macros; input text at least 16px so iOS never zooms in on focus.

**PWA polish checklist (every screen)**
- Standalone display mode, status bar style matched to the header, safe-area padding for the notch and home bar, `100dvh` heights.
- No text selection on buttons, no tap-highlight flash, no rubber-band overscroll on the main shell.
- App icon, splash screen, and a theme color set in the manifest.
- Back is a visible button or a sheet close, not the browser edge-swipe.

**Known limits (be honest):** no real haptic feedback on iPhone web apps, and it will not match native SwiftUI for polish. If that bugs me later, the coaching logic and data model move to Swift unchanged.

---

## 8. Phased roadmap

| Phase | Scope | Done when |
|---|---|---|
| **0. Plan** | This document, screen mockups | Luke approves |
| **1. MVP (target: 2 weekends)** | M1 profile and targets, M2 meal tracker with My foods, saved meals, manual entry, M3 weight log and trend chart, M4 plan generator (templates above), M5 workout logger with overload hints, JSON export/import, PWA install, offline | I use it daily for 2 weeks without going back to another app |
| **2. Habit and safety** | Food search (OFF/USDA), barcode scan, M6 weekly check-in, M7 reminders, Supabase sync and backup, progress photos | Check-in suggestions feel right, data survives phone loss |
| **3. AI coach** | M8: chat with my data, macro estimates from text or photo, plan tweaks | Monthly API cost stays under the cap I set |

---

## 9. Rules for Claude Code (starter CLAUDE.md)

- Plan first, then build on a feature branch. Plain-language summary at the end of each task.
- All coaching math lives in one tested module (`src/coach/`). Every formula has unit tests with known examples.
- Never hardcode secrets. No API keys in front-end code. `.env.example` lists names only.
- Use fake body data in tests and seeds. No real personal data in the repo.
- Show how each target was calculated; never present numbers as medical advice.
- Respect the safety floors in Section 5. Do not remove or loosen them without my approval.
- Keep the UI usable at 375px, one-handed, with large tap targets and an empty state that shows the next action.
- Do not add packages, accounts, or backend services without asking.
- Update README and VERSION_LOG each release.

---

## 10. Open items

1. Goal: lose fat, build muscle, or maintain? Target weight and timeline?
2. Gym, home, or both? Which equipment? Current program or experience level?
3. Any injuries or limits the plan must avoid?
4. Which Filipino foods and meals do I eat most? (This seeds the My foods list.)
5. Local-only MVP, or cloud sync from day one?
6. Do I want the AI coach (Phase 3), and what monthly budget would I accept?

---

## 11. Version log

| Version | Date | Notes |
|---|---|---|
| 0.1 | 2026-10-17 | Sprint 0 plan drafted |
| 0.2 | 2026-10-17 | Decided: PWA first (Swift later if needed). UI stack: shadcn/ui + Vaul + Motion; added Section 7b UI and feel |
