import { useEffect, useMemo, useState } from 'react'
import { FOOD_OPTION_MAP, HOUSING_OPTION_MAP, TRANSPORT_OPTION_MAP, WELLNESS_OPTION_MAP } from '../../features/lifestyle/data'
import { CONTACT_MAP } from '../../features/world/data'
import { money } from '../../game/core/format'
import {
  createLeaveOpenWeekAction,
  getAssignedWeekSlotCount,
  getFeaturedWeekSituations,
  getWeekPlanOptions,
  isWeekPlanReady,
} from '../../game/core/planning'
import { getRouteOptions, getTips, getWeeklyRunway } from '../../game/core/selectors'
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

const PLAN_GROUP_ICONS: Record<WeekPlanKind, string> = {
  work: 'W',
  recovery: 'R',
  growth: 'G',
  money: '$',
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

function getPressureTags(
  state: GameState,
  labels: {
    housing: string
    transport: string
    food: string
    wellness: string
  },
) {
  const tags: string[] = []

  if (!hasStableHousing(state)) {
    tags.push(`Housing ${labels.housing}`)
  }

  if (!state.bankAccount) {
    tags.push('Cash only')
  }

  if (state.stress >= 70) {
    tags.push('Stress running hot')
  }

  if (state.energy <= 35) {
    tags.push('Low energy')
  }

  if (tags.length === 0 && state.foodTier === 'skip-meals') {
    tags.push(`Food ${labels.food}`)
  }

  if (tags.length === 0 && state.wellnessTier === 'none') {
    tags.push(`Recovery ${labels.wellness}`)
  }

  if (tags.length === 0 && state.transportTier === 'foot') {
    tags.push(`Transport ${labels.transport}`)
  }

  return tags.slice(0, 2)
}

function getRouteContextLine(state: GameState) {
  const notes: string[] = []

  if (state.knowledge >= 6 || state.reputation >= 2) {
    notes.push('Study and better work are starting to look real.')
  }

  if (state.bankAccount && state.creditScore >= 440) {
    notes.push('Lending is starting to open up a little.')
  }

  if (state.bankAccount && state.cash + state.savingsBalance >= 500) {
    notes.push('Capital paths are no longer just background dreams.')
  }

  return notes[0] ?? null
}

function getPlannerTradeoffTags(option: PlannedWeekAction) {
  switch (option.id) {
    case 'focus-shift':
    case 'best-gig':
      return ['+Cash', '+Stress', '-Energy']
    case 'steady-side-work':
      return ['+Future pay', '+Rep']
    case 'sleep-in':
      return ['-Stress', '+Energy', '+Health']
    case 'nature-walk':
    case 'stay-in':
      return ['-Stress', '+Energy']
    case 'study-block':
    case 'course-catchup':
      return ['+Knowledge', '+Stress', '-Energy']
    case 'network-round':
      return ['+Rep', '+Contact', '+Stress']
    case 'bank-admin':
      return option.label === 'Open your account' ? ['-Cash', '+Trust', '-Stress'] : ['+Trust', '-Stress']
    case 'market-research':
      return ['+Knowledge', '-Stress']
    case 'starter-etf-buy':
      return ['-Cash', '+Position']
    case 'follow-live-lead':
      return ['+Lead', '+Rep']
    case 'property-scout':
      return ['+Rep', '+Broker']
    case 'property-tune-up':
      return ['-Cash', '+Condition']
    case 'business-sketch':
      return ['+Knowledge', '+Rep']
    case 'business-tune-up':
      return ['-Cash', '+Condition']
    default:
      if (option.slotState === 'leave-open') return ['Keep it light']
      if (option.preview) {
        return option.preview
          .split(',')
          .map((part) => part.trim())
          .filter(Boolean)
          .slice(0, 3)
      }
      return ['Tactical move']
  }
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
  const [expandedOptions, setExpandedOptions] = useState<string[]>([])
  const [collapsedGroups, setCollapsedGroups] = useState<Record<WeekPlanKind, boolean>>({
    work: false,
    recovery: false,
    growth: false,
    money: false,
  })
  const planOptions = getWeekPlanOptions(state)
  const featuredSituations = getFeaturedWeekSituations(state)
  const visibleSituations = [featuredSituations.major, featuredSituations.side].filter(Boolean)
  const pressureTags = getPressureTags(state, {
    housing: housingLabel,
    transport: transportLabel,
    food: foodLabel,
    wellness: wellnessLabel,
  })
  const routeContextLine = getRouteContextLine(state)
  const assignedWeekSlots = getAssignedWeekSlotCount(state)
  const weekPlanReady = isWeekPlanReady(state)

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

  const assignPlannedAction = (plannedAction: PlannedWeekAction) => {
    if (state.weekPlanCommitted) return

    const firstEmptyIndex = state.plannedWeekSlots.findIndex((slot) => slot === null)
    const selectedSlotIsEmpty = state.plannedWeekSlots[selectedSlot] === null
    const slotIndex = selectedSlotIsEmpty || firstEmptyIndex < 0 ? Math.min(selectedSlot, state.plannedWeekSlots.length - 1) : firstEmptyIndex
    dispatch({ type: 'SET_WEEK_SLOT', slotIndex, plannedAction })

    const nextEmptyIndex = state.plannedWeekSlots.findIndex((slot, index) => index > slotIndex && slot === null)
    if (nextEmptyIndex >= 0) {
      setSelectedSlot(nextEmptyIndex)
    }
  }

  const toggleExpandedOption = (optionId: string) => {
    setExpandedOptions((current) =>
      current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId],
    )
  }

  const toggleCollapsedGroup = (kind: WeekPlanKind) => {
    setCollapsedGroups((current) => ({
      ...current,
      [kind]: !current[kind],
    }))
  }

  return (
    <section
      className="panel week-hub-panel"
      data-ui-section="overview"
      data-active-subtab="hub"
      data-toolbar-summary={`${assignedWeekSlots}/3 days assigned | ${liveOpportunities.length} live leads | ${visibleSituations.length} featured situations`}
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
          {pressureTags.length > 0 ? (
            <div className="tag-row">
              {pressureTags.map((tag) => (
                <span className="tag" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </article>

        <article className="hub-card planner planner-wide">
          <div className="card-topline">
            <h3>Week plan</h3>
            <span>{getPlanContext(state)}</span>
          </div>

          <div className="week-slot-grid">
            {state.plannedWeekSlots.map((slot, index) => {
              const slotKindClass = slot?.slotState === 'leave-open' ? 'leave-open' : slot ? `slot-kind-${slot.kind}` : 'empty'
              return (
                <article
                  className={`week-slot-card ${selectedSlot === index ? 'selected' : ''} ${slot ? 'filled' : 'empty'} ${slotKindClass} ${
                    state.weekResolutionPhase === 'resolving' && index < state.weekResolutionCursor ? 'resolved' : ''
                  }`}
                  key={`slot-${index}`}
                >
                  <div className="week-slot-toolbar">
                    <span>Open day {index + 1}</span>
                    {slot ? (
                      <button
                        className="slot-clear-button"
                        type="button"
                        onClick={() => dispatch({ type: 'CLEAR_WEEK_SLOT', slotIndex: index })}
                        disabled={state.weekPlanCommitted}
                        aria-label={`Clear open day ${index + 1}`}
                      >
                        X
                      </button>
                    ) : null}
                  </div>

                  <button className="week-slot-hitbox" type="button" onClick={() => setSelectedSlot(index)} disabled={state.weekPlanCommitted}>
                    {slot ? (
                      <>
                        <span className={`slot-kind-badge ${slot.slotState === 'leave-open' ? 'neutral' : slot.kind}`}>
                          {slot.slotState === 'leave-open' ? 'Open' : PLAN_GROUP_LABELS[slot.kind]}
                        </span>
                        <strong>{slot.label}</strong>
                        <p>{slot.detail}</p>
                      </>
                    ) : (
                      <>
                        <span className="slot-empty-mark" aria-hidden="true">
                          +
                        </span>
                        <strong>Assign an activity</strong>
                        <p>Pick from the options below.</p>
                      </>
                    )}
                  </button>

                  {!slot ? (
                    <button
                      className="mini-button ghost slot-leave-open"
                      type="button"
                      onClick={() => assignPlannedAction(createLeaveOpenWeekAction(index))}
                      disabled={state.weekPlanCommitted}
                    >
                      Leave open
                    </button>
                  ) : null}
                </article>
              )
            })}
          </div>

          <div className="planner-catalog">
            {Object.entries(groupedPlanOptions).map(([kind, options]) =>
              options.length > 0 ? (
                <section className={`planner-group planner-group-${kind}`} key={kind}>
                  <button
                    className="planner-group-header"
                    type="button"
                    onClick={() => toggleCollapsedGroup(kind as WeekPlanKind)}
                    aria-expanded={!collapsedGroups[kind as WeekPlanKind]}
                  >
                    <div className="planner-group-title">
                      <span className={`planner-group-icon ${kind}`}>{PLAN_GROUP_ICONS[kind as WeekPlanKind]}</span>
                      <strong>{PLAN_GROUP_LABELS[kind as WeekPlanKind]}</strong>
                    </div>
                    <div className="planner-group-meta">
                      <span className="planner-group-count">{options.length} options</span>
                      <span className="planner-group-chevron">{collapsedGroups[kind as WeekPlanKind] ? '+' : '-'}</span>
                    </div>
                  </button>

                  {!collapsedGroups[kind as WeekPlanKind] ? (
                    <div className="planner-option-grid">
                      {options.map((option) => {
                        const expanded = expandedOptions.includes(option.id)
                        const assignedIndex = state.plannedWeekSlots.findIndex((slot) => slot?.id === option.id)
                        const isAssigned = assignedIndex >= 0
                        const disabled = state.weekPlanCommitted || !!(option.oncePerWeek && isAssigned)

                        return (
                          <article className={`planner-option-card ${isAssigned ? 'assigned' : ''}`} key={option.id}>
                            <button
                              className="planner-option-hitbox"
                              type="button"
                              onClick={() => assignPlannedAction(option)}
                              disabled={disabled}
                            >
                              <div className="planner-option-topline">
                                <span className={`slot-kind-badge ${option.kind}`}>{PLAN_GROUP_LABELS[option.kind]}</span>
                                {isAssigned ? <span className="planner-option-assigned">Assigned to Day {assignedIndex + 1}</span> : null}
                              </div>
                              <strong>{option.label}</strong>
                              <div className="planner-tradeoff-row">
                                {getPlannerTradeoffTags(option).map((tag) => (
                                  <span className="planner-tradeoff-tag" key={`${option.id}-${tag}`}>
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </button>

                            <button
                              className="planner-expand-toggle"
                              type="button"
                              onClick={() => toggleExpandedOption(option.id)}
                              aria-expanded={expanded}
                            >
                              {expanded ? 'Less' : 'Details'}
                            </button>

                            {expanded ? (
                              <div className="planner-option-detail">
                                <p>{option.detail}</p>
                                {option.preview ? <small>{option.preview}</small> : null}
                              </div>
                            ) : null}
                          </article>
                        )
                      })}
                    </div>
                  ) : null}
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
            <p className="compact-note">Run the week and the day-by-day results land here.</p>
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

        <article className="hub-card routes">
          <div className="card-topline">
            <h3>Possible routes</h3>
            <span>{routes.length} in view</span>
          </div>
          {routeContextLine ? <p className="compact-note route-context">{routeContextLine}</p> : null}
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

      <div className="week-run-bar">
        <div className="week-run-summary">
          <strong>{assignedWeekSlots} of 3 days assigned</strong>
          <span>{weekPlanReady ? 'The week is ready to run.' : 'Assign every day or mark it Leave open first.'}</span>
        </div>
        <div className="week-run-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={() => dispatch({ type: 'CANCEL_WEEK_PLAN' })}
            disabled={state.weekResolutionPhase === 'resolving' || (!state.plannedWeekSlots.some(Boolean) && state.weekResolutionResults.length === 0)}
          >
            Clear Plan
          </button>
          <button
            className="primary-button"
            type="button"
            onClick={() => dispatch({ type: 'COMMIT_WEEK_PLAN' })}
            disabled={!weekPlanReady || state.weekPlanCommitted}
            title={weekPlanReady ? 'Run the planned week.' : 'Assign all open days first.'}
          >
            Run This Week
          </button>
        </div>
      </div>
    </section>
  )
}
