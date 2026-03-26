import { FOOD_OPTION_MAP, HOUSING_OPTION_MAP, TRANSPORT_OPTION_MAP, WELLNESS_OPTION_MAP } from '../../features/lifestyle/data'
import { money } from '../../game/core/format'
import { getConditionTone, getCurrentJob, getMilestones, getTips, getWeeklyRunway } from '../../game/core/selectors'
import { getComplianceRisk, getCreditCardAccount, getCreditUtilization, getDebtService, getInterestRate, getLivingCost, getNetWorth, getPassiveIncomePreview, getRenovationCost, getSavingsRate, getTaxRate, getTradingFee, getWeeklyTaxEstimate, hasStableHousing, toWeeklyAmount } from '../../game/core/utils'
import type { GameAction, GameState, Job } from '../../game/core/types'

type SummaryProps = {
  state: GameState
  currentJob: Job
}

type Metric = [string, string, string | undefined]

function MetricRows({ items }: { items: Metric[] }) {
  return (
    <div className="finance-box">
      {items.map(([label, value, tone]) => (
        <div key={label}>
          <span>{label}</span>
          <strong className={tone}>{value}</strong>
        </div>
      ))}
    </div>
  )
}

export function SummaryStats({ state, currentJob }: SummaryProps) {
  const passiveIncome = getPassiveIncomePreview(state)
  const housingLabel = HOUSING_OPTION_MAP[state.housingTier].title
  const bankingLabel = state.bankAccount ? 'Banked' : 'Unbanked'
  const weeklyRunway = getWeeklyRunway(state)
  const primaryStats: Metric[] = [
    ['Cash', money(state.cash), undefined],
    ['Weekly Runway', money(weeklyRunway), weeklyRunway >= 0 ? 'positive' : 'negative'],
    ['Net Worth', money(getNetWorth(state)), undefined],
    ['Debt', money(state.debt), 'negative'],
    ['Main Pay', money(currentJob.salary), undefined],
    ['Housing', housingLabel, hasStableHousing(state) ? undefined : 'negative'],
    ['Banking', bankingLabel, state.bankAccount ? undefined : 'negative'],
    ['Economy', state.economyPhase, undefined],
  ]
  const secondaryStats: Metric[] = [
    ['Passive Income', money(passiveIncome), undefined],
    ['Credit', String(state.creditScore), undefined],
    ['Knowledge', String(state.knowledge), undefined],
    ['Inflation', `${state.inflation.toFixed(1)}%`, undefined],
  ]

  return (
    <section className="stat-grid">
      {primaryStats.map(([label, value, tone]) => (
        <article className="stat-card" key={label}>
          <span>{label}</span>
          <strong className={tone}>{value}</strong>
        </article>
      ))}

      <details className="detail-block stat-detail">
        <summary>More run stats</summary>
        <MetricRows items={secondaryStats} />
      </details>
    </section>
  )
}

type SideProps = {
  state: GameState
  dispatch: React.Dispatch<GameAction>
}

