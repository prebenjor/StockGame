import { BOND_MAP } from '../../features/banking/data'
import { COURSE_MAP, SIDE_JOB_MAP } from '../../features/career/data'
import { EDUCATION_PROGRAM_MAP } from '../../features/education/data'
import { BUSINESS_MAP } from '../../features/business/data'
import { FOOD_OPTION_MAP, HOUSING_OPTION_MAP, TRANSPORT_OPTION_MAP, WELLNESS_OPTION_MAP } from '../../features/lifestyle/data'
import { PROPERTY_MAP, TENANT_PROFILE_MAP } from '../../features/property/data'
import { DISTRICT_MAP } from '../../features/world/data'
import type { BondHolding, BondTemplate, BusinessTemplate, GameState, Gig, Job, LifestyleCategory, MonthlyEvent, OwnedBusiness, OwnedProperty, PropertyTemplate, SideJob } from './types'

export const WEEKS_PER_MONTH = 4

export function roundPrice(value: number) {
  return Number(value.toFixed(2))
}

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min)
}

export function randomInt(min: number, max: number) {
  return Math.round(randomBetween(min, max))
}

export function randomItem<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)]
}

export function hasCertification(state: GameState, certificationId: string) {
  return state.certifications.includes(certificationId)
}

export function hasCompletedProgram(state: GameState, programId: string) {
  return state.completedEducationPrograms.includes(programId)
}

export function hasUpgrade(state: GameState, upgradeId: string) {
  return state.upgrades.includes(upgradeId)
}

export function ownsProperty(state: GameState) {
  return state.properties.length > 0
}

export function hasStableHousing(state: GameState) {
  return state.housingTier !== 'shelter'
}

export function getTradingFee(state: GameState) {
  if (!state.bankAccount) return hasStableHousing(state) ? 12 : 18
  if (hasUpgrade(state, 'broker-terminal')) return hasStableHousing(state) ? 2 : 4
  return hasStableHousing(state) ? 6 : 9
}

export function getSavingsRate(state: GameState) {
  const base = state.baseRate / 100
  const trustBoost = state.bankTrust >= 55 ? 0.003 : state.bankTrust >= 30 ? 0.0015 : 0
  return clamp(base * 0.35 + trustBoost, 0.004, 0.03)
}

export function getInterestRate(state: GameState) {
  const creditAdjustment = state.creditScore >= 760 ? -0.005 : state.creditScore >= 690 ? -0.002 : state.creditScore <= 560 ? 0.004 : 0
  const trustAdjustment = state.bankTrust >= 65 ? -0.001 : state.bankTrust <= 20 ? 0.001 : 0
  const baseRateAdjustment = state.baseRate / 100
  const bankingPenalty = state.bankAccount ? 0 : 0.004
  const housingPenalty = hasStableHousing(state) ? 0 : 0.003
  return clamp(0.006 + baseRateAdjustment + creditAdjustment + trustAdjustment + bankingPenalty + housingPenalty, 0.011, 0.038)
}

export function getBondYield(template: BondTemplate, state: GameState) {
  const base = state.baseRate / 100
  const recessionPenalty = state.economyPhase === 'recession' && template.risk === 'high-yield' ? 0.008 : 0
  const slowdownPenalty = state.economyPhase === 'slowdown' && template.risk === 'high-yield' ? 0.004 : 0
  return clamp(base + template.spread + recessionPenalty + slowdownPenalty, 0.01, 0.09)
}

export function getBondValue(holding: BondHolding, state: GameState) {
  const template = BOND_MAP[holding.templateId]
  const currentRate = getBondYield(template, state)
  const durationFactor = Math.max(0.12, holding.monthsRemaining / Math.max(1, template.termMonths))
  const markToMarket = 1 + (holding.purchaseRate - currentRate) * durationFactor * 6
  return Math.max(0, Math.round(holding.principal * markToMarket))
}

export function getDebtTotal(state: Pick<GameState, 'debtAccounts'>) {
  return Math.round(state.debtAccounts.reduce((total, account) => total + account.principal, 0))
}

export function getDebtService(state: Pick<GameState, 'debtAccounts'>) {
  return Math.round(
    state.debtAccounts.reduce((total, account) => {
      if ((account.deferMonthsRemaining ?? 0) > 0) return total
      if (account.kind === 'credit-card' && account.principal <= 0) return total
      return total + account.minimumPayment
    }, 0),
  )
}

