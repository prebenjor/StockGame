import { useEffect, useMemo, useState } from 'react'
import { FOOD_OPTION_MAP, HOUSING_OPTION_MAP, TRANSPORT_OPTION_MAP, WELLNESS_OPTION_MAP } from '../../features/lifestyle/data'
import { CONTACT_MAP } from '../../features/world/data'
import { money } from '../../game/core/format'
import { getFeaturedWeekSituations, getWeekPlanOptions } from '../../game/core/planning'
import { getConditionTone, getRouteOptions, getTips, getWeeklyRunway } from '../../game/core/selectors'
import type { GameAction, GameState, PlannedWeekAction, WeekPlanKind } from '../../game/core/types'
import { canOpenCreditCard, hasStableHousing } from '../../game/core/utils'

type OverviewLink = 'career' | 'education' | 'lifestyle' | 'personal' | 'banking' | 'market' | 'property' | 'business' | 'network'

type SideProps = {
  state: GameState
  dispatch: React.Dispatch<GameAction>
  onNavigate: (view: OverviewLink) => void
}

const PLAN_GROUP_LABELS: Record<WeekPlanKind, string> = {
  work: 'Work',
  recovery: 'Recovery',
  growth: 'Growth',
  money: 'Money',
}

const EVENT_CATEGORY_LABELS = {
  work: 'Work',
  housing: 'Housing',
  social: 'Social',
  education: 'Study',
  market: 'Market',
  property: 'Property',
  business: 'Business',
} as const

function getSituationLine(state: GameState, weeklyRunway: number) {
  if (state.stress >= 80) return 'The week can still work, but pushing blindly would probably make it worse.'
  if (!state.bankAccount && state.cash >= 25) return 'You finally have enough cash to stop doing everything the hard way if you want to.'
  if (!hasStableHousing(state)) return 'Your living setup is still shaping almost every other decision.'
  if (weeklyRunway < 0) return 'You are still a little short each week, so a calmer base matters more than a flashy jump.'
  if (state.opportunities.length > 0) return 'You have some real choices this week instead of only damage control.'
  return 'You have room to decide what this week is actually for.'
}

function getPressureCard(state: GameState, weeklyRunway: number) {
  if (state.stress >= 78) {
    return {
      title: 'You are close to burning out',
      detail: 'If you fill all three open days with push, the week will probably push back.',
      tone: 'negative' as const,
    }
  }

  if (!state.bankAccount) {
    return {
      title: 'Cash-only life is still slowing you down',
      detail: state.cash >= 25 ? 'You can fix that this week if you want to spend one open day on it.' : 'One of the cleaner next moves is just getting enough cash to open an account.',
      tone: 'negative' as const,
    }
  }

  if (!hasStableHousing(state)) {
    return {
      title: 'Your setup at home is still the weak point',
      detail: 'A more reliable place to land would make the rest of the week easier almost immediately.',
      tone: 'negative' as const,
    }
  }

  if (weeklyRunway < 0) {
    return {
      title: 'The week is still running a little short',
      detail: 'Safer income and a cleaner base are probably worth more than a risky swing right now.',
      tone: 'negative' as const,
    }
  }

  if (state.opportunities.length > 0) {
    return {
      title: 'There are live openings on the board',
      detail: 'You do not need to chase them, but this is one of the better weeks to take a look.',
      tone: 'positive' as const,
    }
  }

  return {
    title: 'This week is yours to shape',
    detail: 'Nothing is solved yet, but you have enough room to decide what kind of progress you want.',
    tone: 'positive' as const,
  }
}

function getPlanContext(state: GameState) {
  if (!state.weekPlanCommitted) {
    return 'Pick what each open day is for, then let the week play out.'
  }

  if (state.weekResolutionPhase === 'resolving') {
    return 'The week is unfolding now, one planned day at a time.'
  }

  return 'That plan has landed. You can read it, then shape the next week.'
}

