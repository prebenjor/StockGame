import { startTransition } from 'react'
import { money } from '../../game/core/format'
import { getWeeklyRunway } from '../../game/core/selectors'
import type { GameAction, GameState, Job } from '../../game/core/types'
import { SIDE_JOB_MAP } from '../career/data'

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
  const weeklyRunway = getWeeklyRunway(state)
  const currentSideJobs = state.sideJobIds.map((id) => SIDE_JOB_MAP[id]).filter(Boolean)

  return (
    <header className="hero-panel">
      <div className="hero-copy">
        <span className="eyebrow">Street To Skyline</span>
        <h1>Start with nothing and force your own way into wealth.</h1>
        <p className="hero-text">
          You begin at 18, fresh out of high school, with zero cash, unstable housing, and no financial cushion. The game now moves week to week, so short-term choices around side work, recovery, studying, and investing matter before the bigger month-end settlement hits.
        </p>
        <div className="hero-actions">
          <button className="primary-button" onClick={() => startTransition(() => dispatch({ type: 'END_WEEK' }))}>
            Advance Week
          </button>
          <button className="secondary-button" onClick={() => dispatch({ type: 'RESET' })}>
            Reset Save
          </button>
        </div>
      </div>

      <div className="hero-side">
        <div className="month-badge">Week {state.week} | Month {state.month} | W{state.weekOfMonth}</div>
        <div className="hero-stat">
          <span>Age</span>
          <strong>{formatAge(state.ageMonths)}</strong>
        </div>
        <div className="hero-stat">
          <span>Current job</span>
          <strong>{currentJob.title}</strong>
        </div>
        <div className="hero-stat">
          <span>Side work</span>
          <strong>{currentSideJobs.length > 0 ? currentSideJobs.map((job) => job.title).join(', ') : 'None'}</strong>
        </div>
        <div className="hero-stat">
          <span>Actions left</span>
          <strong>{state.actionPoints}</strong>
        </div>
        <div className="hero-stat">
          <span>Weekly runway</span>
          <strong className={weeklyRunway >= 0 ? 'positive' : 'negative'}>{money(weeklyRunway)}</strong>
        </div>
      </div>
    </header>
  )
}