export function toWeeklyAmount(monthlyAmount: number) {
  return Math.round(monthlyAmount / WEEKS_PER_MONTH)
}

export function getCreditCardAccount(state: Pick<GameState, 'debtAccounts'>) {
  return state.debtAccounts.find((account) => account.kind === 'credit-card') ?? null
}

export function getCreditUtilization(state: Pick<GameState, 'debtAccounts'>) {
  const account = getCreditCardAccount(state)
  if (!account?.creditLimit) return 0
  return clamp(account.principal / account.creditLimit, 0, 1.5)
}

export const STARTER_CARD_MIN_CREDIT_SCORE = 445

export function canOpenCreditCard(state: GameState) {
  return state.bankAccount && !getCreditCardAccount(state) && state.creditScore >= STARTER_CARD_MIN_CREDIT_SCORE && state.bankTrust >= 14
}

export function getTaxRate(state: GameState) {
  const baseRate = state.businesses.length > 0 || state.properties.length > 1 ? 0.22 : 0.18
  const complexityPenalty = Math.min(0.04, state.properties.length * 0.005 + state.businesses.length * 0.008)
  const financeEdge = hasCertification(state, 'finance-cert') ? -0.025 : 0
  return clamp(baseRate + complexityPenalty + financeEdge, 0.12, 0.3)
}

export function getComplianceRisk(state: GameState) {
  const scalePressure = state.properties.length * 4 + state.businesses.length * 7
  const missedRentPressure = state.properties.reduce((total, property) => total + property.missedPayments * 2, 0)
  const scoreOffset = (100 - state.complianceScore) * 0.45
  return clamp(Math.round(scalePressure + missedRentPressure + scoreOffset), 0, 100)
}

export function getLivingCost(state: GameState) {
  const reserveDiscount = hasUpgrade(state, 'emergency-fund') ? 70 : 0
  const inflation = Math.floor((state.month - 1) / 6) * 16
  const macroInflation = Math.round(state.inflation * 7)
  const lifestyleBase =
    HOUSING_OPTION_MAP[state.housingTier].monthlyCost +
    TRANSPORT_OPTION_MAP[state.transportTier].monthlyCost +
    FOOD_OPTION_MAP[state.foodTier].monthlyCost +
    WELLNESS_OPTION_MAP[state.wellnessTier].monthlyCost
  const unbankedPenalty = state.bankAccount ? 0 : 20
  return lifestyleBase + unbankedPenalty + inflation + macroInflation - reserveDiscount
}

export function getWeeklyLivingCost(state: GameState) {
  return toWeeklyAmount(getLivingCost(state))
}

export function getLifestyleSwitchCost(
  state: GameState,
  category: LifestyleCategory,
  tier: GameState['housingTier'] | GameState['transportTier'] | GameState['foodTier'] | GameState['wellnessTier'],
) {
  if (category === 'housing') {
    if (state.housingTier === tier) return 0
    return HOUSING_OPTION_MAP[tier as GameState['housingTier']].switchCost
  }
  if (category === 'transport') {
    if (state.transportTier === tier) return 0
    return TRANSPORT_OPTION_MAP[tier as GameState['transportTier']].switchCost
  }
  if (category === 'food') {
    if (state.foodTier === tier) return 0
    return FOOD_OPTION_MAP[tier as GameState['foodTier']].switchCost
  }
  if (state.wellnessTier === tier) return 0
  return WELLNESS_OPTION_MAP[tier as GameState['wellnessTier']].switchCost
}

