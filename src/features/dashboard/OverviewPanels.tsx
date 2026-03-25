import { FOOD_OPTION_MAP, HOUSING_OPTION_MAP, TRANSPORT_OPTION_MAP, WELLNESS_OPTION_MAP } from '../../features/lifestyle/data'
import { money } from '../../game/core/format'
import { getConditionTone, getCurrentJob, getMilestones, getTips } from '../../game/core/selectors'
import { getComplianceRisk, getCreditCardAccount, getCreditUtilization, getDebtService, getInterestRate, getLivingCost, getMonthlyTaxEstimate, getNetWorth, getPassiveIncomePreview, getRenovationCost, getSavingsRate, getTaxRate, getTradingFee, hasStableHousing } from '../../game/core/utils'
import type { GameAction, GameState, Job } from '../../game/core/types'

type SummaryProps = {
  state: GameState
  currentJob: Job
}

function formatAge(ageMonths: number) {
  const years = Math.floor(ageMonths / 12)
  const months = ageMonths % 12
  return `${years}y ${months}m`
}

export function SummaryStats({ state, currentJob }: SummaryProps) {
  const passiveIncome = getPassiveIncomePreview(state)
  const housingLabel = HOUSING_OPTION_MAP[state.housingTier].title
  const bankingLabel = state.bankAccount ? 'Banked' : 'Unbanked'

  return (
    <section className="stat-grid">
      {[
        ['Cash', money(state.cash), undefined],
        ['Age', formatAge(state.ageMonths), undefined],
        ['Savings', money(state.savingsBalance), undefined],
        ['Net Worth', money(getNetWorth(state)), undefined],
        ['Debt', money(state.debt), 'negative'],
        ['Monthly Salary', money(currentJob.salary), undefined],
        ['Passive Income', money(passiveIncome), undefined],
        ['Economy', state.economyPhase, undefined],
        ['Inflation', `${state.inflation.toFixed(1)}%`, undefined],
        ['Credit Score', String(state.creditScore), undefined],
        ['Knowledge', String(state.knowledge), undefined],
        ['Base Rate', `${state.baseRate.toFixed(1)}%`, undefined],
        ['Bank Trust', String(state.bankTrust), undefined],
        ['Housing', housingLabel, hasStableHousing(state) ? undefined : 'negative'],
        ['Banking', bankingLabel, state.bankAccount ? undefined : 'negative'],
      ].map(([label, value, tone]) => (
        <article className="stat-card" key={label}>
          <span>{label}</span>
          <strong className={tone}>{value}</strong>
        </article>
      ))}
    </section>
  )
}

type SideProps = {
  state: GameState
  dispatch: React.Dispatch<GameAction>
}

