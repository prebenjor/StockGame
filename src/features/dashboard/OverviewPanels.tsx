import { GIGS, SIDE_JOB_MAP } from '../../features/career/data'
import { FOOD_OPTION_MAP, HOUSING_OPTION_MAP, TRANSPORT_OPTION_MAP, WELLNESS_OPTION_MAP } from '../../features/lifestyle/data'
import { CONTACT_MAP } from '../../features/world/data'
import { money } from '../../game/core/format'
import { getConditionTone, getMilestones, getTips, getWeeklyRunway } from '../../game/core/selectors'
import { canOpenCreditCard, canRunGig, canTakeSideJob, hasStableHousing } from '../../game/core/utils'
import type { GameAction, GameState, Job } from '../../game/core/types'

type SummaryProps = {
  state: GameState
  currentJob: Job
}

type OverviewLink = 'career' | 'lifestyle' | 'personal' | 'banking' | 'market' | 'network'

type SideProps = {
  state: GameState
  dispatch: React.Dispatch<GameAction>
  onNavigate: (view: OverviewLink) => void
}

type SummaryStat = {
  label: string
  value: string
  tone?: string
}

type SuggestedAction = {
  id: string
  kicker: string
  title: string
  detail: string
  disabled?: boolean
  onClick: () => void
}

function getSituationLine(state: GameState, weeklyRunway: number) {
  if (state.stress >= 80) return 'This is a survival week. If you force more hustle, the run may get uglier before it gets better.'
  if (!state.bankAccount && state.cash >= 25) return 'You finally have enough cash to stop operating entirely in cash. Getting banked is the cleanest move on the board.'
  if (!hasStableHousing(state)) return 'You are still living fragile. A little stability would protect almost every other system in the game.'
  if (weeklyRunway < 0) return 'You are still leaking money every week. Focus on a cleaner base before chasing bigger upside.'
  if (state.opportunities.length > 0) return 'The board is opening up. You have enough breathing room to pick your next lane instead of just reacting.'
  return 'The run is stable enough to choose your next push, but still fragile enough that one bad week matters.'
}

function getPressureCard(state: GameState, weeklyRunway: number) {
  if (state.stress >= 78) {
    return {
      title: 'You are close to burnout',
      detail: 'Spend one open day on recovery or expect the next push to cost more than it pays back.',
      tone: 'negative' as const,
    }
  }

  if (!state.bankAccount) {
    return {
      title: 'Cash-only friction is still hurting you',
      detail: state.cash >= 25 ? 'You can fix that this week by opening a bank account.' : 'Build to $25 cash and get banked before the next phase of the run.',
      tone: 'negative' as const,
    }
  }

  if (!hasStableHousing(state)) {
    return {
      title: 'Housing is still your weak point',
      detail: 'Shelter-level living drags energy and reliability every week. Stabilizing that changes the whole run.',
      tone: 'negative' as const,
    }
  }

  if (weeklyRunway < 0) {
    return {
      title: 'The cashflow is still too thin',
      detail: 'Another side lane or a better job would do more for you than a speculative move right now.',
      tone: 'negative' as const,
    }
  }

  if (state.opportunities.length > 0) {
    return {
      title: 'You have live leads to act on',
      detail: 'Do not let this week end without checking the current openings in your network.',
      tone: 'positive' as const,
    }
  }

  return {
    title: 'This week is playable',
    detail: 'You are not safe yet, but you have enough room to choose your next move instead of only absorbing damage.',
    tone: 'positive' as const,
  }
}