export function getLifestyleConditionShift(state: GameState) {
  const housingShift =
    state.housingTier === 'shelter'
      ? { stress: 2, health: -1, energy: -1, reputation: -1 }
      : state.housingTier === 'shared'
        ? { stress: 1, health: 0, energy: 1, reputation: 0 }
        : state.housingTier === 'shared-plus'
          ? { stress: 0, health: 0, energy: 1, reputation: 1 }
        : state.housingTier === 'studio'
          ? { stress: -1, health: 1, energy: 2, reputation: 1 }
          : { stress: -2, health: 1, energy: 3, reputation: 2 }
  const transportShift =
    state.transportTier === 'foot'
      ? { stress: 1, health: 0, energy: -1, reputation: 0 }
      : state.transportTier === 'transit-pass'
        ? { stress: 0, health: 0, energy: 0, reputation: 0 }
      : state.transportTier === 'bike'
        ? { stress: 0, health: 0, energy: 1, reputation: 0 }
        : state.transportTier === 'scooter'
          ? { stress: -1, health: 0, energy: 1, reputation: 0 }
          : { stress: -1, health: 0, energy: 2, reputation: 1 }
  const foodShift =
    state.foodTier === 'skip-meals'
      ? { stress: 2, health: -1, energy: -1, reputation: 0 }
      : state.foodTier === 'cheap-eats'
        ? { stress: 1, health: 0, energy: 0, reputation: 0 }
        : state.foodTier === 'meal-prep'
          ? { stress: 0, health: 1, energy: 1, reputation: 0 }
        : state.foodTier === 'balanced'
          ? { stress: -1, health: 1, energy: 1, reputation: 0 }
          : { stress: -1, health: 2, energy: 2, reputation: 0 }
  const wellnessShift =
    state.wellnessTier === 'none'
      ? { stress: 1, health: 0, energy: 0, reputation: 0 }
      : state.wellnessTier === 'stretch'
        ? { stress: -1, health: 1, energy: 1, reputation: 0 }
        : state.wellnessTier === 'community-gym'
          ? { stress: -1, health: 1, energy: 1, reputation: 0 }
      : state.wellnessTier === 'gym'
          ? { stress: -1, health: 1, energy: 1, reputation: 0 }
          : { stress: -2, health: 1, energy: 2, reputation: 0 }

  return {
    stress: housingShift.stress + transportShift.stress + foodShift.stress + wellnessShift.stress,
    health: housingShift.health + transportShift.health + foodShift.health + wellnessShift.health,
    energy: housingShift.energy + transportShift.energy + foodShift.energy + wellnessShift.energy,
    reputation: housingShift.reputation + transportShift.reputation + foodShift.reputation + wellnessShift.reputation,
  }
}

export function getRentMultiplier(state: GameState, event?: MonthlyEvent) {
  return 1 + (event?.propertyRentBoost ?? 0) + state.housingDemand / 100 + (hasUpgrade(state, 'tenant-crm') ? 0.08 : 0)
}

export function getRenovationCost(state: GameState) {
  return hasUpgrade(state, 'toolkit') ? 260 : 380
}

export function getRenovationBoost(state: GameState) {
  return hasUpgrade(state, 'toolkit') ? 26 : 18
}

export function getDistrictState(state: GameState, districtId: string) {
  return state.districtStates.find((item) => item.districtId === districtId)
}

export function getDistrictMomentumMultiplier(state: GameState, districtId: string) {
  const districtState = getDistrictState(state, districtId)
  return 1 + (districtState?.momentum ?? 0) / 100
}

export function getPropertyAskingPrice(
  templateId: string,
  districtId: string,
  stateOrMomentum: GameState | number,
) {
  const template = PROPERTY_MAP[templateId]
  const district = DISTRICT_MAP[districtId]
  const momentumMultiplier =
    typeof stateOrMomentum === 'number'
      ? 1 + stateOrMomentum / 100
      : getDistrictMomentumMultiplier(stateOrMomentum, districtId)

  return Math.round(template.cost * district.costMultiplier * momentumMultiplier)
}

export function getPropertyRent(property: OwnedProperty, state: GameState, event?: MonthlyEvent) {
  const template = PROPERTY_MAP[property.templateId]
  const district = DISTRICT_MAP[property.districtId]
  const tenantModifier = property.tenantProfileId ? TENANT_PROFILE_MAP[property.tenantProfileId]?.rentModifier ?? 0 : 0
  return Math.round(
    template.baseRent *
      district.rentMultiplier *
      getDistrictMomentumMultiplier(state, property.districtId) *
      getRentMultiplier(state, event) *
      (1 + tenantModifier) *
      (property.condition / 100),
  )
}

