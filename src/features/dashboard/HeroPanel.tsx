import { startTransition } from 'react'
import { money } from '../../game/core/format'
import { getWeeklyRunway } from '../../game/core/selectors'
import type { GameAction, GameState, Job } from '../../game/core/types'
import { SIDE_JOB_MAP } from '../career/data'
import { HOUSING_OPTION_MAP } from '../lifestyle/data'

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
  const housingLabel = HOUSING_OPTION_MAP[state.housingTier].title
  const bankingLabel = state.bankAccount ? 'Banked' : 'Unbanked'
  const sideWorkLabel = currentSideJobs.length > 0 ? currentSideJobs.map((job) => job.title).join(', ') : 'No side work'
  const weeklyStatus =
    weeklyRunway >= 0
      ? `Weekly runway is positive at ${money(weeklyRunway)}.`
      : `Weekly runway is negative at ${money(weeklyRunway)}.`

  return (
    <header className="hero-panel">
      <p className="sr-only" aria-live="polite">
        Week {state.week}, month {state.month}, week slot {state.weekOfMonth}. Current job {currentJob.title}. {weeklyStatus} You have {state.actionPoints} actions left. Housing is {housingLabel}. Banking status is {bankingLabel}. Side work status: {sideWorkLabel}.
      </p>

      <div className="hero-copy">
        <span className="eyebrow">Street To Skyline</span>
        <h1>Start from zero. Build leverage.</h1>
        <p className="hero-text">
          You are 18, broke, and unstable. Each week is about staying alive, building a buffer, and choosing which lane to push next.
        </p>
        <div className="hero-meta">
          <span className="meta-pill">{formatAge(state.ageMonths)}</span>
          <span className={`meta-pill ${state.bankAccount ? '' : 'warning'}`}>{bankingLabel}</span>
          <span className={`meta-pill ${state.housingTier === 'shelter' ? 'warning' : ''}`}>{housingLabel}</span>
          <span className="meta-pill wide">{sideWorkLabel}</span>
        </div>
        <div className="hero-actions">
          <button
            id="advance-week-button"
            className="primary-button"
            onClick={() => startTransition(() => dispatch({ type: 'END_WEEK' }))}
          >
            Advance Week
          </button>
          <button id="reset-save-button" className="secondary-button" onClick={() => dispatch({ type: 'RESET' })}>
            Reset Save
          </button>
        </div>
        <p className="action-hint">Keyboard: Left/Right switches sections, Space advances a week, 1-0 jumps between tabs, and A/B trigger context actions for automation-friendly play.</p>
      </div>

      <div className="hero-side">
        <div className="month-badge">Week {state.week} | Month {state.month} | W{state.weekOfMonth}</div>
        <div className="hero-side-grid">
          <div className="hero-stat wide">
            <span>Current job</span>
            <strong>{currentJob.title}</strong>
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
      </div>
    </header>
  )
}
