import { GIGS, SIDE_JOB_MAP } from '../../features/career/data'
import { PERSONAL_ACTION_MAP } from '../../features/personal/data'
import type { GameState, PlannedWeekAction, WeekEventCard } from './types'
import { canRunGig, canTakeSideJob, hasStableHousing } from './utils'

function addIf<T>(items: T[], condition: unknown, value: T) {
  if (condition) items.push(value)
}

export function getWeekPlanOptions(state: GameState): PlannedWeekAction[] {
  const options: PlannedWeekAction[] = []
  const starterSideJob = SIDE_JOB_MAP['delivery-route']
  const bestGig = GIGS.filter((gig) => canRunGig(state, gig)).sort((left, right) => right.payout - left.payout)[0]

  options.push({
    id: 'focus-shift',
    kind: 'work',
    label: 'Pick up an extra shift',
    detail: 'Lean harder on your main job for one day and trade energy for steadier cash.',
    sourceRef: state.jobId,
    actionCost: 1,
    preview: 'Cash up, stress up, energy down, reputation up a little.',
  })

  addIf(
    options,
    bestGig,
    {
      id: 'best-gig',
      kind: 'work',
      label: `Run ${bestGig?.title}`,
      detail: bestGig?.description ?? 'Take the best one-off work you can reach right now.',
      sourceRef: bestGig?.id,
      actionCost: 1,
      preview: `One-off cash now from ${bestGig?.title}.`,
    },
  )

  addIf(
    options,
    starterSideJob && !state.sideJobIds.includes(starterSideJob.id) && canTakeSideJob(state, starterSideJob),
    {
      id: 'steady-side-work',
      kind: 'work',
      label: `Set up ${starterSideJob?.title}`,
      detail: 'Use a day to lock in steadier side income for the weeks after this one.',
      sourceRef: starterSideJob?.id,
      actionCost: 1,
      preview: 'No instant cash spike, but future weeks get less fragile.',
      oncePerWeek: true,
    },
  )

  ;['sleep-in', 'nature-walk', 'stay-in'].forEach((actionId) => {
    const action = PERSONAL_ACTION_MAP[actionId]
    if (!action) return
    if (state.cash < action.cashCost) return
    if (action.oncePerWeek && state.personalActionsUsedThisWeek.includes(action.id)) return
    options.push({
      id: action.id,
      kind: 'recovery',
      label: action.title,
      detail: action.description,
      sourceRef: action.id,
      actionCost: action.actionCost,
      preview: 'This is a lighter day that helps your body more than your wallet.',
      oncePerWeek: action.oncePerWeek,
    })
  })

  options.push({
    id: 'study-block',
    kind: 'growth',
    label: 'Study block',
    detail: 'Use one open day to read, practice, or work through material that keeps paying later.',
    actionCost: 1,
    preview: 'Knowledge up, energy down a bit, stress up a touch.',
  })

  options.push({
    id: 'network-round',
    kind: 'growth',
    label: 'Reach out',
    detail: 'Spend a day on messages, favors, and small follow-ups that keep people warm.',
    actionCost: 1,
    preview: 'Reputation up, one contact gets closer, and a new lead might appear.',
  })

  options.push({
    id: 'bank-admin',
    kind: 'money',
    label: state.bankAccount ? 'Money admin' : 'Open your account',
    detail: state.bankAccount
      ? 'Tidy up the money side of your week, move some cash, and keep the basics in order.'
      : 'Use the day to stop living in pure cash and get your banking set up.',
    actionCost: 1,
    preview: state.bankAccount ? 'A calmer, cleaner money week.' : 'Costs cash now, makes the next weeks smoother.',
    oncePerWeek: true,
  })

  addIf(
    options,
    state.bankAccount,
    {
      id: 'market-research',
      kind: 'money',
      label: 'Market research',
      detail: 'Review names, tighten your watchlist, and learn before taking risk.',
      actionCost: 1,
      preview: 'Knowledge up, stress down a little, maybe a new market lead.',
    },
  )

  addIf(
    options,
    hasStableHousing(state) || state.reputation >= 1,
    {
      id: 'property-scout',
      kind: 'money',
      label: 'Property scout',
      detail: 'Spend a day reading listings, talking to a broker, and learning which small assets are realistic.',
      actionCost: 1,
      preview: 'Reputation and broker momentum up. Sometimes it opens a lead.',
    },
  )

  addIf(
    options,
    state.reputation >= 1 || state.businesses.length > 0,
    {
      id: 'business-sketch',
      kind: 'money',
      label: 'Business sketch',
      detail: 'Take a day to price out a tiny operation or tighten one you already own.',
      actionCost: 1,
      preview: 'Knowledge and operator momentum up, with a chance at a lead.',
    },
  )

  return options
}

