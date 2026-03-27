import { startTransition } from 'react'
import { formatCalendarLabel } from '../../game/core/calendar'
import { money } from '../../game/core/format'
import { isWeekPlanReady } from '../../game/core/planning'
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
  showNavigation: boolean
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
  showNavigation,
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
  const calendarLabel = formatCalendarLabel(state.month, state.weekOfMonth)
  const weekPlanReady = isWeekPlanReady(state)
  const statusLine = `${weeklyRunway >= 0 ? 'Holding up' : 'Tight'} · ${state.stress >= 68 ? 'Body under pressure' : 'Body and head'}`

  return (
    <aside className="game-rail-shell" aria-label="Session rail">
      <div className="rail-topline">
        <div>
          <span className="panel-kicker">This Week</span>
          <h1>{calendarLabel}</h1>
        </div>
        <button className="secondary-button rail-close" type="button" onClick={onCloseDrawer}>
          Close
        </button>
      </div>

      <p className="sr-only" aria-live="polite">
        {calendarLabel}. Absolute week {state.week}. Current job {currentJob.title}. Weekly runway {money(weeklyRunway)}. Cash {money(state.cash)}. Debt {money(state.debt)}. Open days {state.actionPoints}. Health {state.health}. Energy {state.energy}. Stress {state.stress}. Credit utilization {(getCreditUtilization(state) * 100).toFixed(0)} percent.
      </p>

      <section className="rail-card rail-status-hud">
        <div className="hud-money-grid">
          <div className="hud-stat">
            <span>Cash</span>
            <strong>{money(state.cash)}</strong>
          </div>
          <div className="hud-stat">
            <span>Runway</span>
            <strong className={weeklyRunway >= 0 ? 'positive' : 'negative'}>{money(weeklyRunway)}</strong>
          </div>
          <div className="hud-stat">
            <span>Buffer</span>
            <strong className={buffer >= 500 ? 'positive' : undefined}>{money(buffer)}</strong>
          </div>
          <div className="hud-stat">
            <span>Debt</span>
            <strong className={debtTone}>{money(state.debt)}</strong>
          </div>
        </div>

        <div className="hud-condition-row">
          <div className="hud-meter">
            <div className="hud-meter-topline">
              <span>Health</span>
              <strong>{state.health}</strong>
            </div>
            <div className="hud-meter-bar" aria-hidden="true">
              <span style={{ width: `${meterValue(state.health)}%` }} />
            </div>
          </div>
          <div className="hud-meter">
            <div className="hud-meter-topline">
              <span>Energy</span>
              <strong>{state.energy}</strong>
            </div>
            <div className="hud-meter-bar" aria-hidden="true">
              <span style={{ width: `${meterValue(state.energy)}%` }} />
            </div>
          </div>
          <div className="hud-meter stress">
            <div className="hud-meter-topline">
              <span>Stress</span>
              <strong>{state.stress}</strong>
            </div>
            <div className="hud-meter-bar" aria-hidden="true">
              <span style={{ width: `${meterValue(state.stress, true)}%` }} />
            </div>
          </div>
        </div>

        <div className="hud-open-row">
          <span>Open days</span>
          <strong className={state.actionPoints > 0 ? 'attention' : undefined}>{state.actionPoints}</strong>
        </div>
        <p className="rail-subline">{statusLine}</p>
      </section>

      {showNavigation ? (
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
      ) : null}

      <section className="rail-card rail-focus">
        <span className="rail-label">What you're doing</span>
        <strong>{currentJob.title}</strong>
        <p>{state.actionPoints > 0 ? `${state.actionPoints} open days are still yours to place this week.` : 'The week is spoken for. Run it when you are ready.'}</p>
      </section>

      <details className="rail-card rail-secondary-stats">
        <summary>See all</summary>
        <div className="rail-secondary-grid">
          <div className="mini-stat">
            <span>Reputation</span>
            <strong>{state.reputation}</strong>
          </div>
          <div className="mini-stat">
            <span>Knowledge</span>
            <strong>{state.knowledge}</strong>
          </div>
          <div className="mini-stat">
            <span>Credit score</span>
            <strong>{state.creditScore}</strong>
          </div>
          <div className="mini-stat">
            <span>Bank trust</span>
            <strong>{state.bankTrust}</strong>
          </div>
        </div>
      </details>

      <section className="rail-actions rail-actions-bottom">
        <button
          id="advance-week-button"
          className="primary-button"
          onClick={() => startTransition(() => dispatch({ type: 'COMMIT_WEEK_PLAN' }))}
          disabled={!weekPlanReady || (state.weekPlanCommitted && state.weekResolutionPhase === 'resolving')}
        >
          Advance Week
        </button>
        <button id="reset-save-button" className="secondary-button" onClick={() => dispatch({ type: 'RESET' })}>
          Reset Save
        </button>
      </section>
      <section className="rail-card rail-badges">
        <div className="tag-row">
          <span className="tag">{formatAge(state.ageMonths)}</span>
          <span className={`tag ${state.bankAccount ? '' : 'accent'}`}>{bankingLabel}</span>
          <span className={`tag ${state.housingTier === 'shelter' ? 'accent' : ''}`}>{housingLabel}</span>
          <span className="tag">{sideWorkLabel}</span>
        </div>
      </section>
    </aside>
  )
}
