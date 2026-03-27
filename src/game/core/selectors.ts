import { JOBS } from '../../features/career/data'
import { CONTACT_MAP } from '../../features/world/data'
import type { GameState } from './types'
import { canOpenCreditCard, getComplianceRisk, getCreditUtilization, getDebtService, getNetWorth, getPassiveIncomePreview, getWeeklyPassiveIncomePreview, getWeeklyLivingCost, hasStableHousing, toWeeklyAmount, WEEKS_PER_MONTH } from './utils'

export type RouteOption = {
  id: string
  title: string
  reason: string
  firstMove: string
  view: 'career' | 'education' | 'lifestyle' | 'personal' | 'banking' | 'market' | 'property' | 'business' | 'network'
}

export function getCurrentJob(state: GameState) {
  return JOBS.find((job) => job.id === state.jobId) ?? JOBS[0]
}

export function getWeeklyRunway(state: GameState) {
  const currentJob = getCurrentJob(state)
  const livingCost = getWeeklyLivingCost(state)
  const debtService = toWeeklyAmount(getDebtService(state))
  const passiveIncome = getWeeklyPassiveIncomePreview(state)
  const healthPenalty = state.health < 25 ? 0.94 : 1
  const energyPenalty = state.energy < 18 ? 0.96 : 1
  const stabilityPenalty = hasStableHousing(state) ? 1 : 0.92
  const bankingPenalty = state.bankAccount ? 1 : 0.97
  const macroSalaryMultiplier = Math.max(0.72, Math.min(1.12, 1.04 - state.unemployment / 18 + state.marketSentiment / 60))
  const estimatedSalary = toWeeklyAmount(Math.round(currentJob.salary * healthPenalty * energyPenalty * stabilityPenalty * bankingPenalty * macroSalaryMultiplier))
  return estimatedSalary + passiveIncome - livingCost - debtService
}

export function getMonthlyRunway(state: GameState) {
  return getWeeklyRunway(state) * WEEKS_PER_MONTH
}

export function getMilestones(state: GameState) {
  const passiveIncome = getPassiveIncomePreview(state)
  return [
    { label: 'Secure stable housing', complete: hasStableHousing(state) },
    { label: 'Open a bank account', complete: state.bankAccount },
    { label: 'Get the week paying for itself', complete: getWeeklyRunway(state) >= 0 },
    { label: 'Own something that pays you back', complete: state.properties.some((property) => property.rented) || state.businesses.length > 0 || passiveIncome > 0 },
    { label: 'Build a $500 emergency buffer', complete: state.cash + state.savingsBalance >= 500 },
    { label: 'Reach $50k net worth', complete: getNetWorth(state) >= 50000 },
  ]
}

