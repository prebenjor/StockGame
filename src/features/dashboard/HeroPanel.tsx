import { startTransition } from 'react'
import { money } from '../../game/core/format'
import { getMonthlyRunway } from '../../game/core/selectors'
import type { GameAction, GameState, Job } from '../../game/core/types'

type Props = {
  state: GameState
  currentJob: Job
  dispatch: React.Dispatch<GameAction>
}

function formatAge(ageMonths: number) {
  const years = Math.floor(ageMonths / 12)
  const months = ageMonths % 12
  return `${years}y ${months}m`
}

export function HeroPanel({ state, currentJob, dispatch }: Props) {
  const monthlyRunway = getMonthlyRunway(state)

  return (
    <header className="hero-panel">
      <div className="hero-copy">
        <span className="eyebrow">Street To Skyline</span>
        <h1>Start with nothing and force your own way into wealth.</h1>
        <p className="hero-text">
          You begin at 18, fresh out of high school, with zero cash, unstable housing, and no financial cushion. Every system is live from the start, but the first months are a survival grind where shelter, transport, meals, and banking all affect what kind of events hit you.
        </p>
        <div className="hero-actions">
          <button className="primary-button" onClick={() => startTransition(() => dispatch({ type: 'END_MONTH' }))}>
            Advance Month
          </button>
          <button className="secondary-button" onClick={() => dispatch({ type: 'RESET' })}>
            Reset Save
          </button>
        </div>
      </div>

      <div className="hero-side">
        <div className="month-badge">Month {state.month}</div>
        <div className="hero-stat">
          <span>Age</span>
          <strong>{formatAge(state.ageMonths)}</strong>
        </div>
        <div className="hero-stat">
          <span>Current job</span>
          <strong>{currentJob.title}</strong>
        </div>
        <div className="hero-stat">
          <span>Actions left</span>
          <strong>{state.actionPoints}</strong>
        </div>
        <div className="hero-stat">
          <span>Monthly runway</span>
          <strong className={monthlyRunway >= 0 ? 'positive' : 'negative'}>{money(monthlyRunway)}</strong>
        </div>
      </div>
    </header>
  )
}