export function SidePanel({ state, dispatch }: SideProps) {
  const livingCost = toWeeklyAmount(getLivingCost(state))
  const interestPreview = toWeeklyAmount(Math.round(state.debt * getInterestRate(state)))
  const debtService = toWeeklyAmount(getDebtService(state))
  const taxPreview = getWeeklyTaxEstimate(state, undefined, toWeeklyAmount(getCurrentJob(state).salary))
  const creditCard = getCreditCardAccount(state)
  const studentDebt = state.debtAccounts.find((account) => account.kind === 'student') ?? null
  const milestones = getMilestones(state)
  const tips = getTips(state)
  const recentLog = state.log.slice(0, 6)
  const housingLabel = HOUSING_OPTION_MAP[state.housingTier].title
  const transportLabel = TRANSPORT_OPTION_MAP[state.transportTier].title
  const foodLabel = FOOD_OPTION_MAP[state.foodTier].title
  const wellnessLabel = WELLNESS_OPTION_MAP[state.wellnessTier].title
  const coreFinance: Metric[] = [
    ['Living costs', money(livingCost), undefined],
    ['Debt service', money(debtService), undefined],
    ['Finance charges', money(interestPreview), undefined],
    ['Weekly tax estimate', money(taxPreview), undefined],
  ]
  const financeDetails: Metric[] = [
    ['Interest rate', `${(getInterestRate(state) * 100).toFixed(1)}%`, undefined],
    ['Savings yield', `${(getSavingsRate(state) * 100).toFixed(1)}%`, undefined],
    ['Trading fee', money(getTradingFee(state)), undefined],
    ['Renovation cost', money(getRenovationCost(state)), undefined],
  ]
  const coreSignals: Metric[] = [
    ['Phase', state.economyPhase, undefined],
    ['Inflation', `${state.inflation.toFixed(1)}%`, undefined],
    ['Credit score', String(state.creditScore), undefined],
    ['Tax due', money(state.taxDue), state.taxDue > 0 ? 'negative' : undefined],
  ]
  const signalDetails: Metric[] = [
    ['Unemployment', `${state.unemployment.toFixed(1)}%`, undefined],
    ['Housing demand', state.housingDemand > 0 ? `+${state.housingDemand.toFixed(1)}` : state.housingDemand.toFixed(1), undefined],
    ['Market sentiment', state.marketSentiment > 0 ? `+${state.marketSentiment.toFixed(1)}` : state.marketSentiment.toFixed(1), undefined],
    ['Bank trust', String(state.bankTrust), undefined],
    ['Card utilization', creditCard ? `${(getCreditUtilization(state) * 100).toFixed(0)}%` : 'N/A', undefined],
    ['Student grace', studentDebt && (studentDebt.deferMonthsRemaining ?? 0) > 0 ? `${studentDebt.deferMonthsRemaining} mo` : 'None', undefined],
    ['Tax rate', `${(getTaxRate(state) * 100).toFixed(1)}%`, undefined],
    ['Compliance risk', String(getComplianceRisk(state)), undefined],
  ]
  const topMilestones = milestones.slice(0, 3)
  const topTips = tips.slice(0, 2)
  const moreTips = tips.slice(2)
  const visibleLog = recentLog.slice(0, 3)
  const olderLog = recentLog.slice(3)

  return (
    <div className="overview-side-grid">
      <section className="panel side-panel">
        <div className="panel-header">
          <div>
            <span className="panel-kicker">Player</span>
            <h2>Condition</h2>
          </div>
          <p>Health, energy, stress, and your baseline setup determine how rough this week is likely to feel.</p>
        </div>

        <div className="condition-grid">
          <article className="condition-card">
            <span>Health</span>
            <strong className={getConditionTone(state.health)}>{state.health}</strong>
          </article>
          <article className="condition-card">
            <span>Energy</span>
            <strong className={getConditionTone(state.energy)}>{state.energy}</strong>
          </article>
          <article className="condition-card">
            <span>Stress</span>
            <strong className={getConditionTone(state.stress, true)}>{state.stress}</strong>
          </article>
        </div>

        <details className="detail-block">
          <summary>Living setup</summary>
          <MetricRows
            items={[
              ['Housing', housingLabel, hasStableHousing(state) ? undefined : 'negative'],
              ['Transport', transportLabel, undefined],
              ['Food', foodLabel, undefined],
              ['Recovery', wellnessLabel, undefined],
            ]}
          />
        </details>
      </section>

      <section className="panel side-panel">
        <div className="panel-header">
          <div>
            <span className="panel-kicker">Finance</span>
            <h2>Pressure</h2>
          </div>
          <p>The overview should answer one question quickly: can you survive this week without panicking?</p>
        </div>

        <MetricRows items={coreFinance} />

        <details className="detail-block">
          <summary>More finance detail</summary>
          <MetricRows items={financeDetails} />
        </details>

        <div className="action-row wide">
          <button className="mini-button" disabled={state.cash < 250 || state.debt <= 0} onClick={() => dispatch({ type: 'REPAY_DEBT', amount: 250 })}>
            Repay $250
          </button>
          <button className="mini-button" disabled={state.cash < 1000 || state.debt <= 0} onClick={() => dispatch({ type: 'REPAY_DEBT', amount: 1000 })}>
            Repay $1,000
          </button>
          <button className="mini-button ghost" disabled={state.debt >= 9000} onClick={() => dispatch({ type: 'TAKE_LOAN' })}>
            Take Microloan
          </button>
        </div>
      </section>

      <section className="panel side-panel">
        <div className="panel-header">
          <div>
            <span className="panel-kicker">Signals</span>
            <h2>World and credit</h2>
          </div>
          <p>Macro and lending conditions now shape jobs, borrowing terms, and whether growth should be cautious or aggressive.</p>
        </div>

        <MetricRows items={coreSignals} />

        <details className="detail-block">
          <summary>More world and credit detail</summary>
          <MetricRows items={signalDetails} />
        </details>

        <div className="action-row wide">
          <button className="mini-button" disabled={state.cash < 250 || state.taxDue <= 0} onClick={() => dispatch({ type: 'PAY_TAXES', amount: 250 })}>
            Pay $250 Tax
          </button>
          <button className="mini-button" disabled={state.cash < 1000 || state.taxDue <= 0} onClick={() => dispatch({ type: 'PAY_TAXES', amount: 1000 })}>
            Pay $1,000 Tax
          </button>
          <button className="mini-button ghost" disabled={state.actionPoints <= 0 || state.cash < 280 || state.complianceScore >= 95} onClick={() => dispatch({ type: 'COMPLIANCE_REVIEW' })}>
            Compliance Review
          </button>
        </div>
      </section>

      <section className="panel side-panel">
        <div className="panel-header">
          <div>
            <span className="panel-kicker">Focus</span>
            <h2>Milestones and next moves</h2>
          </div>
          <p>The overview should point you somewhere useful instead of making you reread every system every turn.</p>
        </div>

        <div className="milestone-list">
          {topMilestones.map((milestone) => (
            <article className={`milestone ${milestone.complete ? 'complete' : ''}`} key={milestone.label}>
              <strong>{milestone.complete ? 'Completed' : 'In Progress'}</strong>
              <span>{milestone.label}</span>
            </article>
          ))}
        </div>

        <div className="tip-list">
          {topTips.map((tip) => (
            <article className="tip-card" key={tip}>
              {tip}
            </article>
          ))}
        </div>

        {moreTips.length > 0 ? (
          <details className="detail-block">
            <summary>More guidance</summary>
            <div className="tip-list">
              {moreTips.map((tip) => (
                <article className="tip-card" key={tip}>
                  {tip}
                </article>
              ))}
            </div>
          </details>
        ) : null}
      </section>

      <section className="panel side-panel">
        <div className="panel-header">
          <div>
            <span className="panel-kicker">Log</span>
            <h2>Latest events</h2>
          </div>
          <p>Recent outcomes are still here, but only the latest stretch belongs on the overview.</p>
        </div>

        <div className="log-list">
          {visibleLog.map((entry) => (
            <article className={`log-entry ${entry.tone}`} key={entry.id}>
              <div className="log-topline">
                <strong>{entry.title}</strong>
                <span>Week {entry.week}</span>
              </div>
              <p>{entry.detail}</p>
            </article>
          ))}
        </div>

        {olderLog.length > 0 ? (
          <details className="detail-block">
            <summary>Older overview events</summary>
            <div className="log-list">
              {olderLog.map((entry) => (
                <article className={`log-entry ${entry.tone}`} key={entry.id}>
                  <div className="log-topline">
                    <strong>{entry.title}</strong>
                    <span>Week {entry.week}</span>
                  </div>
                  <p>{entry.detail}</p>
                </article>
              ))}
            </div>
          </details>
        ) : null}
      </section>
    </div>
  )
}
