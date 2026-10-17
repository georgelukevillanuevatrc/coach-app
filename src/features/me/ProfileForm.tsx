import { useState } from 'react'
import type { ActivityLevel, Equipment, Experience, GoalType, Profile, Sex } from '../../lib/types'

const field = 'min-h-11 w-full rounded-xl border border-line bg-bg px-3 text-base text-ink'
const label = 'mb-1 block text-sm text-muted'

function Num({ id, text, value, onChange, unit, decimal }: { id: string; text: string; value: string; onChange: (v: string) => void; unit: string; decimal?: boolean }) {
  return (
    <div>
      <label htmlFor={id} className={label}>{text} ({unit})</label>
      <input id={id} className={field} value={value} inputMode={decimal ? 'decimal' : 'numeric'}
        onChange={(e) => onChange(e.target.value.replace(',', '.'))} />
    </div>
  )
}
function Sel<T extends string | number>({ id, text, value, onChange, options }: { id: string; text: string; value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div>
      <label htmlFor={id} className={label}>{text}</label>
      <select id={id} className={field} value={String(value)}
        onChange={(e) => { const o = options.find(([v]) => String(v) === e.target.value); if (o) onChange(o[0]) }}>
        {options.map(([v, l]) => <option key={String(v)} value={String(v)}>{l}</option>)}
      </select>
    </div>
  )
}

export function ProfileForm({ initial, submitLabel, onSubmit }: { initial?: Profile; submitLabel: string; onSubmit: (p: Profile) => void | Promise<void> }) {
  const [age, setAge] = useState(initial ? String(initial.age) : '')
  const [sex, setSex] = useState<Sex>(initial?.sex ?? 'male')
  const [height, setHeight] = useState(initial ? String(initial.height_cm) : '')
  const [weight, setWeight] = useState(initial ? String(initial.weight_kg) : '')
  const [goalWeight, setGoalWeight] = useState(initial ? String(initial.goal_weight_kg) : '')
  const [goal, setGoal] = useState<GoalType>(initial?.goal_type ?? 'lose')
  const [pace, setPace] = useState<number>(initial?.goal_pace ?? 0.15)
  const [activity, setActivity] = useState<ActivityLevel>(initial?.activity_level ?? 'light')
  const [days, setDays] = useState<2 | 3 | 4 | 5>(initial?.training_days ?? 3)
  const [equipment, setEquipment] = useState<Equipment>(initial?.equipment ?? 'gym')
  const [experience, setExperience] = useState<Experience>(initial?.experience ?? 'beginner')
  const [limits, setLimits] = useState(initial?.limits_note ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const paceOptions: [number, string][] = goal === 'lose'
    ? [[0.10, 'Gentle (10% below)'], [0.15, 'Steady (15% below)'], [0.20, 'Faster (20% below)']]
    : goal === 'gain' ? [[0.05, 'Lean (5% above)'], [0.075, 'Moderate (7.5% above)'], [0.10, 'Quicker (10% above)']] : []

  function changeGoal(g: GoalType) {
    setGoal(g)
    setPace(g === 'lose' ? 0.15 : g === 'gain' ? 0.075 : 0)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const a = Number(age), h = Number(height), w = Number(weight)
    const gw = goalWeight.trim() === '' ? w : Number(goalWeight)
    if (!(a >= 14 && a <= 100)) return setError('Please enter an age between 14 and 100.')
    if (!(h >= 120 && h <= 230)) return setError('Please enter a height between 120 and 230 cm.')
    if (!(w >= 30 && w <= 300)) return setError('Please enter a weight between 30 and 300 kg.')
    if (!(gw >= 30 && gw <= 300)) return setError('Please enter a goal weight between 30 and 300 kg.')
    setError(''); setBusy(true)
    try {
      await onSubmit({ id: 1, age: a, sex, height_cm: h, weight_kg: w, activity_level: activity, goal_type: goal, goal_weight_kg: gw,
        goal_pace: goal === 'maintain' ? 0 : pace, training_days: days, equipment, experience, limits_note: limits.trim() })
    } finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Num id="age" text="Age" unit="years" value={age} onChange={setAge} />
        <Sel id="sex" text="Sex (for the formula)" value={sex} onChange={setSex} options={[['male', 'Male'], ['female', 'Female']]} />
        <Num id="height" text="Height" unit="cm" value={height} onChange={setHeight} />
        <Num id="weight" text="Weight now" unit="kg" decimal value={weight} onChange={setWeight} />
      </div>
      <Sel id="goal" text="Goal" value={goal} onChange={changeGoal} options={[['lose', 'Lose fat'], ['maintain', 'Maintain'], ['gain', 'Build muscle']]} />
      <div className="grid grid-cols-2 gap-3">
        <Num id="gw" text="Goal weight" unit="kg" decimal value={goalWeight} onChange={setGoalWeight} />
        {paceOptions.length > 0 && <Sel id="pace" text="Pace" value={pace} onChange={setPace} options={paceOptions} />}
      </div>
      <Sel id="activity" text="Daily activity (outside workouts)" value={activity} onChange={setActivity}
        options={[['sedentary', 'Mostly sitting'], ['light', 'Light (walking, 1-3 workouts)'], ['moderate', 'Moderate (3-5 workouts)'], ['very_active', 'Very active (6-7 workouts or physical job)']]} />
      <div className="grid grid-cols-2 gap-3">
        <Sel id="days" text="Training days / week" value={days} onChange={setDays} options={[[2, '2'], [3, '3'], [4, '4'], [5, '5']]} />
        <Sel id="exp" text="Experience" value={experience} onChange={setExperience} options={[['beginner', 'Beginner'], ['intermediate', 'Intermediate']]} />
      </div>
      <Sel id="equip" text="Equipment" value={equipment} onChange={setEquipment} options={[['gym', 'Gym'], ['home', 'Home'], ['dumbbells', 'Dumbbells only']]} />
      <div>
        <label htmlFor="limits" className={label}>Injuries or limits (optional)</label>
        <textarea id="limits" rows={2} className={`${field} py-2`} value={limits} onChange={(e) => setLimits(e.target.value)} />
      </div>
      {error && <p role="alert" className="text-sm text-[#ff453a]">{error}</p>}
      <button type="submit" disabled={busy} className="min-h-12 w-full rounded-xl bg-accent px-4 text-base font-semibold text-white disabled:opacity-60">
        {busy ? 'Saving...' : submitLabel}
      </button>
    </form>
  )
}
