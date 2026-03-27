import { GIGS, SIDE_JOB_MAP } from '../../features/career/data'
import { FOOD_OPTION_MAP, HOUSING_OPTION_MAP, TRANSPORT_OPTION_MAP, WELLNESS_OPTION_MAP } from '../../features/lifestyle/data'
import { CONTACT_MAP } from '../../features/world/data'
import { money } from '../../game/core/format'
import { getConditionTone, getRouteOptions, getTips, getWeeklyRunway } from '../../game/core/selectors'
import { canOpenCreditCard, canRunGig, canTakeSideJob, hasStableHousing } from '../../game/core/utils'
import type { GameAction, GameState } from '../../game/core/types'

type OverviewLink = 'career' | 'education' | 'lifestyle' | 'personal' | 'banking' | 'market' | 'property' | 'business' | 'network'

type SideProps = {
  state: GameState
  dispatch: React.Dispatch<GameAction>
  onNavigate: (view: OverviewLink) => void
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
  if (state.stress >= 80) return 'This week could get messy fast if you keep forcing it.'
  if (!state.bankAccount && state.cash >= 25) return 'You have enough cash to stop doing everything by hand and finally get banked.'
  if (!hasStableHousing(state)) return 'Your living setup is still shaping the whole week.'
  if (weeklyRunway < 0) return 'You are still a little short each week, so the base matters more than the upside.'
  if (state.opportunities.length > 0) return 'There is finally enough room to choose what kind of week you want.'
  return 'You have some room to choose, but one bad week would still be felt.'
}

function getPressureCard(state: GameState, weeklyRunway: number) {
  if (state.stress >= 78) {
    return {
      title: 'You are close to burnout',
      detail: 'A quieter week would probably help more than one more hard push.',
      tone: 'negative' as const,
    }
  }

  if (!state.bankAccount) {
    return {
      title: 'Cash-only friction is still hurting you',
      detail: state.cash >= 25 ? 'You can fix that this week by opening an account.' : 'Getting to $25 cash would open up a steadier banking setup.',
      tone: 'negative' as const,
    }
  }

  if (!hasStableHousing(state)) {
    return {
      title: 'Housing is still your weak point',
      detail: 'Where you live is still dragging on your energy and reliability.',
      tone: 'negative' as const,
    }
  }

  if (weeklyRunway < 0) {
    return {
      title: 'The cashflow is still too thin',
      detail: 'More stable income would probably help more than a risky swing right now.',
      tone: 'negative' as const,
    }
  }

  if (state.opportunities.length > 0) {
    return {
      title: 'You have live leads to act on',
      detail: 'If one of them fits, this is a good week to look at it.',
      tone: 'positive' as const,
    }
  }

  return {
    title: 'This week is playable',
    detail: 'You are not comfortable yet, but you do have room to choose what comes next.',
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
      detail: 'Give yourself one easier day and stop the week from getting sharper.',
      onClick: () => dispatch({ type: 'RUN_PERSONAL_ACTION', personalActionId: 'sleep-in' }),
    })
  }

  if (bestGig) {
    actions.push({
      id: 'gig',
      kicker: 'Cash now',
      title: `Run ${bestGig.title}`,
      detail: `This is the best one-off cash on the board right now at ${money(bestGig.payout)}.`,
      onClick: () => dispatch({ type: 'RUN_GIG', gigId: bestGig.id }),
    })
  }

  if (canOpenBank) {
    actions.push({
      id: 'bank',
      kicker: 'Banking',
      title: 'Open a bank account',
      detail: 'It makes the rest of the climb a little less clumsy.',
      onClick: () => dispatch({ type: 'OPEN_BANK_ACCOUNT' }),
    })
  }

  if (canAddStarterSideJob) {
    actions.push({
      id: 'side-work',
      kicker: 'Income',
      title: 'Add steady side work',
      detail: `${starterSideJob.title} brings in ${money(starterSideJob.weeklyPay)} a week and makes your income less jumpy.`,
      onClick: () => dispatch({ type: 'TAKE_SIDE_JOB', sideJobId: starterSideJob.id }),
    })
  }

  if (state.opportunities.length > 0) {
    actions.push({
      id: 'network',
      kicker: 'Lead',
      title: 'Check live opportunities',
      detail: `${state.opportunities.length} opening${state.opportunities.length > 1 ? 's are' : ' is'} waiting if you want to look.`,
      onClick: () => onNavigate('network'),
    })
  }

  if (creditReady) {
    actions.push({
      id: 'credit',
      kicker: 'Credit',
      title: 'Open your starter card',
      detail: 'The bank would approve you now if you want a little more breathing room.',
      onClick: () => onNavigate('banking'),
    })
  }

  return actions.slice(0, 4)
}
export function SidePanel({ state, dispatch, onNavigate }: SideProps) {
  const weeklyRunway = getWeeklyRunway(state)
  const tips = getTips(state)
  const routes = getRouteOptions(state)
  const pressure = getPressureCard(state, weeklyRunway)
  const suggestedActions = getSuggestedActions(state, dispatch, onNavigate)
  const liveOpportunities = state.opportunities.slice(0, 3)
  const recentLog = state.log.slice(0, 2)
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

        <article className="hub-card player">
          <div className="card-topline">
            <h3>Player</h3>
            <span>What opens up next</span>
          </div>
          <div className="player-stat-grid">
            <div className="player-stat">
              <span>Reputation</span>
              <strong>{state.reputation}</strong>
            </div>
            <div className="player-stat">
              <span>Knowledge</span>
              <strong>{state.knowledge}</strong>
            </div>
            <div className="player-stat">
              <span>Credit score</span>
              <strong>{state.creditScore}</strong>
            </div>
            <div className="player-stat">
              <span>Bank trust</span>
              <strong>{state.bankTrust}</strong>
            </div>
          </div>
          <p>These shape what jobs, study options, financing, and deals start to feel realistic.</p>
        </article>

        <article className="hub-card actions">
          <div className="card-topline">
            <h3>This week</h3>
            <span>{suggestedActions.length} live options</span>
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

        <article className="hub-card routes">
          <div className="card-topline">
            <h3>Possible routes</h3>
            <span>{routes.length} in view</span>
          </div>
          <div className="route-grid">
            {routes.map((route) => (
              <article className="route-card" key={route.id}>
                <span>{route.title}</span>
                <strong>{route.reason}</strong>
                <p>{route.firstMove}</p>
                <button className="mini-button ghost" type="button" onClick={() => onNavigate(route.view)}>
                  Go there
                </button>
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
            <span>{tips.length > 0 ? 'Context' : 'Latest'}</span>
          </div>
          <div className="hub-event-list">
            {tips.slice(0, 2).map((tip) => (
              <article className="tip-card compact-note" key={tip}>
                {tip}
              </article>
            ))}
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
