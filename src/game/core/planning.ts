import { GIGS, SIDE_JOB_MAP } from '../../features/career/data'
import { BUSINESS_MAP } from '../../features/business/data'
import { PROPERTY_MAP } from '../../features/property/data'
import { PERSONAL_ACTION_MAP } from '../../features/personal/data'
import type { GameState, PlannedWeekAction, WeekEventCard } from './types'
import { canRunGig, canTakeSideJob, getRenovationCost, getTradingFee, hasStableHousing } from './utils'

function addIf<T>(items: T[], condition: unknown, value: T) {
  if (condition) items.push(value)
}

export function getWeekPlanOptions(state: GameState): PlannedWeekAction[] {
  const options: PlannedWeekAction[] = []
  const starterSideJob = SIDE_JOB_MAP['delivery-route']
  const bestGig = GIGS.filter((gig) => canRunGig(state, gig)).sort((left, right) => right.payout - left.payout)[0]
  const affordableStarterEtf = ['CITY', 'YIELD']
    .map((symbol) => state.market.find((stock) => stock.symbol === symbol))
    .find((stock) => stock && state.cash >= stock.price + getTradingFee(state))
  const actionableOpportunity = state.opportunities.find((opportunity) => !opportunity.cashCost || state.cash >= opportunity.cashCost)
  const repairTarget = state.properties
    .filter((property) => property.condition < 92)
    .slice()
    .sort((left, right) => left.condition - right.condition)[0]
  const businessTarget = state.businesses
    .filter((business) => business.active)
    .slice()
    .sort((left, right) => left.condition - right.condition)[0]

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

  addIf(
    options,
    state.educationEnrollment,
    {
      id: 'course-catchup',
      kind: 'growth',
      label: 'Course catch-up',
      detail: 'Use a quieter day to stay on top of the program you already committed to.',
      sourceRef: state.educationEnrollment?.programId,
      actionCost: 1,
      preview: 'Knowledge up and the program feels less heavy next week.',
    },
  )

  options.push({
    id: 'network-round',
    kind: 'growth',
    label: 'Reach out',
    detail: 'Spend a day on messages, favors, and small follow-ups that keep people warm.',
    actionCost: 1,
    preview: 'Reputation up, one contact gets closer, and a new lead might appear.',
  })

  addIf(
    options,
    state.bankAccount || state.cash >= 25,
    {
      id: 'bank-admin',
      kind: 'money',
      label: state.bankAccount ? 'Money admin' : 'Open your account',
      detail: state.bankAccount
        ? 'Tidy up the money side of your week, move some cash, and keep the basics in order.'
        : 'Use the day to stop living in pure cash and get your banking set up.',
      actionCost: 1,
      preview: state.bankAccount ? 'A calmer, cleaner money week.' : 'Costs cash now, makes the next weeks smoother.',
      oncePerWeek: true,
    },
  )

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
    affordableStarterEtf,
    {
      id: 'starter-etf-buy',
      kind: 'money',
      label: `Buy 1 share of ${affordableStarterEtf?.symbol}`,
      detail: `${affordableStarterEtf?.name} is a calmer first market step than trying to guess the wildest single-name move.`,
      sourceRef: affordableStarterEtf?.symbol,
      actionCost: 1,
      preview: `A real market position using ${affordableStarterEtf?.symbol}.`,
    },
  )

  addIf(
    options,
    actionableOpportunity,
    {
      id: 'follow-live-lead',
      kind: 'money',
      label: `Follow ${actionableOpportunity?.title}`,
      detail: actionableOpportunity?.detail ?? 'Use a day to push a live lead forward while it is still warm.',
      sourceRef: actionableOpportunity?.id,
      actionCost: 1,
      preview: 'This can turn a loose lead into something more concrete.',
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
    repairTarget && state.cash >= getRenovationCost(state),
    {
      id: 'property-tune-up',
      kind: 'money',
      label: `Fix up ${PROPERTY_MAP[repairTarget?.templateId ?? 'parking-space'].title}`,
      detail: 'Use an open day to keep your worst property from quietly becoming a bigger problem.',
      sourceRef: repairTarget?.uid,
      actionCost: 1,
      preview: 'Condition up now, fewer ugly surprises later.',
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

  addIf(
    options,
    businessTarget && state.cash >= 260,
    {
      id: 'business-tune-up',
      kind: 'money',
      label: `Tune up ${BUSINESS_MAP[businessTarget?.templateId ?? 'resale-cart'].title}`,
      detail: 'Use a day to tighten operations before small issues turn into a bad month.',
      sourceRef: businessTarget?.uid,
      actionCost: 1,
      preview: 'Condition up, operations steadier, and the next month should feel less noisy.',
    },
  )

  return options
}

export function getWeekFollowUpEventCards(actionId: string): WeekEventCard[] {
  if (actionId === 'focus-shift') {
    return [
      {
        id: 'manager-nod',
        title: 'Your supervisor notices the extra effort',
        detail: 'It is not a promotion, but you did make a better impression than usual.',
        category: 'work',
        tone: 'good',
        options: [
          {
            id: 'bank-the-goodwill',
            label: 'Bank the goodwill',
            detail: 'Let it sit and take the better standing.',
            reputation: 1,
            bankTrust: 1,
          },
          {
            id: 'ask-for-more-hours',
            label: 'Ask for more hours',
            detail: 'Push the advantage a little harder while you have it.',
            cash: 45,
            stress: 2,
            reputation: 1,
          },
        ],
      },
    ]
  }

  if (actionId === 'network-round') {
    return [
      {
        id: 'recruiter-call-back',
        title: 'A recruiter actually calls back',
        detail: 'The message thread turned into something more real than you expected.',
        category: 'social',
        tone: 'good',
        options: [
          {
            id: 'hear-them-out',
            label: 'Hear them out',
            detail: 'Take the conversation and keep the relationship warm.',
            reputation: 1,
            contactId: 'recruiter',
          },
          {
            id: 'keep-it-light',
            label: 'Keep it light',
            detail: 'Stay friendly without turning it into work right now.',
            stress: -2,
          },
        ],
      },
    ]
  }

  if (actionId === 'market-research' || actionId === 'starter-etf-buy') {
    return [
      {
        id: 'watchlist-flash',
        title: 'One of your market names moves hard',
        detail: 'The tape suddenly looks more alive now that you are actually watching it.',
        category: 'market',
        tone: 'neutral',
        options: [
          {
            id: 'journal-it',
            label: 'Write it down',
            detail: 'Treat it like information, not a dare.',
            knowledge: 1,
          },
          {
            id: 'ping-broker',
            label: 'Ping your broker contact',
            detail: 'Ask whether there is anything real under the move.',
            contactId: 'broker',
            reputation: 1,
          },
          {
            id: 'leave-it',
            label: 'Leave it alone',
            detail: 'You do not need to react to every move on the board.',
            stress: -1,
          },
        ],
      },
    ]
  }

  if (actionId === 'property-scout' || actionId === 'property-tune-up') {
    return [
      {
        id: 'broker-whisper',
        title: 'A broker sends you a quiet note',
        detail: 'A small owner wants out and the deal might not stay private for long.',
        category: 'property',
        tone: 'neutral',
        options: [
          {
            id: 'ask-for-docs',
            label: 'Ask for the docs',
            detail: 'Pay a little for the paperwork and stay close to the lead.',
            cash: -20,
            reputation: 1,
            contactId: 'broker',
            storyFlag: 'room-lead-open',
          },
          {
            id: 'keep-the-number',
            label: 'Keep the number',
            detail: 'Stay warm without spending right now.',
            reputation: 1,
          },
        ],
      },
    ]
  }

  if (actionId === 'business-sketch' || actionId === 'business-tune-up') {
    return [
      {
        id: 'supplier-intro',
        title: 'Someone offers a useful supplier intro',
        detail: 'It is the kind of small break that only matters if you follow it up.',
        category: 'business',
        tone: 'good',
        options: [
          {
            id: 'take-the-intro',
            label: 'Take the intro',
            detail: 'Meet them and see what kind of lane it opens.',
            reputation: 1,
            contactId: 'contractor',
          },
          {
            id: 'wait-on-it',
            label: 'Wait on it',
            detail: 'Keep your focus where it already is this week.',
            stress: -1,
          },
        ],
      },
    ]
  }

  if (actionId === 'study-block' || actionId === 'course-catchup') {
    return [
      {
        id: 'study-nudge',
        title: 'You find a cleaner way to study',
        detail: 'A small routine tweak could make the whole learning path feel less punishing.',
        category: 'social',
        tone: 'neutral',
        options: [
          {
            id: 'keep-the-routine',
            label: 'Keep the routine',
            detail: 'Stay steady and keep building.',
            knowledge: 1,
            stress: 1,
          },
          {
            id: 'take-the-easier-night',
            label: 'Take the easier night',
            detail: 'Protect your body and let the pace breathe a bit.',
            stress: -2,
            energy: 1,
          },
        ],
      },
    ]
  }

  return []
}

export function mergeWeekEventCards(existing: WeekEventCard[], additions: WeekEventCard[]) {
  const seen = new Set<string>()
  return [...existing, ...additions].filter((card) => {
    if (seen.has(card.id)) return false
    seen.add(card.id)
    return true
  })
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
