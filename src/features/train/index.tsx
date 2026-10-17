import { useEffect, useRef, useState } from 'react'
import { Link, Route, Routes } from 'react-router-dom'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { db } from '../../lib/db'
import { seedExercises } from './seed'
import { createPlan, useTrain } from './data'
import { Segmented, btnPrimary, card } from './ui'
import TodayTab from './Today'
import PlanTab from './PlanTab'
import Library from './Library'
import History from './History'
import Logger from './Logger'

type Tab = 'today' | 'plan' | 'library' | 'history'
const TABS: { id: Tab; label: string }[] = [
  { id: 'today', label: 'Today' }, { id: 'plan', label: 'Plan' }, { id: 'library', label: 'Library' }, { id: 'history', label: 'History' },
]
const TAB_KEY = 'coach.train.tab'
const readTab = (): Tab => { try { const t = localStorage.getItem(TAB_KEY) as Tab; return TABS.some((x) => x.id === t) ? t : 'today' } catch { return 'today' } }

export default function Train() {
  const data = useTrain()
  const [tab, setTab] = useState<Tab>(readTab)
  const [seeded, setSeeded] = useState(false)
  const gen = useRef(false)

  useEffect(() => { seedExercises().then(() => setSeeded(true)) }, [])
  useEffect(() => {
    if (!seeded || !data || gen.current || !data.profile || data.plan) return
    gen.current = true
    db.plans.where('status').equals('active').count().then((n) => { if (n === 0) createPlan(data.profile!) })
  }, [seeded, data])

  const choose = (t: Tab) => { setTab(t); try { localStorage.setItem(TAB_KEY, t) } catch { /* ignore */ } }

  const home = (() => {
    if (!data) return <p className="py-10 text-center text-muted">Loading...</p>
    if (!data.profile) {
      return (
        <div className={`${card} p-6 text-center`}>
          <h2 className="text-lg font-semibold">Set up your profile first</h2>
          <p className="mt-1 text-sm text-muted">Your plan is built from your training days, equipment and experience.</p>
          <Link to="/me" className={`${btnPrimary} mt-4 inline-flex items-center`}>Go to Me</Link>
        </div>
      )
    }
    const hasLib = data.exercises.length > 0
    return (
      <>
        <Segmented value={tab} options={TABS} onChange={choose} />
        <div className="mt-4">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              {!hasLib ? <p className="py-10 text-center text-muted">Loading exercises...</p>
                : tab === 'library' ? <Library exercises={data.exercises} note={data.profile.limits_note} />
                : tab === 'history' ? <History sessions={data.sessions} exercises={data.exercises} />
                : !data.plan ? <p className="py-10 text-center text-muted">Building your plan...</p>
                : tab === 'today' ? <TodayTab data={data} />
                : <PlanTab data={data} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </>
    )
  })()

  return (
    <MotionConfig reducedMotion="user">
      <Routes>
        <Route path="workout/:dayId" element={data ? <Logger data={data} /> : null} />
        <Route path="*" element={
          <div className="mx-auto max-w-md px-4 pb-6 pt-4">
            <h1 className="mb-3 text-3xl font-bold">Train</h1>
            {home}
          </div>
        } />
      </Routes>
    </MotionConfig>
  )
}