function getSuggestedActions(state: GameState, dispatch: React.Dispatch<GameAction>, onNavigate: (view: OverviewLink) => void) {
  const bestGig = GIGS.filter((gig) => canRunGig(state, gig)).sort((left, right) => right.payout - left.payout)[0]
  const starterSideJob = SIDE_JOB_MAP['delivery-route']
  const canAddStarterSideJob = starterSideJob && !state.sideJobIds.includes(starterSideJob.id) && canTakeSideJob(state, starterSideJob)
  const canRecover = state.actionPoints > 0 && !state.personalActionsUsedThisWeek.includes('sleep-in')
  const canOpenBank = !state.bankAccount && state.actionPoints > 0 && state.cash >= 25
  const creditReady = canOpenCreditCard(state)

  const actions: SuggestedAction[] = []

  if (canRecover) {
    actions.push({
      id: 'recover',
      kicker: 'Stabilize',
      title: 'Take a recovery day',
      detail: 'Use one open day on `Sleep In` and stop the week from spiraling harder.',
      onClick: () => dispatch({ type: 'RUN_PERSONAL_ACTION', personalActionId: 'sleep-in' }),
    })
  }

  if (bestGig) {
    actions.push({
      id: 'gig',
      kicker: 'Cash now',
      title: `Run ${bestGig.title}`,
      detail: `The best currently available one-off move pays ${money(bestGig.payout)}.`,
      onClick: () => dispatch({ type: 'RUN_GIG', gigId: bestGig.id }),
    })
  }

  if (canOpenBank) {
    actions.push({
      id: 'bank',
      kicker: 'Unlock',
      title: 'Open a bank account',
      detail: 'This removes early friction across fees, savings, credit, and lending.',
      onClick: () => dispatch({ type: 'OPEN_BANK_ACCOUNT' }),
    })
  }

  if (canAddStarterSideJob) {
    actions.push({
      id: 'side-work',
      kicker: 'Rhythm',
      title: 'Add steady side work',
      detail: `${starterSideJob.title} pays ${money(starterSideJob.weeklyPay)} a week and gives the run more structure.`,
      onClick: () => dispatch({ type: 'TAKE_SIDE_JOB', sideJobId: starterSideJob.id }),
    })
  }

  if (state.opportunities.length > 0) {
    actions.push({
      id: 'network',
      kicker: 'Lead',
      title: 'Check live opportunities',
      detail: `${state.opportunities.length} opening${state.opportunities.length > 1 ? 's are' : ' is'} waiting in the network layer.`,
      onClick: () => onNavigate('network'),
    })
  }

  if (creditReady) {
    actions.push({
      id: 'credit',
      kicker: 'Credit',
      title: 'Open your starter card',
      detail: 'The bank is finally ready to approve you. Use it as a buffer, not a lifestyle.',
      onClick: () => onNavigate('banking'),
    })
  }

  return actions.slice(0, 4)
}

export function SummaryStats({ state, currentJob }: SummaryProps) {
  const weeklyRunway = getWeeklyRunway(state)
  const primaryStats: SummaryStat[] = [
    { label: 'Cash', value: money(state.cash) },
    { label: 'Runway', value: money(weeklyRunway), tone: weeklyRunway >= 0 ? 'positive' : 'negative' },
    { label: 'Debt', value: money(state.debt), tone: state.debt > 0 ? 'negative' : 'positive' },
    { label: 'Buffer', value: `${money(state.cash + state.savingsBalance)} / $500`, tone: state.cash + state.savingsBalance >= 500 ? 'positive' : undefined },
  ]

  return (
    <section className="overview-resource-strip">
      {primaryStats.map((stat) => (
        <article className="resource-card" key={stat.label}>
          <span>{stat.label}</span>
          <strong className={stat.tone}>{stat.value}</strong>
        </article>
      ))}

      <article className="resource-card wide">
        <span>Current lane</span>
        <strong>{currentJob.title}</strong>
      </article>
    </section>
  )
}