export function SidePanel({ state, dispatch }: SideProps) {
  const livingCost = getLivingCost(state)
  const interestPreview = Math.round(state.debt * getInterestRate(state))
  const debtService = getDebtService(state)
  const taxPreview = getMonthlyTaxEstimate(state, getPassiveIncomePreview(state), getCurrentJob(state).salary)
  const creditCard = getCreditCardAccount(state)
  const studentDebt = state.debtAccounts.find((account) => account.kind === 'student') ?? null
  const milestones = getMilestones(state)
  const tips = getTips(state)
  const housingLabel = HOUSING_OPTION_MAP[state.housingTier].title
  const transportLabel = TRANSPORT_OPTION_MAP[state.transportTier].title
  const foodLabel = FOOD_OPTION_MAP[state.foodTier].title
  const wellnessLabel = WELLNESS_OPTION_MAP[state.wellnessTier].title

  return (
    <section className="panel side-panel">
      <div className="panel-header">
        <div>
          <span className="panel-kicker">Player</span>
          <h2>Condition</h2>
        </div>
        <p>Stress, health, and energy now shape both your performance and which early survival events are likely to hit.</p>
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

      <div className="panel-header subhead">
        <div>
          <span className="panel-kicker">Finance</span>
          <h2>Cash pressure</h2>
        </div>
        <p>Early access stays open, but unstable housing and weak banking make everything more expensive.</p>
      </div>

      <div className="finance-box">
        <div><span>Living costs</span><strong>{money(livingCost)}</strong></div>
        <div><span>Debt service next month</span><strong>{money(debtService)}</strong></div>
        <div><span>Finance charges preview</span><strong>{money(interestPreview)}</strong></div>
        <div><span>Monthly tax estimate</span><strong>{money(taxPreview)}</strong></div>
        <div><span>Interest rate</span><strong>{(getInterestRate(state) * 100).toFixed(1)}%</strong></div>
        <div><span>Savings yield</span><strong>{(getSavingsRate(state) * 100).toFixed(1)}%</strong></div>
        <div><span>Base rate</span><strong>{state.baseRate.toFixed(1)}%</strong></div>
        <div><span>Credit score</span><strong>{state.creditScore}</strong></div>
        <div><span>Card utilization</span><strong>{creditCard ? `${(getCreditUtilization(state) * 100).toFixed(0)}%` : 'N/A'}</strong></div>
        <div><span>Knowledge</span><strong>{state.knowledge}</strong></div>
        <div><span>Bank trust</span><strong>{state.bankTrust}</strong></div>
        <div><span>Student grace</span><strong>{studentDebt && (studentDebt.deferMonthsRemaining ?? 0) > 0 ? `${studentDebt.deferMonthsRemaining} mo` : 'None'}</strong></div>
        <div><span>Active education</span><strong>{state.educationEnrollment ? 'Yes' : 'No'}</strong></div>
        <div><span>Bank account</span><strong>{state.bankAccount ? 'Open' : 'No'}</strong></div>
        <div><span>Trading fee</span><strong>{money(getTradingFee(state))}</strong></div>
        <div><span>Renovation cost</span><strong>{money(getRenovationCost(state))}</strong></div>
        <div><span>Housing</span><strong>{housingLabel}</strong></div>
        <div><span>Transport</span><strong>{transportLabel}</strong></div>
        <div><span>Food</span><strong>{foodLabel}</strong></div>
        <div><span>Recovery</span><strong>{wellnessLabel}</strong></div>
      </div>

      <div className="panel-header subhead">
        <div>
          <span className="panel-kicker">Economy</span>
          <h2>World regime</h2>
        </div>
        <p>Macro conditions now push directly on jobs, debt, rent demand, and market appetite.</p>
      </div>

      <div className="finance-box">
        <div><span>Phase</span><strong>{state.economyPhase}</strong></div>
        <div><span>Inflation</span><strong>{state.inflation.toFixed(1)}%</strong></div>
        <div><span>Unemployment</span><strong>{state.unemployment.toFixed(1)}%</strong></div>
        <div><span>Housing demand</span><strong>{state.housingDemand > 0 ? `+${state.housingDemand.toFixed(1)}` : state.housingDemand.toFixed(1)}</strong></div>
        <div><span>Market sentiment</span><strong>{state.marketSentiment > 0 ? `+${state.marketSentiment.toFixed(1)}` : state.marketSentiment.toFixed(1)}</strong></div>
        <div><span>Reputation</span><strong>{state.reputation}</strong></div>
      </div>

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

      <div className="panel-header subhead">
        <div>
          <span className="panel-kicker">Taxes</span>
          <h2>Compliance load</h2>
        </div>
        <p>Scaling assets now creates tax liability and administrative risk that has to be actively managed.</p>
      </div>

      <div className="finance-box">
        <div><span>Tax due</span><strong>{money(state.taxDue)}</strong></div>
        <div><span>Tax rate</span><strong>{(getTaxRate(state) * 100).toFixed(1)}%</strong></div>
        <div><span>Compliance score</span><strong>{state.complianceScore}</strong></div>
        <div><span>Compliance risk</span><strong>{getComplianceRisk(state)}</strong></div>
      </div>

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

      <div className="panel-header subhead">
        <div>
          <span className="panel-kicker">Milestones</span>
          <h2>Empire checklist</h2>
        </div>
        <p>These are the clearest signs that you have escaped survival mode.</p>
      </div>

      <div className="milestone-list">
        {milestones.map((milestone) => (
          <article className={`milestone ${milestone.complete ? 'complete' : ''}`} key={milestone.label}>
            <strong>{milestone.complete ? 'Completed' : 'In Progress'}</strong>
            <span>{milestone.label}</span>
          </article>
        ))}
      </div>

      <div className="panel-header subhead">
        <div>
          <span className="panel-kicker">Strategy</span>
          <h2>What to do next</h2>
        </div>
        <p>The game is strongest when jobs, assets, leverage, and recovery reinforce each other.</p>
      </div>

      <div className="tip-list">
        {tips.map((tip) => (
          <article className="tip-card" key={tip}>
            {tip}
          </article>
        ))}
      </div>

      <div className="panel-header subhead">
        <div>
          <span className="panel-kicker">Newswire</span>
          <h2>Event log</h2>
        </div>
        <p>Each month records how your choices, your condition, and the economy collided.</p>
      </div>

      <div className="log-list">
        {state.log.map((entry) => (
          <article className={`log-entry ${entry.tone}`} key={entry.id}>
            <div className="log-topline">
              <strong>{entry.title}</strong>
              <span>Month {entry.month}</span>
            </div>
            <p>{entry.detail}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
