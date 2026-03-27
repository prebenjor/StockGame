import { startTransition } from 'react'
import { money } from '../../game/core/format'
import { getWeeklyRunway } from '../../game/core/selectors'
import type { GameAction, GameState, Job } from '../../game/core/types'
import { getCreditUtilization } from '../../game/core/utils'
import { SIDE_JOB_MAP } from '../career/data'
import { HOUSING_OPTION_MAP } from '../lifestyle/data'

type RailView = {
  id: string
  label: string
  kicker: string
  accent: string
  accentSoft: string
  glow: string
}

type Props = {
  state: GameState
  currentJob: Job
  dispatch: React.Dispatch<GameAction>
  activeView: string
  views: RailView[]
  viewRefs: React.MutableRefObject<Array<HTMLButtonElement | null>>
  onSelectView: (viewId: string) => void
  onViewKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => void
  mobileDrawerOpen: boolean
  onCloseDrawer: () => void
}

function formatAge(ageMonths: number) {
  const years = Math.floor(ageMonths / 12)
  const months = ageMonths % 12
  return `${years}y ${months}m`
}

function meterValue(value: number, inverse = false) {
  const normalized = Math.max(0, Math.min(100, value))
  return inverse ? 100 - normalized : normalized
}

export function HeroPanel({
  state,
  currentJob,
  dispatch,
  activeView,
  views,
  viewRefs,
  onSelectView,
  onViewKeyDown,
  mobileDrawerOpen,
  onCloseDrawer,
}: Props) {
  const weeklyRunway = getWeeklyRunway(state)
  const currentSideJobs = state.sideJobIds.map((id) => SIDE_JOB_MAP[id]).filter(Boolean)
  const housingLabel = HOUSING_OPTION_MAP[state.housingTier].title
  const bankingLabel = state.bankAccount ? 'Banked' : 'Unbanked'
  const sideWorkLabel = currentSideJobs.length > 0 ? `${currentSideJobs.length} side role${currentSideJobs.length > 1 ? 's' : ''}` : 'No side work'
  const buffer = state.cash + state.savingsBalance
  const debtTone = state.debt > 0 ? 'negative' : 'positive'

  return (
    <aside className="game-rail-shell" aria-label="Session rail">
      <div className="rail-topline">
        <div>
          <span className="panel-kicker">This Week</span>
          <h1>
            Week {state.week} / Month {state.month} / W{state.weekOfMonth}
          </h1>
        </div>
        <button className="secondary-button rail-close" type="button" onClick={onCloseDrawer}>
          Close
        </button>
      </div>

      <p className="sr-only" aria-live="polite">
        Week {state.week}, month {state.month}, week slot {state.weekOfMonth}. Current job {currentJob.title}. Weekly runway {money(weeklyRunway)}. Cash {money(state.cash)}. Debt {money(state.debt)}. Open days {state.actionPoints}. Health {state.health}. Energy {state.energy}. Stress {state.stress}. Credit utilization {(getCreditUtilization(state) * 100).toFixed(0)} percent.
      </p>

      <section className="rail-card rail-focus">
        <span className="rail-label">What you're doing</span>
        <strong>{currentJob.title}</strong>
        <p>{state.actionPoints} open days are still yours to place this week.</p>
      </section>

      <section className="rail-card rail-money">
        <div className="card-topline">
          <h2>Money</h2>
          <span>{weeklyRunway >= 0 ? 'Holding up' : 'Tight'}</span>
        </div>
        <div className="rail-stat-grid">
          <div className="rail-stat">
            <span>Cash</span>
            <strong>{money(state.cash)}</strong>
          </div>
          <div className="rail-stat">
            <span>Weekly runway</span>
            <strong className={weeklyRunway >= 0 ? 'positive' : 'negative'}>{money(weeklyRunway)}</strong>
          </div>
          <div className="rail-stat">
            <span>Debt</span>
            <strong className={debtTone}>{money(state.debt)}</strong>
          </div>
          <div className="rail-stat">
            <span>Buffer</span>
            <strong className={buffer >= 500 ? 'positive' : undefined}>{money(buffer)}</strong>
          </div>
          <div className="rail-stat">
            <span>Open days</span>
            <strong>{state.actionPoints}</strong>
          </div>
        </div>
      </section>

      <section className="rail-card rail-condition">
        <div className="card-topline">
          <h2>Condition</h2>
          <span>Body and head</span>
        </div>
        <div className="condition-meter-stack">
          <div className="condition-row" style={{ '--meter-fill': `${meterValue(state.health)}%` } as React.CSSProperties}>
            <div>
              <span>Health</span>
              <strong>{state.health}</strong>
            </div>
            <div className="condition-bar" aria-hidden="true">
              <span />
            </div>
          </div>
          <div className="condition-row" style={{ '--meter-fill': `${meterValue(state.energy)}%` } as React.CSSProperties}>
            <div>
              <span>Energy</span>
              <strong>{state.energy}</strong>
            </div>
            <div className="condition-bar" aria-hidden="true">
              <span />
            </div>
          </div>
          <div className="condition-row stress" style={{ '--meter-fill': `${meterValue(state.stress, true)}%` } as React.CSSProperties}>
            <div>
              <span>Stress</span>
              <strong>{state.stress}</strong>
            </div>
            <div className="condition-bar" aria-hidden="true">
              <span />
            </div>
          </div>
        </div>
      </section>

      <section className="rail-card rail-badges">
        <div className="tag-row">
          <span className="tag">{formatAge(state.ageMonths)}</span>
          <span className={`tag ${state.bankAccount ? '' : 'accent'}`}>{bankingLabel}</span>
          <span className={`tag ${state.housingTier === 'shelter' ? 'accent' : ''}`}>{housingLabel}</span>
          <span className="tag">{sideWorkLabel}</span>
        </div>
      </section>

      <section className="rail-actions">
        <button
          id="advance-week-button"
          className="primary-button"
          onClick={() => startTransition(() => dispatch({ type: 'END_WEEK' }))}
          disabled={state.weekPlanCommitted && state.weekResolutionPhase === 'resolving'}
        >
          Advance Week
        </button>
        <button id="reset-save-button" className="secondary-button" onClick={() => dispatch({ type: 'RESET' })}>
          Reset Save
        </button>
      </section>

      <nav className="rail-nav" aria-label="Game sections" role="tablist">
        {views.map((view, index) => (
          <button
            key={view.id}
            ref={(element) => {
              viewRefs.current[index] = element
            }}
            className={`rail-nav-item ${activeView === view.id ? 'active' : ''}`}
            onClick={() => onSelectView(view.id)}
            onKeyDown={(event) => onViewKeyDown(event, index)}
            type="button"
            role="tab"
            id={`tab-${view.id}`}
            aria-selected={activeView === view.id}
            aria-controls={`panel-${view.id}`}
            tabIndex={activeView === view.id ? 0 : -1}
            style={
              {
                '--chip-accent': view.accent,
                '--chip-accent-soft': view.accentSoft,
                '--chip-glow': view.glow,
              } as React.CSSProperties
            }
            data-mobile-open={mobileDrawerOpen ? 'true' : 'false'}
          >
            <span>{view.kicker}</span>
            <strong>{view.label}</strong>
          </button>
        ))}
      </nav>
    </aside>
  )
}