export function getTips(state: GameState) {
  const tips: string[] = []
  const buffer = state.cash + state.savingsBalance
  if (!state.bankAccount && state.cash < 25) tips.push('You are still handling life in cash. Getting banked would make saving and borrowing a lot less awkward.')
  if (!state.bankAccount && state.cash >= 25) tips.push('You can open an account now if you want the next few weeks to feel steadier.')
  if (state.actionPoints > 0 && state.stress >= 62 && state.personalActionsUsedThisWeek.length === 0) tips.push('Stress is climbing. One quiet day would probably do more good than another forced push.')
  if (state.actionPoints > 0 && state.health < 45 && state.cash <= 20) tips.push('A cheap recovery week is still a solid choice when cash is tight and your body is lagging.')
  if (!state.educationEnrollment && state.bankAccount && state.reputation >= 1 && state.knowledge < 4) tips.push('Study is a real option now. It is slower than hustle, but it opens cleaner work.')
  if (state.educationEnrollment) tips.push('Your program is doing its job slowly. The cost lands now, the payoff lands later.')
  if (state.sideJobIds.length === 0 && state.week <= 8) tips.push('If you want the week to feel less fragile, steady side work is still the easiest first move.')
  if (state.sideJobIds.length > 0 && state.energy < 35) tips.push('Your current side-work load may be a bit heavier than your energy can really support.')
  if (canOpenCreditCard(state)) tips.push('The bank would approve you for a starter card now. It works best as breathing room, not income.')
  if (getCreditUtilization(state) >= 0.6) tips.push('Your card balance is getting high enough to lean on your credit score.')
  if (!hasStableHousing(state)) tips.push('Where you live is still making the rest of the week harder than it needs to be.')
  if (state.transportTier === 'foot') tips.push('Even a small transport upgrade would make work and recovery easier.')
  if (state.storyFlags.includes('room-lead-open') || state.storyFlags.includes('transport-deal-open') || state.storyFlags.includes('neighbor-network-open')) tips.push('A local lead is still sitting there if you want to use it.')
  if (state.watchlist.length === 0) tips.push('The market gets easier to read once you narrow it down to a few names.')
  if (state.bankAccount && buffer >= 150 && !state.market.some((stock) => stock.assetType === 'etf' && state.holdings[stock.symbol])) tips.push('If you want to start investing, the ETFs are the calmer first step.')
  if (buffer >= 600 && state.reputation >= 1 && state.properties.length === 0) tips.push('The smaller property listings are starting to make sense if you want an asset path.')
  if (buffer >= 1500 && state.reputation >= 1 && state.businesses.length === 0) tips.push('A tiny owner-run business is starting to come into range if that path interests you.')
  if (state.debt <= 0 && buffer < 500) tips.push('You started clean, but not comfortable. The first real cushion still matters.')
  if (state.debt > 3000) tips.push('Debt is getting heavy enough to shape the month by itself.')
  if (state.taxDue > 1500) tips.push('Your tax bill is large enough that it cannot stay in the background anymore.')
  if (getComplianceRisk(state) >= 55) tips.push('Paperwork risk is getting high enough to turn expensive.')
  if (state.economyPhase === 'recession') tips.push('The wider economy is tightening up, so buffers matter more than usual.')
  if (state.businesses.length > 0 && state.businesses.some((business) => business.active && business.condition < 45)) tips.push('One of your businesses is slipping and will need attention soon.')
  if (state.properties.some((property) => property.rented && property.missedPayments > 0)) tips.push('One of your rentals is wobbling and could turn into a vacancy problem.')
  if (state.stress > 65) tips.push('This week will probably go better if you make room to calm down a little.')
  if (state.health < 40) tips.push('Low health is starting to drag on everything else.')
  if (tips.length < 3) tips.push('You do not need one perfect plan. A small step that makes next week easier still counts.')
  return tips.slice(0, 4)
}