export function getPropertyUpkeep(property: OwnedProperty, state: GameState) {
  const template = PROPERTY_MAP[property.templateId]
  const district = DISTRICT_MAP[property.districtId]
  const momentumPenalty = getDistrictState(state, property.districtId)?.momentum ?? 0
  return Math.round(template.upkeep * district.upkeepMultiplier * (momentumPenalty < 0 ? 1.04 : 1) * (1 + state.inflation / 100))
}

export function getPropertyValue(property: OwnedProperty, state: GameState) {
  const template = PROPERTY_MAP[property.templateId]
  const district = DISTRICT_MAP[property.districtId]
  const conditionBonus = property.condition / 100
  const crmBonus = hasUpgrade(state, 'tenant-crm') ? 0.03 : 0
  const momentumBonus = getDistrictMomentumMultiplier(state, property.districtId)
  const demandBonus = 1 + state.housingDemand / 120 - state.baseRate / 500
  return Math.round(template.cost * district.costMultiplier * momentumBonus * demandBonus * (0.72 + conditionBonus * 0.34 + crmBonus))
}

export function canBuyBusiness(state: GameState, business: BusinessTemplate) {
  return business.cost > 0 && state.reputation >= business.reputationRequired
}

export function getBusinessDebtBalance(state: Pick<GameState, 'debtAccounts'>, businessUid: string) {
  return Math.round(
    state.debtAccounts
      .filter((account) => account.kind === 'business-loan' && account.linkedBusinessUid === businessUid)
      .reduce((total, account) => total + account.principal, 0),
  )
}

export function canTakeBusinessLoan(state: GameState, business: OwnedBusiness) {
  if (!state.bankAccount || state.actionPoints <= 0 || state.creditScore < 520 || state.bankTrust < 12) return false
  if (getBusinessDebtBalance(state, business.uid) > 0) return false
  return business.condition >= 45 && business.monthsOperating >= 1
}

export function getBusinessMonthlyProfit(business: OwnedBusiness, state: GameState) {
  const template = BUSINESS_MAP[business.templateId]
  const district = DISTRICT_MAP[business.districtId]
  const momentumBonus = getDistrictMomentumMultiplier(state, business.districtId)
  const staffingBonus = 1 + business.staffing * 0.05
  const marketingBonus = 1 + business.marketing * 0.06
  const conditionBonus = 0.72 + business.condition / 100
  const macroRevenueBonus = 1 + state.marketSentiment / 90 + state.housingDemand / 140 - state.unemployment / 32
  const macroExpensePenalty = 1 + state.inflation / 80 + state.baseRate / 120
  const districtTilt = 1 + district.risk * 0.12
  const revenue = template.baseRevenue * momentumBonus * staffingBonus * marketingBonus * conditionBonus * macroRevenueBonus * districtTilt
  const expense = template.baseExpense * macroExpensePenalty * (1 + business.staffing * 0.04)
  return Math.round(revenue - expense)
}

export function getBusinessValue(business: OwnedBusiness, state: GameState) {
  const profit = Math.max(0, getBusinessMonthlyProfit(business, state))
  const conditionFactor = 0.65 + business.condition / 100
  const experienceFactor = 1 + Math.min(business.monthsOperating, 24) / 80
  return Math.round(business.purchasePrice * conditionFactor + profit * 10 * experienceFactor)
}

export function getAvailableEquity(property: OwnedProperty, state: GameState) {
  return Math.max(0, getPropertyValue(property, state) - property.mortgageBalance)
}

export function getNetWorth(state: GameState) {
  const stockValue = state.market.reduce((total, stock) => {
    const holding = state.holdings[stock.symbol]
    return total + (holding ? holding.shares * stock.price : 0)
  }, 0)

  const bondValue = state.bondHoldings.reduce((total, holding) => total + getBondValue(holding, state), 0)
  const propertyValue = state.properties.reduce((total, property) => total + getPropertyValue(property, state), 0)
  const businessValue = state.businesses.reduce((total, business) => total + getBusinessValue(business, state), 0)
  return state.cash + state.savingsBalance + stockValue + bondValue + propertyValue + businessValue - state.debt
}