export function SidePanel({ state, dispatch, onNavigate }: SideProps) {
  const weeklyRunway = getWeeklyRunway(state)
  const milestones = getMilestones(state)
  const tips = getTips(state)
  const pressure = getPressureCard(state, weeklyRunway)
  const suggestedActions = getSuggestedActions(state, dispatch, onNavigate)
  const liveOpportunities = state.opportunities.slice(0, 3)
  const recentLog = state.log.slice(0, 2)
  const topObjective = milestones.find((milestone) => !milestone.complete) ?? milestones[milestones.length - 1]
  const housingLabel = HOUSING_OPTION_MAP[state.housingTier].title
  const transportLabel = TRANSPORT_OPTION_MAP[state.transportTier].title
  const foodLabel = FOOD_OPTION_MAP[state.foodTier].title
  const wellnessLabel = WELLNESS_OPTION_MAP[state.wellnessTier].title

  return (
    <section
      className="panel week-hub-panel"
      data-ui-section="overview"
      data-active-subtab="hub"
      data-toolbar-summary={`${state.actionPoints} open days | ${liveOpportunities.length} live leads`}
    >
      <div className="panel-header">
        <div>
          <span className="panel-kicker">Week Hub</span>
          <h2>Play the week, do not manage a spreadsheet</h2>
        </div>
        <p>{getSituationLine(state, weeklyRunway)}</p>
      </div>

      <div className="week-hub-grid">
        <article className={`hub-card story ${pressure.tone}`}>
          <div className="card-topline">
            <h3>{pressure.title}</h3>
            <span>Week {state.week}</span>
          </div>
          <p>{pressure.detail}</p>
          <div className="tag-row">
            <span className="tag">Housing {housingLabel}</span>
            <span className="tag">Transport {transportLabel}</span>
            <span className="tag">Food {foodLabel}</span>
            <span className="tag">Recovery {wellnessLabel}</span>
          </div>
        </article>

        <article className="hub-card condition">
          <div className="card-topline">
            <h3>Condition</h3>
            <span>{state.actionPoints} open days</span>
          </div>
          <div className="condition-strip">
            <div className="condition-meter">
              <span>Health</span>
              <strong className={getConditionTone(state.health)}>{state.health}</strong>
            </div>
            <div className="condition-meter">
              <span>Energy</span>
              <strong className={getConditionTone(state.energy)}>{state.energy}</strong>
            </div>
            <div className="condition-meter">
              <span>Stress</span>
              <strong className={getConditionTone(state.stress, true)}>{state.stress}</strong>
            </div>
          </div>
          <div className="open-day-track" aria-label={`${state.actionPoints} open days remaining this week`}>
            {Array.from({ length: 3 }, (_, index) => (
              <span className={`open-day-slot ${index < state.actionPoints ? 'open' : 'spent'}`} key={index}>
                {index < state.actionPoints ? 'Open' : 'Spent'}
              </span>
            ))}
          </div>
        </article>

        <article className="hub-card actions">
          <div className="card-topline">
            <h3>This week</h3>
            <span>{suggestedActions.length} strong moves</span>
          </div>
          <div className="suggested-action-grid">
            {suggestedActions.map((action) => (
              <button className="suggested-action" key={action.id} onClick={action.onClick} type="button" disabled={action.disabled}>
                <span>{action.kicker}</span>
                <strong>{action.title}</strong>
                <p>{action.detail}</p>
              </button>
            ))}
          </div>
        </article>

        <article className="hub-card objective">
          <div className="card-topline">
            <h3>Main objective</h3>
            <span>{topObjective.complete ? 'Complete' : 'Active'}</span>
          </div>
          <p>{topObjective.label}</p>
          <div className="tip-list compact">
            {tips.slice(0, 2).map((tip) => (
              <article className="tip-card" key={tip}>
                {tip}
              </article>
            ))}
          </div>
        </article>

        <article className="hub-card opportunities">
          <div className="card-topline">
            <h3>Live openings</h3>
            <span>{liveOpportunities.length === 0 ? 'Quiet board' : `${liveOpportunities.length} live`}</span>
          </div>
          {liveOpportunities.length === 0 ? (
            <p>No urgent leads are flashing right now. Use this week to stabilize, earn, or improve your base before the next opening appears.</p>
          ) : (
            <div className="opportunity-preview-grid">
              {liveOpportunities.map((opportunity) => (
                <article className="opportunity-preview" key={opportunity.id}>
                  <div className="card-topline">
                    <strong>{opportunity.title}</strong>
                    <span>{CONTACT_MAP[opportunity.contactId]?.name ?? 'Contact'}</span>
                  </div>
                  <p>{opportunity.detail}</p>
                  <div className="tag-row">
                    {opportunity.cashCost ? <span className="tag">Cost {money(opportunity.cashCost)}</span> : null}
                    <span className="tag">Value {opportunity.value}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </article>

        <article className="hub-card events">
          <div className="card-topline">
            <h3>Recent beats</h3>
            <span>Latest</span>
          </div>
          <div className="hub-event-list">
            {recentLog.map((entry) => (
              <article className={`log-entry ${entry.tone}`} key={entry.id}>
                <div className="log-topline">
                  <strong>{entry.title}</strong>
                  <span>Week {entry.week}</span>
                </div>
                <p>{entry.detail}</p>
              </article>
            ))}
          </div>
        </article>
      </div>
    </section>
  )
}