export function SidePanel({ state, dispatch, onNavigate }: SideProps) {
  const weeklyRunway = getWeeklyRunway(state)
  const tips = getTips(state)
  const routes = getRouteOptions(state)
  const pressure = getPressureCard(state, weeklyRunway)
  const liveOpportunities = state.opportunities.slice(0, 3)
  const recentLog = state.log.slice(0, 2)
  const housingLabel = HOUSING_OPTION_MAP[state.housingTier].title
  const transportLabel = TRANSPORT_OPTION_MAP[state.transportTier].title
  const foodLabel = FOOD_OPTION_MAP[state.foodTier].title
  const wellnessLabel = WELLNESS_OPTION_MAP[state.wellnessTier].title
  const [selectedSlot, setSelectedSlot] = useState(0)
  const planOptions = getWeekPlanOptions(state)
  const featuredSituations = getFeaturedWeekSituations(state)
  const visibleSituations = [featuredSituations.major, featuredSituations.side].filter(Boolean)

  useEffect(() => {
    if (!state.weekPlanCommitted || state.weekResolutionPhase !== 'resolving') return
    const delay = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 120 : 760
    const timeoutId = window.setTimeout(() => {
      dispatch({ type: 'RESOLVE_NEXT_WEEK_SLOT' })
    }, delay)
    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [dispatch, state.weekPlanCommitted, state.weekResolutionCursor, state.weekResolutionPhase])

  const groupedPlanOptions = useMemo(() => {
    const groups: Record<WeekPlanKind, PlannedWeekAction[]> = {
      work: [],
      recovery: [],
      growth: [],
      money: [],
    }
    planOptions.forEach((option) => {
      groups[option.kind].push(option)
    })
    return groups
  }, [planOptions])

  const nextSlotIndex = useMemo(() => {
    const firstEmptyIndex = state.plannedWeekSlots.findIndex((slot) => slot === null)
    if (firstEmptyIndex >= 0) return firstEmptyIndex
    return Math.min(selectedSlot, state.plannedWeekSlots.length - 1)
  }, [selectedSlot, state.plannedWeekSlots])

  const assignPlannedAction = (plannedAction: PlannedWeekAction) => {
    if (state.weekPlanCommitted) return
    dispatch({ type: 'SET_WEEK_SLOT', slotIndex: nextSlotIndex, plannedAction })
    if (nextSlotIndex < state.plannedWeekSlots.length - 1) {
      setSelectedSlot(nextSlotIndex + 1)
    }
  }

  return (
    <section
      className="panel week-hub-panel"
      data-ui-section="overview"
      data-active-subtab="hub"
      data-toolbar-summary={`${state.actionPoints} open days | ${liveOpportunities.length} live leads | ${visibleSituations.length} featured situations`}
    >
      <div className="panel-header">
        <div>
          <span className="panel-kicker">Week Hub</span>
          <h2>Choose what this week is for</h2>
        </div>
        <p>{getSituationLine(state, weeklyRunway)}</p>
      </div>

      <div className="week-hub-grid">
        <article className={`hub-card story ${pressure.tone}`}>
          <div className="card-topline">
            <h3>{pressure.title}</h3>
            <span>{state.actionPoints} open days</span>
          </div>
          <p>{pressure.detail}</p>
          <div className="tag-row">
            <span className="tag">Housing {housingLabel}</span>
            <span className="tag">Transport {transportLabel}</span>
            <span className="tag">Food {foodLabel}</span>
            <span className="tag">Recovery {wellnessLabel}</span>
          </div>
        </article>

        <article className="hub-card planner planner-wide">
          <div className="card-topline">
            <h3>Week plan</h3>
            <span>{getPlanContext(state)}</span>
          </div>

          <div className="week-slot-grid">
            {state.plannedWeekSlots.map((slot, index) => (
              <article
                className={`week-slot-card ${selectedSlot === index ? 'selected' : ''} ${slot ? 'filled' : 'empty'} ${
                  state.weekResolutionPhase === 'resolving' && index < state.weekResolutionCursor ? 'resolved' : ''
                }`}
                key={`slot-${index}`}
              >
                <button className="week-slot-hitbox" type="button" onClick={() => setSelectedSlot(index)} disabled={state.weekPlanCommitted}>
                  <span>Open day {index + 1}</span>
                  <strong>{slot?.label ?? 'Choose a plan'}</strong>
                  <p>{slot?.detail ?? 'Leave it open or give this day a job.'}</p>
                </button>
                {slot ? (
                  <button
                    className="mini-button ghost"
                    type="button"
                    onClick={() => dispatch({ type: 'CLEAR_WEEK_SLOT', slotIndex: index })}
                    disabled={state.weekPlanCommitted}
                  >
                    Clear
                  </button>
                ) : null}
              </article>
            ))}
          </div>

          <div className="planner-action-row">
            <button className="primary-button" type="button" onClick={() => dispatch({ type: 'COMMIT_WEEK_PLAN' })} disabled={!state.plannedWeekSlots.some(Boolean) || state.weekPlanCommitted}>
              Run This Week
            </button>
            <button className="secondary-button" type="button" onClick={() => dispatch({ type: 'CANCEL_WEEK_PLAN' })} disabled={state.weekResolutionPhase === 'resolving' || (!state.plannedWeekSlots.some(Boolean) && state.weekResolutionResults.length === 0)}>
              Clear Plan
            </button>
          </div>

          <div className="planner-catalog">
            {Object.entries(groupedPlanOptions).map(([kind, options]) =>
              options.length > 0 ? (
                <section className="planner-group" key={kind}>
                  <div className="card-topline">
                    <h4>{PLAN_GROUP_LABELS[kind as WeekPlanKind]}</h4>
                    <span>{options.length} options</span>
                  </div>
                  <div className="planner-option-grid">
                    {options.map((option) => (
                      <button
                        className="planner-option-card"
                        key={option.id}
                        type="button"
                        onClick={() => assignPlannedAction(option)}
                        disabled={state.weekPlanCommitted || !!(option.oncePerWeek && state.plannedWeekSlots.some((slot) => slot?.id === option.id))}
                      >
                        <span>{PLAN_GROUP_LABELS[option.kind]}</span>
                        <strong>{option.label}</strong>
                        <p>{option.detail}</p>
                        {option.preview ? <small>{option.preview}</small> : null}
                      </button>
                    ))}
                  </div>
                </section>
              ) : null,
            )}
          </div>
        </article>

        <article className="hub-card resolution">
          <div className="card-topline">
            <h3>Week resolution</h3>
            <span>{state.weekResolutionPhase === 'resolving' ? 'In motion' : state.weekResolutionResults.length > 0 ? 'Last week' : 'Ready'}</span>
          </div>
          {state.weekResolutionResults.length === 0 ? (
            <p className="compact-note">Once you run a planned week, each open day will land here as a visible result instead of just disappearing into a number change.</p>
          ) : (
            <div className="resolution-strip">
              {state.weekResolutionResults.map((result, index) => (
                <article
                  className={`resolution-card ${result.tone} ${index === state.weekResolutionResults.length - 1 && state.weekResolutionPhase === 'resolving' ? 'current' : ''}`}
                  key={result.id}
                >
                  <div className="card-topline">
                    <strong>{result.label}</strong>
                    <span>{result.tone === 'good' ? 'Good' : result.tone === 'bad' ? 'Costly' : 'Even'}</span>
                  </div>
                  <p>{result.detail}</p>
                  <div className="tag-row">
                    {result.deltas.map((delta) => (
                      <span className="tag" key={`${result.id}-${delta}`}>
                        {delta}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </article>

        <article className="hub-card condition">
          <div className="card-topline">
            <h3>Condition</h3>
            <span>How the week feels</span>
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
          <p>These shape what starts to feel realistic next, from jobs and study to property, lending, and small ownership plays.</p>
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
            <p>Nothing urgent is flashing right now. That gives you room to stabilize, earn, study, or set up a cleaner base before the next opening arrives.</p>
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

        <article className="hub-card live-events">
          <div className="card-topline">
            <h3>Live situations</h3>
            <span>{visibleSituations.length === 0 ? 'Quiet' : `${visibleSituations.length} in view`}</span>
          </div>
          {visibleSituations.length === 0 ? (
            <p className="compact-note">No one is putting a fresh choice in front of you right this second. You can shape the week on your own terms.</p>
          ) : (
            <div className="hub-event-list">
              {featuredSituations.major ? (
                <article className={`event-choice-card major ${featuredSituations.major.tone}`} key={featuredSituations.major.id}>
                  <div className="card-topline">
                    <strong>{featuredSituations.major.title}</strong>
                    <span>Major {EVENT_CATEGORY_LABELS[featuredSituations.major.category]}</span>
                  </div>
                  <p>{featuredSituations.major.detail}</p>
                  <div className="event-option-row">
                    {featuredSituations.major.options.map((option) => (
                      <button
                        className="mini-button ghost"
                        key={`${featuredSituations.major?.id}-${option.id}`}
                        type="button"
                        onClick={() => dispatch({ type: 'CHOOSE_WEEK_EVENT_OPTION', eventId: featuredSituations.major!.id, optionId: option.id })}
                        disabled={state.weekResolutionPhase === 'resolving'}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </article>
              ) : null}

              {featuredSituations.side ? (
                <article className={`event-choice-card side ${featuredSituations.side.tone}`} key={featuredSituations.side.id}>
                  <div className="card-topline">
                    <strong>{featuredSituations.side.title}</strong>
                    <span>Side {EVENT_CATEGORY_LABELS[featuredSituations.side.category]}</span>
                  </div>
                  <p>{featuredSituations.side.detail}</p>
                  <div className="event-option-row">
                    {featuredSituations.side.options.map((option) => (
                      <button
                        className="mini-button ghost"
                        key={`${featuredSituations.side?.id}-${option.id}`}
                        type="button"
                        onClick={() => dispatch({ type: 'CHOOSE_WEEK_EVENT_OPTION', eventId: featuredSituations.side!.id, optionId: option.id })}
                        disabled={state.weekResolutionPhase === 'resolving'}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </article>
              ) : null}

              {featuredSituations.hiddenCount > 0 ? (
                <article className="compact-note">
                  {featuredSituations.hiddenCount} more situation{featuredSituations.hiddenCount > 1 ? 's are' : ' is'} waiting in the background. The big decisions are the ones above.
                </article>
              ) : null}
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
            {!state.bankAccount && canOpenCreditCard(state) ? (
              <article className="tip-card compact-note">
                Credit is still off in the distance. The first simpler move is probably just getting banked.
              </article>
            ) : null}
          </div>
        </article>
      </div>
    </section>
  )
}