export function getPassiveIncomePreview(state: GameState) {
  const rentIncome = state.properties.reduce((total, property) => {
    const income = property.rented ? getPropertyRent(property, state) : 0
    return total + income - getPropertyUpkeep(property, state)
  }, 0)

  const dividendMultiplier = hasUpgrade(state, 'broker-terminal') ? 1.25 : 1
  const dividends = state.market.reduce((total, stock) => {
    const holding = state.holdings[stock.symbol]
    return total + (holding ? holding.shares * stock.dividend * dividendMultiplier : 0)
  }, 0)

  const bondIncome = state.bondHoldings.reduce((total, holding) => total + holding.principal * holding.couponRate, 0)
  const savingsIncome = state.savingsBalance * getSavingsRate(state)
  const businessIncome = state.businesses.reduce((total, business) => total + (business.active ? getBusinessMonthlyProfit(business, state) : 0), 0)

  return Math.round(rentIncome + dividends + bondIncome + savingsIncome + businessIncome)
}

export function getWeeklyPassiveIncomePreview(state: GameState) {
  return toWeeklyAmount(getPassiveIncomePreview(state))
}

export function getMonthlyTaxEstimate(
  state: GameState,
  monthlyIncome = getPassiveIncomePreview(state),
  monthlySalary = 0,
) {
  const taxableBase = Math.max(0, monthlyIncome + monthlySalary - Math.round(state.debt * getInterestRate(state) * 0.35))
  return Math.round(taxableBase * getTaxRate(state))
}

export function getWeeklyTaxEstimate(
  state: GameState,
  weeklyIncome = getWeeklyPassiveIncomePreview(state),
  weeklySalary = 0,
) {
  return toWeeklyAmount(getMonthlyTaxEstimate(state, weeklyIncome * WEEKS_PER_MONTH, weeklySalary * WEEKS_PER_MONTH))
}

export function getLockedReason(
  reputationRequired: number,
  certifications: string[],
  state: GameState,
  needsProperty?: boolean,
  programRequirements: string[] = [],
) {
  const reasons: string[] = []

  if (state.reputation < reputationRequired) reasons.push(`Need ${reputationRequired} reputation`)
  certifications.forEach((certificationId) => {
    if (!hasCertification(state, certificationId)) reasons.push(`Need ${COURSE_MAP[certificationId].title}`)
  })
  programRequirements.forEach((programId) => {
    if (!hasCompletedProgram(state, programId)) reasons.push(`Need ${EDUCATION_PROGRAM_MAP[programId]?.title ?? programId}`)
  })
  if (needsProperty && !ownsProperty(state)) reasons.push('Need 1 property')
  if (state.energy < 10) reasons.push('Too exhausted')
  if (state.health < 20) reasons.push('Health too low')

  return reasons.length > 0 ? reasons.join(' | ') : null
}

export function canTakeJob(state: GameState, job: Job) {
  return !getLockedReason(job.reputationRequired, job.certifications, state, false, job.programRequirements) && state.actionPoints > 0 && state.jobId !== job.id
}

export function canRunGig(state: GameState, gig: Gig) {
  return !getLockedReason(gig.reputationRequired, gig.certifications, state, gig.needsProperty, gig.programRequirements) && state.actionPoints > 0
}

export function canTakeSideJob(state: GameState, sideJob: SideJob) {
  if (getLockedReason(sideJob.reputationRequired, sideJob.certifications, state, false, sideJob.programRequirements)) return false
  if (sideJob.bankAccountRequired && !state.bankAccount) return false
  if (sideJob.seasonMonths && !sideJob.seasonMonths.includes(((state.month - 1) % 12) + 1)) return false
  if (state.sideJobIds.includes(sideJob.id)) return false
  const activeJobs = state.sideJobIds.map((id) => SIDE_JOB_MAP[id]).filter(Boolean)
  if (activeJobs.some((activeJob) => activeJob.schedule === sideJob.schedule)) return false
  const totalCommitment =
    activeJobs.reduce((sum, activeJob) => sum + (activeJob.commitment === 'heavy' ? 3 : activeJob.commitment === 'medium' ? 2 : 1), 0) +
    (sideJob.commitment === 'heavy' ? 3 : sideJob.commitment === 'medium' ? 2 : 1)
  const maxCommitment = state.educationEnrollment ? 3 : 4
  return totalCommitment <= maxCommitment
}

export function canBuyProperty(state: GameState, property: PropertyTemplate) {
  return property.cost > 0 && state.reputation >= property.reputationRequired
}
