import { JOBS } from '../../features/career/data'
import { CONTACT_MAP } from '../../features/world/data'
import type { GameState } from './types'
import { canOpenCreditCard, getComplianceRisk, getCreditUtilization, getDebtService, getNetWorth, getPassiveIncomePreview, getWeeklyPassiveIncomePreview, getWeeklyLivingCost, hasCertification, hasStableHousing, hasUpgrade, toWeeklyAmount, WEEKS_PER_MONTH } from './utils'

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
    { label: 'Reach positive weekly runway', complete: getWeeklyRunway(state) >= 0 },
    { label: 'Own your first cashflow asset', complete: state.properties.some((property) => property.rented) || state.businesses.length > 0 || passiveIncome > 0 },
    { label: 'Build a $500 emergency buffer', complete: state.cash + state.savingsBalance >= 500 },
    { label: 'Build a $50k empire', complete: getNetWorth(state) >= 50000 },
  ]
}

export function getTips(state: GameState) {
  const tips: string[] = []
  if (state.month <= 3) tips.push('The first stretch is survival-heavy. Protect energy and cash first, then reach for leverage.')
  if (!state.bankAccount) tips.push('Open a bank account early. The whole game stays possible without it, but fees and loan terms are much worse.')
  if (state.actionPoints > 0 && state.stress >= 62 && state.personalActionsUsedThisWeek.length === 0) tips.push('You still have open days this week. Use Personal recovery before stress turns into a more expensive spiral.')
  if (state.actionPoints > 0 && state.health < 45 && state.cash <= 20) tips.push('Cheap Personal actions are a valid stabilizer. A free reset week is better than forcing another bad gig while exhausted.')
  if (!state.educationEnrollment && state.bankAccount && state.reputation >= 1 && state.knowledge < 4) tips.push('Education is now a real long-term system. A slower financed program can be cheaper than brute-forcing every credential in cash.')
  if (state.educationEnrollment) tips.push('An education program is active. It will cut into runway for a few months, but it compounds job access and knowledge once completed.')
  if (state.sideJobIds.length === 0 && state.week <= 8) tips.push('Take a recurring side job once your weekly rhythm can handle it. It is steadier than living entirely off one-off gigs.')
  if (state.sideJobIds.length > 0 && state.energy < 35) tips.push('Your weekly side-work load may be too high for your current recovery. Dropping one commitment for a week can be the right move.')
  if (canOpenCreditCard(state)) tips.push('Your bank profile is finally good enough for a starter credit card. Use it as a buffer, not as permanent income.')
  if (getCreditUtilization(state) >= 0.6) tips.push('Credit-card utilization is elevated. Pay it down before your score and future loan terms get worse.')
  if (!hasStableHousing(state)) tips.push('Stable housing is not a hard gate, but shelter-level living is burning energy and job income every month.')
  if (state.transportTier === 'foot') tips.push('A bike or scooter upgrade is not cosmetic. Early transport reliability directly protects income and energy.')
  if (state.foodTier === 'skip-meals') tips.push('Skipped meals are cheap, but they now feed directly into harsher early-life event rolls and lower recovery.')
  if (state.storyFlags.includes('room-lead-open') || state.storyFlags.includes('transport-deal-open') || state.storyFlags.includes('neighbor-network-open')) tips.push('A survival story lead is live. Check the Network panel before ending the month and letting it sit there.')
  if (!hasCertification(state, 'sales-course')) tips.push('Use the cheapest gigs first and buy earning power. Sales Course is still the first clean jump.')
  if (state.watchlist.length === 0) tips.push('Start a watchlist. The market is easier to read when you track a few names instead of staring at every ticker equally.')
  if (!state.market.some((stock) => stock.assetType === 'etf' && state.holdings[stock.symbol])) tips.push('ETFs are now in the market. They are the cleanest bridge between holding cash and taking single-name earnings risk.')
  if (state.properties.length === 0) tips.push('Property is technically open, but the first good timing window usually comes after you stop living month to month.')
  if (state.debt <= 0 && state.cash + state.savingsBalance < 500) tips.push('You are debt-free at the start, but still fragile. Treat the first $500 cash buffer like your real opening milestone.')
  if (state.debt > 3000) tips.push('High debt compounds against you every month. Chip it down when a good month lands.')
  if (state.taxDue > 1500) tips.push('Your tax bill is stacking up. Start paying it down before filing month forces expensive borrowing.')
  if (getComplianceRisk(state) >= 55) tips.push('Compliance risk is elevated. One review cycle is cheaper than a fine or reputation hit.')
  if (state.opportunities.some((opportunity) => opportunity.cashCost && opportunity.cashCost > 0)) tips.push('A premium opportunity is live. Protect some liquidity if you want to capture swing deals instead of watching them expire.')
  if (state.economyPhase === 'recession') tips.push('Recession months reward cash buffers and punish forced selling. Tighten up before expanding.')
  if (state.baseRate >= 5.8) tips.push('Rates are tight. Equity-heavy growth is safer than leaning on fresh debt right now.')
  if (state.housingDemand >= 6) tips.push('Housing demand is hot. A renovated rental can compound faster than another speculative trade.')
  if (state.businesses.length === 0 && state.cash > 12000 && state.reputation >= 6) tips.push('You now have the profile to open a real business. It is the next best diversification step after your first steady assets.')
  if (state.businesses.some((business) => business.monthsOperating >= 1) && !state.debtAccounts.some((account) => account.kind === 'business-loan')) tips.push('A seasoned business can now support its own loan. That is better leverage than funding every expansion from personal cash.')
  if (state.businesses.some((business) => business.active && business.condition < 45)) tips.push('One of your businesses is deteriorating. Maintenance is cheaper than a long operational slump.')
  if (state.properties.some((property) => property.rented && property.missedPayments > 0)) tips.push('One of your tenants is already missing rent. Reset that unit before arrears cascade into repairs and vacancy.')
  if (!hasUpgrade(state, 'tenant-crm') && state.properties.length > 0) tips.push('Tenant CRM is one of the best upgrades once you have rent coming in.')
  if (state.stress > 65) tips.push('Stress is cutting into your recovery. Use the Personal tab or improve your baseline lifestyle before the spiral gets expensive.')
  if (state.health < 40) tips.push('Low health will start hurting performance. Protect a little cash for recovery.')
  if (tips.length < 3) tips.push('Use volatility to your advantage: stable dividend names fund riskier stock bets.')
  return tips.slice(0, 4)
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
