import { formatCalendarLabel } from '../../game/core/calendar'
import { money } from '../../game/core/format'
import type { GameState, Job } from '../../game/core/types'
import { getWeeklyRunway } from '../../game/core/selectors'

type Props = {
  state: GameState
  currentJob: Job
  onAdvanceWeek: () => void
  onResetSave: () => void
  advanceDisabled: boolean
}

function meterWidth(value: number, inverse = false) {
  const normalized = Math.max(0, Math.min(100, value))
  return inverse ? 100 - normalized : normalized
}

export function TopResourceBar({ state, currentJob, onAdvanceWeek, onResetSave, advanceDisabled }: Props) {
  const weeklyRunway = getWeeklyRunway(state)
  const buffer = state.cash + state.savingsBalance
  const calendarLabel = formatCalendarLabel(state.month, state.weekOfMonth)

  return (
    <header className="resource-hub">
      <div className="resource-hub-headline">
        <div>
          <span className="panel-kicker">This Week</span>
          <h2>{calendarLabel}</h2>
        </div>
        <div className="resource-hub-role">
          <span>What you&apos;re doing</span>
          <strong>{currentJob.title}</strong>
          <small>
            Rep {state.reputation} · Know {state.knowledge} · Credit {state.creditScore} · Trust {state.bankTrust}
          </small>
        </div>
      </div>

      <div className="resource-hub-stats">
        <div className="resource-chip">
          <span>Cash</span>
          <strong>{money(state.cash)}</strong>
        </div>
        <div className="resource-chip">
          <span>Runway</span>
          <strong className={weeklyRunway >= 0 ? 'positive' : 'negative'}>{money(weeklyRunway)}</strong>
        </div>
        <div className="resource-chip">
          <span>Buffer</span>
          <strong>{money(buffer)}</strong>
        </div>
        <div className="resource-chip">
          <span>Debt</span>
          <strong className={state.debt > 0 ? 'negative' : 'positive'}>{money(state.debt)}</strong>
        </div>
        <div className="resource-chip open-days">
          <span>Open Days</span>
          <strong className={state.actionPoints > 0 ? 'attention' : undefined}>{state.actionPoints}</strong>
        </div>
      </div>

      <div className="resource-hub-lower">
        <div className="resource-condition-row">
          <div className="resource-meter">
            <div className="resource-meter-topline">
              <span>Health</span>
              <strong>{state.health}</strong>
            </div>
            <div className="resource-meter-bar" aria-hidden="true">
              <span style={{ width: `${meterWidth(state.health)}%` }} />
            </div>
          </div>
          <div className="resource-meter">
            <div className="resource-meter-topline">
              <span>Energy</span>
              <strong>{state.energy}</strong>
            </div>
            <div className="resource-meter-bar" aria-hidden="true">
              <span style={{ width: `${meterWidth(state.energy)}%` }} />
            </div>
          </div>
          <div className="resource-meter stress">
            <div className="resource-meter-topline">
              <span>Stress</span>
              <strong>{state.stress}</strong>
            </div>
            <div className="resource-meter-bar" aria-hidden="true">
              <span style={{ width: `${meterWidth(state.stress, true)}%` }} />
            </div>
          </div>
        </div>

        <div className="resource-hub-actions">
          <button id="advance-week-button" className="primary-button" type="button" onClick={onAdvanceWeek} disabled={advanceDisabled}>
            Advance Week
          </button>
          <button id="reset-save-button" className="secondary-button" type="button" onClick={onResetSave}>
            Reset Save
          </button>
        </div>
      </div>
    </header>
  )
}
