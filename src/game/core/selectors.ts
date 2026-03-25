import { JOBS } from '../../features/career/data'
import { CONTACT_MAP } from '../../features/world/data'
import type { GameState } from './types'
import { getComplianceRisk, getDebtService, getLivingCost, getNetWorth, getPassiveIncomePreview, hasCertification, hasStableHousing, hasUpgrade } from './utils'

export function getCurrentJob(state: GameState) {
  return JOBS.find((job) => job.id === state.jobId) ?? JOBS[0]
}

export function getMonthlyRunway(state: GameState) {
  const currentJob = getCurrentJob(state)
  const livingCost = getLivingCost(state)
  const debtService = getDebtService(state)
  const passiveIncome = getPassiveIncomePreview(state)
  const healthPenalty = state.health < 35 ? 0.88 : 1
  const energyPenalty = state.energy < 25 ? 0.92 : 1
  const stabilityPenalty = hasStableHousing(state) ? 1 : 0.82
  const bankingPenalty = state.bankAccount ? 1 : 0.95
  const macroSalaryMultiplier = Math.max(0.72, Math.min(1.12, 1.04 - state.unemployment / 18 + state.marketSentiment / 60))
  const estimatedSalary = Math.round(currentJob.salary * healthPenalty * energyPenalty * stabilityPenalty * bankingPenalty * macroSalaryMultiplier)
  return estimatedSalary + passiveIncome - livingCost - debtService
}

export function getMilestones(state: GameState) {
  const passiveIncome = getPassiveIncomePreview(state)
  return [
    { label: 'Secure stable housing', complete: hasStableHousing(state) },
    { label: 'Open a bank account', complete: state.bankAccount },
    { label: 'Reach positive monthly runway', complete: getMonthlyRunway(state) >= 0 },
    { label: 'Own your first cashflow asset', complete: state.properties.some((property) => property.rented) || state.businesses.length > 0 || passiveIncome > 0 },
    { label: 'Become debt free', complete: state.debt <= 0 },
    { label: 'Build a $50k empire', complete: getNetWorth(state) >= 50000 },
  ]
}

export function getTips(state: GameState) {
  const tips: string[] = []
  if (state.month <= 3) tips.push('The first few months are survival-heavy. Protect energy and cash first, then reach for leverage.')
  if (!state.bankAccount) tips.push('Open a bank account early. The whole game stays possible without it, but fees and loan terms are much worse.')
  if (!state.educationEnrollment && state.bankAccount && state.reputation >= 1 && state.knowledge < 4) tips.push('Education is now a real long-term system. A slower financed program can be cheaper than brute-forcing every credential in cash.')
  if (state.educationEnrollment) tips.push('An education program is active. It will cut into runway for a few months, but it compounds job access and knowledge once completed.')
  if (!hasStableHousing(state)) tips.push('Stable housing is not a hard gate, but shelter-level living is burning energy and job income every month.')
  if (state.transportTier === 'foot') tips.push('A bike or scooter upgrade is not cosmetic. Early transport reliability directly protects income and energy.')
  if (state.foodTier === 'skip-meals') tips.push('Skipped meals are cheap, but they now feed directly into harsher early-life event rolls and lower recovery.')
  if (state.storyFlags.includes('room-lead-open') || state.storyFlags.includes('transport-deal-open') || state.storyFlags.includes('neighbor-network-open')) tips.push('A survival story lead is live. Check the Network panel before ending the month and letting it sit there.')
  if (!hasCertification(state, 'sales-course')) tips.push('Use the cheapest gigs first and buy earning power. Sales Course is still the first clean jump.')
  if (state.properties.length === 0) tips.push('Property is technically open, but the first good timing window usually comes after you stop living month to month.')
  if (state.debt > 3000) tips.push('High debt compounds against you every month. Chip it down when a good month lands.')
  if (state.taxDue > 1500) tips.push('Your tax bill is stacking up. Start paying it down before filing month forces expensive borrowing.')
  if (getComplianceRisk(state) >= 55) tips.push('Compliance risk is elevated. One review cycle is cheaper than a fine or reputation hit.')
  if (state.opportunities.some((opportunity) => opportunity.cashCost && opportunity.cashCost > 0)) tips.push('A premium opportunity is live. Protect some liquidity if you want to capture swing deals instead of watching them expire.')
  if (state.economyPhase === 'recession') tips.push('Recession months reward cash buffers and punish forced selling. Tighten up before expanding.')
  if (state.baseRate >= 5.8) tips.push('Rates are tight. Equity-heavy growth is safer than leaning on fresh debt right now.')
  if (state.housingDemand >= 6) tips.push('Housing demand is hot. A renovated rental can compound faster than another speculative trade.')
  if (state.businesses.length === 0 && state.cash > 12000 && state.reputation >= 6) tips.push('You now have the profile to open a real business. It is the next best diversification step after your first steady assets.')
  if (state.businesses.some((business) => business.active && business.condition < 45)) tips.push('One of your businesses is deteriorating. Maintenance is cheaper than a long operational slump.')
  if (state.properties.some((property) => property.rented && property.missedPayments > 0)) tips.push('One of your tenants is already missing rent. Reset that unit before arrears cascade into repairs and vacancy.')
  if (!hasUpgrade(state, 'tenant-crm') && state.properties.length > 0) tips.push('Tenant CRM is one of the best upgrades once you have rent coming in.')
  if (state.stress > 65) tips.push('Stress is cutting into your recovery. Slow down for a month before the spiral gets expensive.')
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