export function getWeekEventCards(state: GameState): WeekEventCard[] {
  const cards: WeekEventCard[] = []

  if (!state.bankAccount && state.cash >= 18) {
    cards.push({
      id: 'bank-counter-window',
      title: 'A bank clerk gives you a quiet opening',
      detail: 'There is a slower hour at the branch tomorrow if you want help getting the paperwork done.',
      category: 'social',
      tone: 'neutral',
      options: [
        {
          id: 'take-window',
          label: 'Take the opening',
          detail: 'Use the help and get a little more trust on the way in.',
          bankTrust: 2,
          storyFlag: 'bank-window-used',
        },
        {
          id: 'let-it-go',
          label: 'Leave it',
          detail: 'Stay flexible and keep the day for something else.',
          stress: 1,
        },
      ],
    })
  }

  if (!hasStableHousing(state)) {
    cards.push({
      id: 'room-lead',
      title: 'Someone mentions a room lead',
      detail: 'It is not glamorous, but it could get you out of a rough setup if you want to chase it.',
      category: 'housing',
      tone: 'neutral',
      options: [
        {
          id: 'follow-room-lead',
          label: 'Follow it up',
          detail: 'Spend a little cash and see if it turns into something real.',
          cash: -15,
          stress: -2,
          reputation: 1,
          storyFlag: 'room-lead-open',
        },
        {
          id: 'ask-around',
          label: 'Ask around first',
          detail: 'Keep it social and low-cost for now.',
          reputation: 1,
          storyFlag: 'neighbor-network-open',
        },
        {
          id: 'ignore-room-lead',
          label: 'Ignore it',
          detail: 'Stick with what you know for another week.',
          stress: 2,
        },
      ],
    })
  }

  if (state.stress >= 58 && state.energy >= 24) {
    cards.push({
      id: 'extra-shift-request',
      title: 'A rough extra shift is on the table',
      detail: 'It pays, but it will make the week feel sharper.',
      category: 'work',
      tone: 'bad',
      options: [
        {
          id: 'take-extra-shift',
          label: 'Take it',
          detail: 'Take the money and absorb the hit.',
          cash: 85,
          stress: 6,
          energy: -7,
          reputation: 1,
        },
        {
          id: 'pass-extra-shift',
          label: 'Pass',
          detail: 'Protect your week instead of squeezing more out of it.',
          stress: -2,
        },
      ],
    })
  }

  if (state.bankAccount && state.watchlist.length > 0) {
    cards.push({
      id: 'market-whisper',
      title: 'You hear a market whisper',
      detail: 'Nothing certain, just the kind of chatter that can either sharpen your watchlist or waste your time.',
      category: 'market',
      tone: 'neutral',
      options: [
        {
          id: 'log-rumor',
          label: 'Log it and watch',
          detail: 'Treat it as research, not conviction.',
          knowledge: 1,
          watchlistSymbol: 'YIELD',
        },
        {
          id: 'call-broker',
          label: 'Call your broker contact',
          detail: 'See if there is anything real behind it.',
          reputation: 1,
          contactId: 'broker',
        },
        {
          id: 'ignore-rumor',
          label: 'Ignore it',
          detail: 'Keep your attention for cleaner decisions.',
          stress: -1,
        },
      ],
    })
  }

  if (state.businesses.length > 0) {
    cards.push({
      id: 'supplier-call',
      title: 'A supplier wants an answer',
      detail: 'You can keep the relationship warm by paying early, or squeeze your cash a little harder.',
      category: 'business',
      tone: 'neutral',
      options: [
        {
          id: 'pay-early',
          label: 'Pay early',
          detail: 'Spend now and buy yourself some trust.',
          cash: -60,
          reputation: 1,
          bankTrust: 1,
        },
        {
          id: 'stretch-it',
          label: 'Stretch it',
          detail: 'Keep the money, but people will feel it.',
          cash: 30,
          stress: 2,
          reputation: -1,
        },
      ],
    })
  }

  if (state.properties.some((property) => property.rented)) {
    cards.push({
      id: 'tenant-text',
      title: 'A tenant sends a text',
      detail: 'It is a small issue now. If you deal with it early, it stays small.',
      category: 'property',
      tone: 'neutral',
      options: [
        {
          id: 'handle-properly',
          label: 'Handle it properly',
          detail: 'Spend a little and keep the relationship smooth.',
          cash: -75,
          reputation: 1,
          storyFlag: 'tenant-relief-open',
        },
        {
          id: 'patch-it',
          label: 'Patch it',
          detail: 'Cheaper today, a little noisier emotionally.',
          cash: -35,
          stress: 2,
        },
      ],
    })
  }

  return cards.slice(0, 2)
}
