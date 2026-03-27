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
  compact: boolean
}

function formatAge(ageMonths: number) {
  const years = Math.floor(ageMonths / 12)
  const months = ageMonths % 12
  return `${years}y ${months}m`
}

function getSessionLine(state: GameState, weeklyRunway: number) {
  if (!state.bankAccount && state.cash >= 25) return `You have ${state.actionPoints} open days and enough cash to finally get banked.`
  if (state.stress >= 72) return `You have ${state.actionPoints} open days. Keep this week light if you can.`
  if (weeklyRunway < 0) return `You have ${state.actionPoints} open days and the week is still running a little short.`
  return `You have ${state.actionPoints} open days and enough room to choose what matters this week.`
}

export function HeroPanel({ state, currentJob, dispatch, compact }: Props) {
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
        Week {state.week}, month {state.month}, week slot {state.weekOfMonth}. Current job {currentJob.title}. {weeklyStatus} You have {state.actionPoints} open days left this week. Housing is {housingLabel}. Banking status is {bankingLabel}. Side work status: {sideWorkLabel}.
      </p>

      <div className="hero-copy session-copy">
        <span className="panel-kicker">This Week</span>
        <h1>
          Week {state.week} · Month {state.month} · W{state.weekOfMonth}
        </h1>
        <p className="hero-text">
          {getSessionLine(state, weeklyRunway)}
        </p>
        <div className="hero-meta">
          <span className="meta-pill">{formatAge(state.ageMonths)}</span>
          <span className={`meta-pill ${state.bankAccount ? '' : 'warning'}`}>{bankingLabel}</span>
          <span className={`meta-pill ${state.housingTier === 'shelter' ? 'warning' : ''}`}>{housingLabel}</span>
          {!compact ? <span className="meta-pill wide">{sideWorkLabel}</span> : null}
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
      </div>

      <div className="hero-side session-summary">
        <div className="month-badge">Week {state.week} | Month {state.month} | W{state.weekOfMonth}</div>
        <div className="hero-side-grid">
          <div className="hero-stat wide lane-stat">
            <span>What you're doing</span>
            <strong>{currentJob.title}</strong>
          </div>
          <div className="hero-stat cash-stat">
            <span>Cash</span>
            <strong>{money(state.cash)}</strong>
          </div>
          <div className="hero-stat runway-stat">
            <span>Weekly runway</span>
            <strong className={weeklyRunway >= 0 ? 'positive' : 'negative'}>{money(weeklyRunway)}</strong>
          </div>
          <div className="hero-stat debt-stat">
            <span>Debt</span>
            <strong className={state.debt > 0 ? 'negative' : 'positive'}>{money(state.debt)}</strong>
          </div>
          <div className="hero-stat buffer-stat">
            <span>Buffer</span>
            <strong className={state.cash + state.savingsBalance >= 500 ? 'positive' : undefined}>
              {money(state.cash + state.savingsBalance)} / $500
            </strong>
          </div>
          <div className="hero-stat open-days-stat">
            <span>Open days</span>
            <strong>{state.actionPoints}</strong>
          </div>
        </div>
      </div>
    </header>
  )
}
