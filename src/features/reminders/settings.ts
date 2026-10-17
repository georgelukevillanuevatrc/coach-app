import { DEFAULT_SETTINGS, type NudgeKind, type ReminderSettings } from './due'

const KEY = 'coach.reminders.v1'
const DISMISS = 'coach.nudges.dismissed.v1'

export function loadSettings(): ReminderSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (raw && typeof raw === 'object') {
      return {
        weight: { ...DEFAULT_SETTINGS.weight, ...raw.weight },
        workout: { ...DEFAULT_SETTINGS.workout, ...raw.workout },
        dinner: { ...DEFAULT_SETTINGS.dinner, ...raw.dinner },
        quiet: { ...DEFAULT_SETTINGS.quiet, ...raw.quiet },
      }
    }
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS
}
export function saveSettings(s: ReminderSettings) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); window.dispatchEvent(new Event('coach-reminders')) } catch { /* ignore */ }
}

/** Dismissals are per day: { date, kinds[] }. */
export function loadDismissed(date: string): NudgeKind[] {
  try {
    const r = JSON.parse(localStorage.getItem(DISMISS) ?? 'null')
    return r?.date === date && Array.isArray(r.kinds) ? r.kinds : []
  } catch { return [] }
}
export function dismiss(date: string, kind: NudgeKind) {
  try {
    const kinds = [...new Set([...loadDismissed(date), kind])]
    localStorage.setItem(DISMISS, JSON.stringify({ date, kinds }))
    window.dispatchEvent(new Event('coach-reminders'))
  } catch { /* ignore */ }
}