export function getRouteOptions(state: GameState): RouteOption[] {
  const weeklyRunway = getWeeklyRunway(state)
  const buffer = state.cash + state.savingsBalance
  const routes: Array<RouteOption & { score: number }> = []

  routes.push({
    id: 'stabilize',
    title: 'Steady your life',
    reason:
      !hasStableHousing(state)
        ? 'Your living setup is still making the rest of the game harder.'
        : state.stress >= 62
          ? 'You are carrying enough stress that a quieter week would actually help.'
          : !state.bankAccount
            ? 'You are still living with cash-only friction.'
            : 'A calmer base would make your next move safer.',
    firstMove:
      !state.bankAccount && state.cash >= 25
        ? 'Open a bank account or spend a week getting your footing back.'
        : !hasStableHousing(state)
          ? 'Put some attention on housing, recovery, or transport.'
          : 'Use one open day to make the next week easier on yourself.',
    view: !state.bankAccount && state.cash >= 25 ? 'banking' : state.stress >= 62 ? 'personal' : 'lifestyle',
    score: (!state.bankAccount ? 4 : 0) + (!hasStableHousing(state) ? 5 : 0) + (state.stress >= 62 ? 4 : 0) + (weeklyRunway < 20 ? 2 : 0),
  })

  routes.push({
    id: 'income',
    title: 'Build income',
    reason:
      state.sideJobIds.length === 0
        ? 'Your income is still coming from too few places.'
        : 'A steadier work setup would make the rest of your choices easier.',
    firstMove:
      state.sideJobIds.length === 0
        ? 'Add side work or take the best-paying gig you can reach this week.'
        : 'Push toward a cleaner job lane or trim weak work for stronger pay.',
    view: 'career',
    score: (weeklyRunway < 25 ? 5 : 0) + (state.sideJobIds.length === 0 ? 4 : 0) + (state.actionPoints > 0 ? 1 : 0),
  })

  routes.push({
    id: 'study',
    title: 'Study and qualify',
    reason:
      state.educationEnrollment
        ? 'You already have study underway, so staying with it can unlock better work later.'
        : 'Your knowledge and reputation are high enough that study could start paying off soon.',
    firstMove:
      state.educationEnrollment
        ? 'Keep your runway steady and let the program finish.'
        : 'Look at programs that fit your budget and current standing.',
    view: 'education',
    score: (state.bankAccount ? 2 : 0) + (!state.educationEnrollment ? 3 : 1) + (state.knowledge < 6 ? 3 : 0) + (state.reputation >= 1 ? 2 : 0) + (state.stress < 72 ? 1 : 0),
  })

  routes.push({
    id: 'market',
    title: 'Start investing',
    reason:
      buffer >= 200
        ? 'You finally have enough room to start building a position instead of only just getting through the week.'
        : 'The market is there if you want it, but it gets easier once you have a little breathing room.',
    firstMove:
      state.watchlist.length === 0
        ? 'Build a watchlist and start with the calmer ETF names.'
        : 'Use the watchlist and start small if you want market exposure.',
    view: 'market',
    score: (state.bankAccount ? 2 : 0) + (buffer >= 150 ? 4 : 0) + (state.watchlist.length > 0 ? 2 : 0) + (weeklyRunway >= 0 ? 1 : 0),
  })

  routes.push({
    id: 'property',
    title: 'Try a first property',
    reason:
      state.properties.length > 0
        ? 'You already have one foot in property, so the next step may be improving what you own.'
        : 'Property is starting to look reachable if you want a slower asset path.',
    firstMove:
      state.properties.length > 0
        ? 'Check listings, repairs, or financing while your base is steady.'
        : 'Watch the smaller listings first. A parking space or storage unit is enough to get started.',
    view: 'property',
    score: (hasStableHousing(state) ? 2 : 0) + (state.bankAccount ? 2 : 0) + (buffer >= 500 ? 3 : 0) + (state.reputation >= 1 ? 2 : 0) + (weeklyRunway >= 0 ? 1 : 0),
  })

  routes.push({
    id: 'business',
    title: 'Start something of your own',
    reason:
      state.businesses.length > 0
        ? 'Your business lane is already open, so the next choice is how much attention it deserves.'
        : 'You are getting close to being able to support something of your own.',
    firstMove:
      state.businesses.length > 0
        ? 'Check financing, condition, and whether the business is actually helping your month.'
        : 'Look at the solo operator options first. The smallest business is still real progress.',
    view: 'business',
    score: (state.reputation >= 1 ? 3 : 0) + (buffer >= 1400 ? 4 : 0) + (state.bankAccount ? 1 : 0) + (weeklyRunway >= 0 ? 1 : 0),
  })

  return routes
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
    .map((route) => ({
      id: route.id,
      title: route.title,
      reason: route.reason,
      firstMove: route.firstMove,
      view: route.view,
    }))
}

export function getContactSummaries(state: GameState) {
  return state.contacts.map((contactState) => ({
    ...contactState,
    ...CONTACT_MAP[contactState.contactId],
  }))
}

export function getRivalSummaries(state: GameState) {
  return state.rivals.slice().sort((a, b) => b.rivalry - a.rivalry)
}

export function getRecentHistory(state: GameState) {
  return state.history.slice().sort((a, b) => b.month - a.month).slice(0, 8)
}

export function getLatestSnapshot(state: GameState) {
  return state.history[state.history.length - 1] ?? null
}

export function getConditionTone(value: number, inverse = false) {
  if (inverse) {
    if (value >= 70) return 'negative'
    if (value <= 35) return 'positive'
    return undefined
  }

  if (value >= 70) return 'positive'
  if (value <= 35) return 'negative'
  return undefined
}
