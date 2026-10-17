import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { Dumbbell, LineChart, User, UtensilsCrossed } from 'lucide-react'
import Today from './features/today'
import Train from './features/train'
import Progress from './features/progress'
import Me from './features/me'

const tabs = [
  { to: '/today', label: 'Today', Icon: UtensilsCrossed },
  { to: '/train', label: 'Train', Icon: Dumbbell },
  { to: '/progress', label: 'Progress', Icon: LineChart },
  { to: '/me', label: 'Me', Icon: User },
]

export default function App() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <main className="safe-top flex-1 overflow-y-auto overscroll-contain">
        <Routes>
          <Route path="/" element={<Navigate to="/today" replace />} />
          <Route path="/today/*" element={<Today />} />
          <Route path="/train/*" element={<Train />} />
          <Route path="/progress/*" element={<Progress />} />
          <Route path="/me/*" element={<Me />} />
        </Routes>
      </main>
      <nav className="safe-bottom grid grid-cols-4 border-t border-line bg-card">
        {tabs.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) => `flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs ${isActive ? 'text-accent' : 'text-muted'}`}>
            <Icon size={22} />{label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
