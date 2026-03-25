import { BOND_MAP } from '../../features/banking/data'
import { COURSE_MAP, GIG_MAP, JOB_MAP, UPGRADE_MAP } from '../../features/career/data'
import { EDUCATION_PROGRAM_MAP } from '../../features/education/data'
import { BUSINESS_MAP } from '../../features/business/data'
import { BASE_MARKET } from '../../features/market/data'
import { PROPERTIES, PROPERTY_MAP, TENANT_PROFILES, TENANT_PROFILE_MAP } from '../../features/property/data'
import { CONTACTS, DISTRICTS, DISTRICT_MAP, FOOD_SURVIVAL_EVENTS, HOUSING_SURVIVAL_EVENTS, LIFE_EVENTS, MONTHLY_EVENTS, RIVALS, SHARED_HOUSING_EVENTS, STARTER_BREAK_EVENTS, TRANSPORT_SURVIVAL_EVENTS } from '../../features/world/data'
import { money } from './format'
import { hydrateState } from './storage'
import type { ContactState, Course, DebtAccount, GameAction, GameState, LifeEvent, MonthlySnapshot, Opportunity, Tone } from './types'
import { canBuyBusiness, canBuyProperty, canRunGig, canTakeJob, clamp, getBondValue, getBondYield, getBusinessMonthlyProfit, getBusinessValue, getComplianceRisk, getDebtTotal, getInterestRate, getLifestyleConditionShift, getLifestyleSwitchCost, getLivingCost, getLockedReason, getMonthlyTaxEstimate, getNetWorth, getPassiveIncomePreview, getPropertyAskingPrice, getPropertyRent, getPropertyUpkeep, getPropertyValue, getRenovationBoost, getRenovationCost, getSavingsRate, getTradingFee, hasStableHousing, hasUpgrade, randomBetween, randomInt, randomItem, roundPrice } from './utils'

function getEconomyPhase(state: Pick<GameState, 'unemployment' | 'housingDemand' | 'marketSentiment' | 'baseRate'>): GameState['economyPhase'] {
  if (state.unemployment >= 7.2 || state.marketSentiment <= -5.5) return 'recession'
  if (state.baseRate >= 5.8 || state.housingDemand <= -3) return 'slowdown'
  if (state.marketSentiment >= 6 && state.housingDemand >= 5) return 'boom'
  if (state.marketSentiment >= 2 || state.housingDemand >= 2) return 'expansion'
  return 'fragile'
}

function pushLog(state: GameState, title: string, detail: string, tone: Tone = 'neutral') {
  return {
    ...state,
    log: [{ id: `${state.month}-${state.log.length}-${title}`, month: state.month, title, detail, tone }, ...state.log].slice(0, 18),
  }
}

function applyConditionShift(state: GameState, shift: Partial<Pick<GameState, 'stress' | 'health' | 'energy' | 'reputation'>>) {
  return {
    ...state,
    stress: clamp(state.stress + (shift.stress ?? 0), 0, 100),
    health: clamp(state.health + (shift.health ?? 0), 0, 100),
    energy: clamp(state.energy + (shift.energy ?? 0), 0, 100),
    reputation: clamp(state.reputation + (shift.reputation ?? 0), 0, 999),
  }
}

function canBuyCourse(state: GameState, course: Course) {
  return !state.certifications.includes(course.id) && !getLockedReason(course.reputationRequired, [], state) && state.cash >= course.cost && state.actionPoints > 0 && state.energy >= 12
}

function applyLifeEvent(state: GameState, event: LifeEvent) {
  let nextState = {
    ...state,
    cash: state.cash + (event.cash ?? 0),
    debt: state.debt + (event.debt ?? 0),
    bankAccount: event.bankAccount ? true : state.bankAccount,
    housingTier: event.housingTier ?? state.housingTier,
    transportTier: event.transportTier ?? state.transportTier,
    creditScore: event.bankAccount && !state.bankAccount ? clamp(state.creditScore + 10, 300, 850) : state.creditScore,
    bankTrust: event.bankAccount && !state.bankAccount ? clamp(state.bankTrust + 12, 0, 100) : state.bankTrust,
  }
  nextState = applyConditionShift(nextState, {
    stress: event.stress,
    health: event.health,
    energy: event.energy,
    reputation: event.reputation,
  })
  event.storyFlags?.forEach((flag) => {
    nextState = addStoryFlag(nextState, flag)
  })
  return pushLog(nextState, event.title, event.detail, event.tone)
}

function getLifeEventPool(state: GameState) {
  const pool = [...LIFE_EVENTS]

  if (state.housingTier === 'shelter') {
    pool.push(...HOUSING_SURVIVAL_EVENTS)
  }

  if (state.housingTier === 'shared') {
    pool.push(...SHARED_HOUSING_EVENTS)
  }

  if (state.transportTier === 'foot') {
    pool.push(...TRANSPORT_SURVIVAL_EVENTS)
  }

  if (state.foodTier === 'skip-meals' || state.foodTier === 'cheap-eats') {
    pool.push(...FOOD_SURVIVAL_EVENTS)
  }

  if (state.month <= 6 || state.cash <= 250 || !state.bankAccount || state.housingTier === 'shelter') {
    pool.push(STARTER_BREAK_EVENTS[0])
  }
  if (state.housingTier === 'shelter') {
    pool.push(STARTER_BREAK_EVENTS[1])
  }
  if (state.transportTier === 'foot') {
    pool.push(STARTER_BREAK_EVENTS[2])
  }
  if (!state.bankAccount) {
    pool.push(STARTER_BREAK_EVENTS[3])
  }

  return pool
}

function createContacts(): ContactState[] {
  return CONTACTS.map((contact) => ({
    contactId: contact.id,
    relationship: contact.id === 'banker' ? 4 : 6,
  }))
}

function adjustContact(state: GameState, contactId: string, amount: number) {
  return {
    ...state,
    contacts: state.contacts.map((contact) =>
      contact.contactId === contactId
        ? { ...contact, relationship: clamp(contact.relationship + amount, 0, 100) }
        : contact,
    ),
  }
}

function addStoryFlag(state: GameState, flag: string) {
  if (state.storyFlags.includes(flag)) return state
  return { ...state, storyFlags: [...state.storyFlags, flag] }
}

function syncDebtState(state: GameState) {
  const mortgageAccounts = Object.fromEntries(
    state.debtAccounts
      .filter((account) => account.securedPropertyUid)
      .map((account) => [account.securedPropertyUid as string, account.principal]),
  )

  return {
    ...state,
    debt: getDebtTotal(state),
    properties: state.properties.map((property) => ({
      ...property,
      mortgageBalance: mortgageAccounts[property.uid] ?? 0,
    })),
  }
}

function createDebtAccount(
  state: GameState,
  overrides: Omit<DebtAccount, 'uid'>,
) {
  return {
    account: {
      uid: `debt-${state.nextDebtId}`,
      ...overrides,
    },
    nextDebtId: state.nextDebtId + 1,
  }
}

function applyDebtPayment(accounts: DebtAccount[], payment: number) {
  let remaining = payment
  const sorted = accounts
    .map((account, index) => ({ account, index }))
    .sort((a, b) => {
      if (b.account.delinquentMonths !== a.account.delinquentMonths) return b.account.delinquentMonths - a.account.delinquentMonths
      return b.account.monthlyRate - a.account.monthlyRate
    })

  const updated = accounts.map((account) => ({ ...account }))
  for (const { index } of sorted) {
    if (remaining <= 0) break
    const target = updated[index]
    const applied = Math.min(target.principal, remaining)
    target.principal = Math.max(0, target.principal - applied)
    remaining -= applied
  }

  return updated.filter((account) => account.principal > 0)
}

function generateOpportunities(state: GameState) {
  const opportunities: Opportunity[] = []
  const broker = state.contacts.find((item) => item.contactId === 'broker')?.relationship ?? 0
  const banker = state.contacts.find((item) => item.contactId === 'banker')?.relationship ?? 0
  const recruiter = state.contacts.find((item) => item.contactId === 'recruiter')?.relationship ?? 0
  const contractor = state.contacts.find((item) => item.contactId === 'contractor')?.relationship ?? 0
  const topPropertyRival = state.rivals
    .filter((rival) => rival.specialty === 'property')
    .slice()
    .sort((a, b) => b.rivalry - a.rivalry)[0]
  const topBusinessRival = state.rivals
    .filter((rival) => rival.specialty === 'business')
    .slice()
    .sort((a, b) => b.rivalry - a.rivalry)[0]
  const marketRival = state.rivals
    .filter((rival) => rival.specialty === 'stocks')
    .slice()
    .sort((a, b) => b.rivalry - a.rivalry)[0]

  if (broker >= 28 && state.propertyListings.length > 0 && state.housingDemand >= -4) {
    const hottestDistrict = state.districtStates.slice().sort((a, b) => b.momentum - a.momentum)[0]
    const listing = state.propertyListings.find((item) => item.districtId === hottestDistrict.districtId) ?? state.propertyListings[0]
    opportunities.push({
      id: `opp-property-${state.month}`,
      type: 'offmarket-property',
      title: 'Off-market property whisper',
      detail: `Your broker found a quieter property route in ${DISTRICT_MAP[listing.districtId].name} at a discount.`,
      contactId: 'broker',
      districtId: listing.districtId,
      listingId: listing.id,
      value: Math.round(listing.askingPrice * 0.1),
    })
  }

  if (banker >= 24 && state.properties.some((property) => property.mortgageBalance > 0) && state.baseRate <= 6.2) {
    opportunities.push({
      id: `opp-banker-${state.month}`,
      type: 'referral-bonus',
      title: 'Better financing window',
      detail: 'Your banker can smooth your next financing deal and improve trust with the bank.',
      contactId: 'banker',
      value: 5,
    })
  }

  if (recruiter >= 22 && state.unemployment <= 7.8) {
    opportunities.push({
      id: `opp-job-${state.month}`,
      type: 'job-lead',
      title: 'Recruiter job lead',
      detail: 'A recruiter is pushing your profile and can raise your reputation if you keep momentum.',
      contactId: 'recruiter',
      value: 2,
    })
  }

  if (contractor >= 20 && state.properties.length > 0) {
    opportunities.push({
      id: `opp-contractor-${state.month}`,
      type: 'discounted-renovation',
      title: 'Contractor crew opening',
      detail: 'Your contractor contact can offset a chunk of your next renovation bill.',
      contactId: 'contractor',
      value: 140,
    })
  }

  if (state.storyFlags.includes('room-lead-open') && !state.storyFlags.includes('room-lead-claimed') && state.housingTier !== 'apartment') {
    const nextHousingTier = state.housingTier === 'shelter' ? 'shared' : 'studio'
    const cashCost = nextHousingTier === 'shared' ? 90 : 220
    opportunities.push({
      id: `opp-room-${state.month}`,
      type: 'housing-offer',
      title: nextHousingTier === 'shared' ? 'Friend of a friend has a room' : 'Broker found a tiny studio',
      detail:
        nextHousingTier === 'shared'
          ? 'A neighborhood lead can get you into a shared room fast if you can scrape together the deposit.'
          : 'A small studio opened up through the local network. It is tight, but it gets you out of chaotic shared housing.',
      contactId: nextHousingTier === 'shared' ? 'recruiter' : 'broker',
      cashCost,
      housingTier: nextHousingTier,
      storyFlag: 'room-lead-claimed',
      value: nextHousingTier === 'shared' ? 1 : 2,
    })
  }

  if (state.storyFlags.includes('transport-deal-open') && !state.storyFlags.includes('transport-deal-claimed') && state.transportTier === 'foot') {
    opportunities.push({
      id: `opp-transport-${state.month}`,
      type: 'transport-deal',
      title: 'Used bike repair deal',
      detail: 'A mechanic contact can get an old bike running cheaply, which should stabilize your commute and early gigs.',
      contactId: 'contractor',
      cashCost: 45,
      transportTier: 'bike',
      storyFlag: 'transport-deal-claimed',
      value: 1,
    })
  }

  if (state.storyFlags.includes('neighbor-network-open') && !state.storyFlags.includes('neighbor-network-claimed')) {
    opportunities.push({
      id: `opp-neighbor-${state.month}`,
      type: 'community-connection',
      title: 'Neighborhood intro chain',
      detail: 'A local introduction can turn one good deed or meal-table conversation into job, repair, and housing leads.',
      contactId: 'recruiter',
      storyFlag: 'neighbor-network-claimed',
      value: 85,
    })
  }

  if (state.storyFlags.includes('tenant-relief-open') && !state.storyFlags.includes('tenant-relief-claimed') && state.housingTier === 'shared') {
    opportunities.push({
      id: `opp-tenant-${state.month}`,
      type: 'tenant-relief',
      title: 'Tenant clinic referral',
      detail: 'A local tenant-rights clinic can push back on fees, buy you breathing room, and help you line up a cleaner exit.',
      contactId: 'broker',
      storyFlag: 'tenant-relief-claimed',
      value: 110,
    })
  }

  if (!state.storyFlags.includes('distressed-auction') && state.propertyListings.length > 0 && (broker >= 32 || (topPropertyRival?.rivalry ?? 0) >= 20)) {
    const coldestDistrict = state.districtStates.slice().sort((a, b) => a.momentum - b.momentum)[0]
    const listing = state.propertyListings.find((item) => item.districtId === coldestDistrict.districtId) ?? state.propertyListings[0]
    opportunities.push({
      id: `opp-auction-${state.month}`,
      type: 'distressed-property',
      title: 'Distressed auction docket',
      detail: `A rushed sale surfaced in ${DISTRICT_MAP[listing.districtId].name}. If you can move fast, the basis is unusually low.`,
      contactId: 'broker',
      districtId: listing.districtId,
      listingId: listing.id,
      cashCost: Math.round(listing.askingPrice * 0.72),
      storyFlag: 'distressed-auction',
      value: Math.round(listing.askingPrice * 0.28),
    })
  }

  if (!state.storyFlags.includes('operator-takeover') && state.cash >= 6000 && (state.reputation >= 8 || (topBusinessRival?.rivalry ?? 0) >= 18)) {
    const districtId = topBusinessRival?.focusDistrictId ?? state.districtStates.slice().sort((a, b) => b.momentum - a.momentum)[0].districtId
    const business = Object.values(BUSINESS_MAP).find((item) => item.reputationRequired <= Math.max(8, state.reputation + 2)) ?? Object.values(BUSINESS_MAP)[0]
    opportunities.push({
      id: `opp-takeover-${state.month}`,
      type: 'distressed-business',
      title: 'Operator exit',
      detail: `A tired owner is willing to sell a ${business.title} in ${DISTRICT_MAP[districtId].name} before the wider market notices.`,
      contactId: 'recruiter',
      districtId,
      businessTemplateId: business.id,
      cashCost: Math.round(business.cost * 0.76),
      storyFlag: 'operator-takeover',
      value: Math.round(business.cost * 0.24),
    })
  }

  if (!state.storyFlags.includes('panic-buyer') && state.marketSentiment <= -3.5 && state.cash >= 450) {
    const stock = state.market.slice().sort((a, b) => a.change - b.change)[0]
    const shares = Math.max(2, Math.min(10, Math.floor(state.cash / Math.max(1, stock.price * 0.85))))
    opportunities.push({
      id: `opp-market-${state.month}`,
      type: 'market-dislocation',
      title: 'Panic tape dislocation',
      detail: `${marketRival?.name ?? 'A fast trader'} dumped into weakness. You can scoop discounted ${stock.symbol} if you want to play offense in the fear.`,
      contactId: 'banker',
      symbol: stock.symbol,
      shares,
      cashCost: Math.round(stock.price * 0.84 * shares),
      storyFlag: 'panic-buyer',
      value: shares,
    })
  }

  if (state.storyFlags.includes('distressed-auction') && !state.storyFlags.includes('redevelopment-grant') && state.properties.length > 0 && broker >= 36) {
    const targetDistrict = state.properties.slice().sort((a, b) => getPropertyValue(b, state) - getPropertyValue(a, state))[0]?.districtId ?? state.properties[0].districtId
    opportunities.push({
      id: `opp-grant-${state.month}`,
      type: 'redevelopment-grant',
      title: 'Redevelopment grant',
      detail: `City money is rotating into ${DISTRICT_MAP[targetDistrict].name}, and your broker can get your paperwork into the right stack.`,
      contactId: 'broker',
      districtId: targetDistrict,
      storyFlag: 'redevelopment-grant',
      value: 650,
    })
  }

  if (state.storyFlags.includes('operator-takeover') && !state.storyFlags.includes('buyout-offer') && state.businesses.some((business) => business.monthsOperating >= 4)) {
    opportunities.push({
      id: `opp-buyout-${state.month}`,
      type: 'buyout-offer',
      title: 'Strategic buyout offer',
      detail: 'A larger operator likes what you built and is willing to overpay for one of your businesses.',
      contactId: 'recruiter',
      storyFlag: 'buyout-offer',
      value: 0,
    })
  }

  return opportunities.slice(0, 5)
}

function createDistrictStates() {
  return DISTRICTS.map((district) => ({
    districtId: district.id,
    momentum: district.id === 'arts' ? 4 : district.id === 'harbor' ? -3 : 0,
  }))
}

function createRivals() {
  return RIVALS.map((rival) => ({ ...rival }))
}

function generatePropertyListings(state: Pick<GameState, 'month' | 'districtStates' | 'rivals'>) {
  return DISTRICTS.map((district, index) => {
    const template = PROPERTIES[(state.month + index) % PROPERTIES.length]
    const rivalPressure = state.rivals
      .filter((rival) => rival.specialty === 'property' && rival.focusDistrictId === district.id)
      .reduce((total, rival) => total + rival.pressure, 0)
    return {
      id: `listing-${state.month}-${district.id}-${template.id}`,
      templateId: template.id,
      districtId: district.id,
      askingPrice: Math.round(getPropertyAskingPrice(
        template.id,
        district.id,
        state.districtStates.find((item) => item.districtId === district.id)?.momentum ?? 0,
      ) * (1 + rivalPressure / 260)),
    }
  })
}

function assignTenantProfile(property: Pick<GameState['properties'][number], 'templateId' | 'districtId'>) {
  const propertyTemplate = PROPERTY_MAP[property.templateId]
  const commercialAsset = propertyTemplate.id === 'corner-shop' || propertyTemplate.id === 'micro-office'
  const pool = TENANT_PROFILES.filter((tenant) => {
    if (commercialAsset) return tenant.commercialOnly
    if (tenant.commercialOnly) return false
    return !tenant.preferredDistricts || tenant.preferredDistricts.includes(property.districtId) || Math.random() < 0.25
  })
  const candidates = pool.length > 0 ? pool : TENANT_PROFILES.filter((tenant) => tenant.commercialOnly === commercialAsset)
  return randomItem(candidates)
}

export function createInitialState(): GameState {
  const districtStates = createDistrictStates()
  const initialDebtAccounts: DebtAccount[] = [
    {
      uid: 'debt-1',
      kind: 'survival',
      label: 'Survival arrears',
      principal: 900,
      monthlyRate: 0.029,
      minimumPayment: 90,
      delinquentMonths: 0,
      securedPropertyUid: null,
    },
  ]
  return {
    month: 1,
    ageMonths: 18 * 12,
    actionPoints: 2,
    cash: 0,
    savingsBalance: 0,
    debt: 900,
    taxDue: 0,
    complianceScore: 72,
    economyPhase: 'fragile',
    inflation: 2.4,
    baseRate: 4.6,
    unemployment: 5.2,
    housingDemand: 0.8,
    marketSentiment: 0.5,
    creditScore: 430,
    bankTrust: 4,
    reputation: 0,
    knowledge: 0,
    stress: 62,
    health: 48,
    energy: 41,
    bankAccount: false,
    housingTier: 'shelter',
    transportTier: 'foot',
    foodTier: 'skip-meals',
    wellnessTier: 'none',
    jobId: 'night-cleaning',
    certifications: [],
    upgrades: [],
    educationEnrollment: null,
    market: BASE_MARKET.map((stock) => ({ ...stock })),
    holdings: {},
    bondHoldings: [],
    debtAccounts: initialDebtAccounts,
    districtStates,
    propertyListings: generatePropertyListings({ month: 1, districtStates, rivals: createRivals() }),
    contacts: createContacts(),
    rivals: createRivals(),
    opportunities: [],
    storyFlags: [],
    properties: [],
    businesses: [],
    nextBondId: 1,
    nextDebtId: 2,
    nextBusinessId: 1,
    nextPropertyId: 1,
    history: [],
    log: [
      {
        id: 'opening-note',
        month: 1,
        title: 'Fresh start',
        detail: 'You are 18, fresh out of high school, with no cash, unstable housing, no bank account, weak health, and just enough work access to begin climbing.',
        tone: 'neutral',
      },
    ],
  }
}

export function loadState() {
  return hydrateState(createInitialState())
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (action.type === 'RESET') return createInitialState()

  if (action.type === 'TAKE_JOB') {
    const job = JOB_MAP[action.jobId]
    if (!job || !canTakeJob(state, job)) return state
    return pushLog(adjustContact(applyConditionShift({ ...state, actionPoints: state.actionPoints - 1, jobId: job.id }, { reputation: 1, stress: 4, energy: -6 }), 'recruiter', 3), 'New day job', `You switched into ${job.title}. Monthly salary is now ${money(job.salary)}.`, 'good')
  }

  if (action.type === 'RUN_GIG') {
    const gig = GIG_MAP[action.gigId]
    if (!gig || !canRunGig(state, gig)) return state

    let payout = gig.payout
    let detail = gig.description
    const properties = state.properties.map((property) => ({ ...property }))

    if (gig.id === 'delivery' && hasUpgrade(state, 'scooter')) {
      payout += 80
      detail += ' The scooter let you squeeze in more orders.'
    }

    if (gig.id === 'repair-callout') {
      if (hasUpgrade(state, 'toolkit')) payout += 60
      const roughest = properties.slice().sort((a, b) => a.condition - b.condition)[0]
      if (roughest) {
        roughest.condition = clamp(roughest.condition + 12, 0, 100)
        detail += ` You also patched up ${PROPERTY_MAP[roughest.templateId].title}.`
      }
    }

    const conditionHit = gig.id === 'flyers'
      ? { energy: -8, stress: 4, health: -1, reputation: 1 }
      : gig.id === 'delivery'
      ? { energy: -16, stress: 8, health: -2, reputation: 1 }
      : gig.id === 'freelance'
        ? { energy: -10, stress: 4, health: 0, reputation: 1 }
        : { energy: -12, stress: 6, health: -1, reputation: 1 }

    const contactBoost = gig.id === 'repair-callout' ? 'contractor' : gig.id === 'freelance' ? 'recruiter' : gig.id === 'market-stall' ? 'broker' : ''
    const nextState = applyConditionShift({ ...state, actionPoints: state.actionPoints - 1, cash: state.cash + payout, properties }, conditionHit)
    return pushLog(contactBoost ? adjustContact(nextState, contactBoost, 2) : nextState, gig.title, `${detail} You made ${money(payout)}.`, 'good')
  }

  if (action.type === 'OPEN_BANK_ACCOUNT') {
    if (state.bankAccount || state.actionPoints <= 0 || state.cash < 25) return state
    return pushLog(
      applyConditionShift(
        {
          ...state,
          actionPoints: state.actionPoints - 1,
          cash: state.cash - 25,
          bankAccount: true,
          creditScore: clamp(state.creditScore + 10, 300, 850),
          bankTrust: clamp(state.bankTrust + 12, 0, 100),
        },
        { stress: -2, reputation: 1 },
      ),
      'Bank account opened',
      'You finally opened a basic account. Trading gets cheaper, financing gets less predatory, and your money stops leaking through cash services.',
      'good',
    )
  }

  if (action.type === 'SET_LIFESTYLE') {
    const switchCost = getLifestyleSwitchCost(state, action.category, action.tier)
    if (switchCost <= 0 || state.cash < switchCost) return state

    if (action.category === 'housing') {
      return pushLog(
        { ...state, cash: state.cash - switchCost, housingTier: action.tier as GameState['housingTier'] },
        'Housing changed',
        `You moved into a new housing setup and spent ${money(switchCost)} to make the switch.`,
        'neutral',
      )
    }
    if (action.category === 'transport') {
      return pushLog(
        { ...state, cash: state.cash - switchCost, transportTier: action.tier as GameState['transportTier'] },
        'Transport changed',
        `You changed how you get around and spent ${money(switchCost)} upfront.`,
        'neutral',
      )
    }
    if (action.category === 'food') {
      return pushLog(
        { ...state, cash: state.cash - switchCost, foodTier: action.tier as GameState['foodTier'] },
        'Food budget changed',
        `You changed your food setup and spent ${money(switchCost)} to reset the routine.`,
        'neutral',
      )
    }
    return pushLog(
      { ...state, cash: state.cash - switchCost, wellnessTier: action.tier as GameState['wellnessTier'] },
      'Recovery plan changed',
      `You changed your recovery routine and spent ${money(switchCost)} getting it in place.`,
      'neutral',
    )
  }

  if (action.type === 'DEPOSIT_SAVINGS') {
    if (!state.bankAccount || state.cash < action.amount || action.amount <= 0) return state
    return pushLog(
      {
        ...state,
        cash: state.cash - action.amount,
        savingsBalance: state.savingsBalance + action.amount,
      },
      'Savings deposit',
      `You moved ${money(action.amount)} into savings.`,
      'good',
    )
  }

  if (action.type === 'WITHDRAW_SAVINGS') {
    if (!state.bankAccount || state.savingsBalance < action.amount || action.amount <= 0) return state
    return pushLog(
      {
        ...state,
        cash: state.cash + action.amount,
        savingsBalance: state.savingsBalance - action.amount,
      },
      'Savings withdrawal',
      `You moved ${money(action.amount)} out of savings.`,
      'neutral',
    )
  }

  if (action.type === 'BUY_BOND') {
    const bond = BOND_MAP[action.bondId]
    if (!bond || !state.bankAccount || action.amount < bond.minPurchase || state.cash < action.amount) return state
    const couponRate = getBondYield(bond, state)
    return pushLog(
      {
        ...state,
        cash: state.cash - action.amount,
        bondHoldings: [
          ...state.bondHoldings,
          {
            uid: `bond-${state.nextBondId}`,
            templateId: bond.id,
            principal: action.amount,
            couponRate,
            purchaseRate: couponRate,
            monthsRemaining: bond.termMonths,
          },
        ],
        nextBondId: state.nextBondId + 1,
      },
      'Bond purchased',
      `You bought ${bond.title} for ${money(action.amount)} at ${(couponRate * 100).toFixed(1)}%.`,
      'good',
    )
  }

  if (action.type === 'SELL_BOND') {
    const holding = state.bondHoldings.find((item) => item.uid === action.bondUid)
    if (!holding) return state
    const saleValue = getBondValue(holding, state)
    return pushLog(
      {
        ...state,
        cash: state.cash + saleValue,
        bondHoldings: state.bondHoldings.filter((item) => item.uid !== action.bondUid),
      },
      'Bond sold',
      `You sold a ${BOND_MAP[holding.templateId].title} position for ${money(saleValue)}.`,
      'neutral',
    )
  }

  if (action.type === 'ENROLL_EDUCATION') {
    const program = EDUCATION_PROGRAM_MAP[action.programId]
    if (!program || state.educationEnrollment || state.reputation < program.reputationRequired) return state
    if (program.certificationReward && state.certifications.includes(program.certificationReward)) return state

    if (action.financing === 'cash') {
      if (state.cash < program.totalCost) return state
      return pushLog(
        applyConditionShift(
          {
            ...state,
            cash: state.cash - program.totalCost,
            educationEnrollment: {
              programId: program.id,
              monthsRemaining: program.durationMonths,
              financed: false,
            },
          },
          { stress: 2, energy: -4 },
        ),
        'Program started',
        `You enrolled in ${program.title} and paid ${money(program.totalCost)} upfront.`,
        'good',
      )
    }

    const created = createDebtAccount(state, {
      kind: 'student',
      label: `${program.title} tuition`,
      principal: program.totalCost,
      monthlyRate: clamp(getInterestRate(state) - 0.016, 0.006, 0.018),
      minimumPayment: Math.max(40, Math.round(program.totalCost * 0.015)),
      delinquentMonths: 0,
      deferMonthsRemaining: program.durationMonths,
      securedPropertyUid: null,
    })

    return pushLog(
      applyConditionShift(
        syncDebtState({
          ...state,
          debtAccounts: [...state.debtAccounts, created.account],
          nextDebtId: created.nextDebtId,
          educationEnrollment: {
            programId: program.id,
            monthsRemaining: program.durationMonths,
            financed: true,
          },
        }),
        { stress: 3, energy: -4 },
      ),
      'Program started',
      `You enrolled in ${program.title} using student financing. Payments are deferred while you are still in the program.`,
      'good',
    )
  }

  if (action.type === 'BUY_COURSE') {
    const course = COURSE_MAP[action.courseId]
    if (!course || !canBuyCourse(state, course)) return state
    const contactId = course.id === 'landlord-license' ? 'broker' : course.id === 'coding-bootcamp' ? 'recruiter' : course.id === 'finance-cert' ? 'banker' : ''
    const nextState = applyConditionShift({ ...state, actionPoints: state.actionPoints - 1, cash: state.cash - course.cost, certifications: [...state.certifications, course.id] }, { reputation: 1, stress: 5, energy: -12 })
    return pushLog(contactId ? adjustContact(nextState, contactId, 4) : nextState, 'New qualification', `You completed ${course.title} for ${money(course.cost)}. New opportunities just opened up.`, 'good')
  }

  if (action.type === 'BUY_UPGRADE') {
    const upgrade = UPGRADE_MAP[action.upgradeId]
    if (!upgrade || state.upgrades.includes(upgrade.id) || state.cash < upgrade.cost) return state
    return pushLog({ ...state, cash: state.cash - upgrade.cost, upgrades: [...state.upgrades, upgrade.id] }, 'Empire upgrade', `You bought ${upgrade.title} for ${money(upgrade.cost)}.`, 'good')
  }

  if (action.type === 'BUY_PROPERTY') {
    const listing = state.propertyListings.find((item) => item.id === action.listingId)
    if (!listing) return state
    const property = PROPERTY_MAP[listing.templateId]
    if (!property || !canBuyProperty({ ...state, cash: listing.askingPrice }, property)) return state

    const financed = action.financing === 'mortgage'
    const hardMoneyLoan = financed && !state.bankAccount
    const downPayment = Math.round(listing.askingPrice * (hardMoneyLoan ? 0.35 : 0.28))
    const originationFee = financed ? (hardMoneyLoan ? 380 : 120) : 0
    const mortgageBalance = financed ? listing.askingPrice - downPayment : 0
    const requiredCash = financed ? downPayment + originationFee : listing.askingPrice
    const reputationGap = Math.max(0, property.reputationRequired - state.reputation)
    const propertyUid = `property-${state.nextPropertyId}`

    if (financed && (state.creditScore < (state.bankAccount ? 560 : 420) || state.bankTrust < (state.bankAccount ? 16 : 0))) return state
    if (state.cash < requiredCash) return state

    const debtState = financed
      ? (() => {
          const monthlyRate = hardMoneyLoan
            ? clamp(getInterestRate(state) + 0.01, 0.02, 0.045)
            : clamp(getInterestRate(state) - 0.012, 0.009, 0.024)
          const minimumPayment = Math.max(hardMoneyLoan ? 180 : 110, Math.round(mortgageBalance * (hardMoneyLoan ? 0.03 : 0.022)))
          const created = createDebtAccount(state, {
            kind: 'mortgage',
            label: `${hardMoneyLoan ? 'Hard-money' : 'Mortgage'} on ${property.title}`,
            principal: mortgageBalance,
            monthlyRate,
            minimumPayment,
            delinquentMonths: 0,
            securedPropertyUid: propertyUid,
          })
          return {
            debtAccounts: [...state.debtAccounts, created.account],
            nextDebtId: created.nextDebtId,
          }
        })()
      : {
          debtAccounts: state.debtAccounts,
          nextDebtId: state.nextDebtId,
        }

    return pushLog(
      applyConditionShift(
        adjustContact(syncDebtState({
          ...state,
          cash: state.cash - requiredCash,
          creditScore: financed ? clamp(state.creditScore + 8, 300, 850) : state.creditScore,
          bankTrust: financed ? clamp(state.bankTrust + 4, 0, 100) : state.bankTrust,
          debtAccounts: debtState.debtAccounts,
          properties: [
            ...state.properties,
            {
              uid: propertyUid,
              templateId: property.id,
              districtId: listing.districtId,
              purchasePrice: listing.askingPrice,
              mortgageBalance,
              condition: clamp(78 - reputationGap * 3, 56, 82),
              rented: false,
              tenantProfileId: null,
              leaseMonthsRemaining: 0,
              missedPayments: 0,
            },
          ],
          propertyListings: state.propertyListings.filter((item) => item.id !== action.listingId),
          nextDebtId: debtState.nextDebtId,
          nextPropertyId: state.nextPropertyId + 1,
        }), financed && state.bankAccount ? 'banker' : 'broker', financed ? 5 : 4),
        { stress: financed ? 8 + reputationGap : 5 + Math.max(0, reputationGap - 1), energy: -4 },
      ),
      'Property acquired',
      financed
        ? `You financed ${property.title} in ${DISTRICT_MAP[listing.districtId].name} with ${money(downPayment)} down and a ${money(mortgageBalance)} ${hardMoneyLoan ? 'hard-money note' : 'mortgage'}.`
        : `You bought ${property.title} in ${DISTRICT_MAP[listing.districtId].name} for ${money(listing.askingPrice)}.`,
      'good',
    )
  }

  if (action.type === 'BUY_BUSINESS') {
    const template = BUSINESS_MAP[action.templateId]
    if (!template || !canBuyBusiness(state, template)) return state
    if (state.cash < template.cost) return state
    const reputationGap = Math.max(0, template.reputationRequired - state.reputation)

    return pushLog(
      adjustContact(
        applyConditionShift(
          {
            ...state,
            cash: state.cash - template.cost,
            businesses: [
              ...state.businesses,
              {
                uid: `business-${state.nextBusinessId}`,
                templateId: template.id,
                districtId: action.districtId,
                purchasePrice: template.cost,
                condition: clamp(80 - reputationGap * 4, 52, 82),
                marketing: 0,
                staffing: 0,
                active: true,
                monthsOperating: 0,
              },
            ],
            nextBusinessId: state.nextBusinessId + 1,
          },
          { stress: 6 + reputationGap, energy: -6, reputation: reputationGap > 0 ? 0 : 1 },
        ),
        template.id === 'repair-shop' ? 'contractor' : template.id === 'micro-saas' ? 'recruiter' : 'broker',
        4,
      ),
      'Business launched',
      `You opened ${template.title} in ${DISTRICT_MAP[action.districtId].name} for ${money(template.cost)}.${reputationGap > 0 ? ' You are ahead of your profile, so this starts rougher than it would for a polished operator.' : ''}`,
      'good',
    )
  }

  if (action.type === 'TOGGLE_RENTAL') {
    const property = state.properties.find((item) => item.uid === action.propertyUid)
    if (!property || (!property.rented && property.condition < 45)) return state
    const tenant = !property.rented ? assignTenantProfile(property) : null
    const properties = state.properties.map((item) =>
      item.uid === action.propertyUid
        ? {
            ...item,
            rented: !item.rented,
            tenantProfileId: !item.rented ? tenant?.id ?? null : null,
            leaseMonthsRemaining: !item.rented ? randomInt(6, 12) : 0,
            missedPayments: 0,
          }
        : item,
    )
    return pushLog(
      { ...state, properties },
      property.rented ? 'Listing paused' : 'Tenant placed',
      property.rented
        ? `${PROPERTY_MAP[property.templateId].title} is now vacant while you reposition it.`
        : `${PROPERTY_MAP[property.templateId].title} is now collecting rent from a ${tenant?.label.toLowerCase() ?? 'new tenant'}.`,
    )
  }

  if (action.type === 'EVICT_TENANT') {
    const property = state.properties.find((item) => item.uid === action.propertyUid)
    if (!property || !property.rented) return state
    const properties = state.properties.map((item) =>
      item.uid === action.propertyUid
        ? { ...item, rented: false, tenantProfileId: null, leaseMonthsRemaining: 0, missedPayments: 0 }
        : item,
    )
    return pushLog(
      applyConditionShift({ ...state, properties }, { stress: 5, reputation: -1 }),
      'Tenant removed',
      `${PROPERTY_MAP[property.templateId].title} is vacant after an eviction and needs to be re-let.`,
      'neutral',
    )
  }

  if (action.type === 'RENOVATE_PROPERTY') {
    const property = state.properties.find((item) => item.uid === action.propertyUid)
    const cost = getRenovationCost(state)
    if (!property || property.rented || state.actionPoints <= 0 || state.cash < cost || state.energy < 12) return state
    const properties = state.properties.map((item) => (item.uid === property.uid ? { ...item, condition: clamp(item.condition + getRenovationBoost(state), 0, 100) } : item))
    return pushLog(applyConditionShift({ ...state, actionPoints: state.actionPoints - 1, cash: state.cash - cost, properties }, { stress: 6, energy: -14, health: -2 }), 'Renovation complete', `${PROPERTY_MAP[property.templateId].title} was improved for ${money(cost)}.`, 'good')
  }

  if (action.type === 'SELL_PROPERTY') {
    const property = state.properties.find((item) => item.uid === action.propertyUid)
    if (!property) return state
    const saleValue = getPropertyValue(property, state)
    const netSale = Math.max(0, saleValue - property.mortgageBalance)
    const debtAccounts = state.debtAccounts.filter((account) => account.securedPropertyUid !== property.uid)
    return pushLog(
      syncDebtState({
        ...state,
        cash: state.cash + netSale,
        creditScore: clamp(state.creditScore + (property.mortgageBalance > 0 ? 10 : 3), 300, 850),
        bankTrust: clamp(state.bankTrust + (property.mortgageBalance > 0 ? 5 : 1), 0, 100),
        debtAccounts,
        properties: state.properties.filter((item) => item.uid !== action.propertyUid),
      }),
      'Property sold',
      `You sold ${PROPERTY_MAP[property.templateId].title} for ${money(saleValue)} and cleared ${money(property.mortgageBalance)} of secured debt.`,
      'good',
    )
  }

  if (action.type === 'REFINANCE_PROPERTY') {
    const property = state.properties.find((item) => item.uid === action.propertyUid)
    if (!property || state.creditScore < 640 || state.bankTrust < 30) return state
    const propertyValue = getPropertyValue(property, state)
    const maxLoan = Math.round(propertyValue * 0.68)
    const availableDraw = maxLoan - property.mortgageBalance
    if (availableDraw < 350) return state

    const refinanceFee = 160
    const debtAccounts = state.debtAccounts.map((account) =>
      account.securedPropertyUid === action.propertyUid
        ? {
            ...account,
            principal: account.principal + availableDraw,
            minimumPayment: Math.max(account.minimumPayment, Math.round((account.principal + availableDraw) * 0.022)),
          }
        : account,
    )
    const properties = state.properties.map((item) =>
      item.uid === action.propertyUid
        ? { ...item, mortgageBalance: item.mortgageBalance + availableDraw }
        : item,
    )

    return pushLog(
      applyConditionShift(
        adjustContact(syncDebtState({
          ...state,
          cash: state.cash + availableDraw - refinanceFee,
          bankTrust: clamp(state.bankTrust + 3, 0, 100),
          debtAccounts,
          properties,
        }), 'banker', 4),
        { stress: 3, energy: -4 },
      ),
      'Refinance closed',
      `You refinanced ${PROPERTY_MAP[property.templateId].title}, pulled out ${money(availableDraw - refinanceFee)} after fees, and increased the secured balance.`,
      'neutral',
    )
  }

  if (action.type === 'INVEST_IN_BUSINESS') {
    const business = state.businesses.find((item) => item.uid === action.businessUid)
    if (!business || state.actionPoints <= 0) return state
    const cost = action.focus === 'marketing' ? 320 : action.focus === 'staffing' ? 420 : 260
    if (state.cash < cost) return state
    const businesses = state.businesses.map((item) => {
      if (item.uid !== action.businessUid) return item
      if (action.focus === 'marketing') return { ...item, marketing: clamp(item.marketing + 1, 0, 5) }
      if (action.focus === 'staffing') return { ...item, staffing: clamp(item.staffing + 1, 0, 5) }
      return { ...item, condition: clamp(item.condition + 14, 0, 100) }
    })
    return pushLog(
      applyConditionShift({ ...state, actionPoints: state.actionPoints - 1, cash: state.cash - cost, businesses }, { stress: 2, energy: -5 }),
      'Business investment',
      `You funded ${action.focus} at ${BUSINESS_MAP[business.templateId].title} for ${money(cost)}.`,
      'good',
    )
  }

  if (action.type === 'TOGGLE_BUSINESS') {
    const business = state.businesses.find((item) => item.uid === action.businessUid)
    if (!business) return state
    const businesses = state.businesses.map((item) => (item.uid === action.businessUid ? { ...item, active: !item.active } : item))
    return pushLog(
      { ...state, businesses },
      business.active ? 'Operations paused' : 'Operations resumed',
      `${BUSINESS_MAP[business.templateId].title} is now ${business.active ? 'paused' : 'running'} in ${DISTRICT_MAP[business.districtId].name}.`,
      'neutral',
    )
  }

  if (action.type === 'SELL_BUSINESS') {
    const business = state.businesses.find((item) => item.uid === action.businessUid)
    if (!business) return state
    const saleValue = getBusinessValue(business, state)
    return pushLog(
      {
        ...state,
        cash: state.cash + saleValue,
        businesses: state.businesses.filter((item) => item.uid !== action.businessUid),
      },
      'Business sold',
      `You sold ${BUSINESS_MAP[business.templateId].title} for ${money(saleValue)}.`,
      'good',
    )
  }

  if (action.type === 'CLAIM_OPPORTUNITY') {
    const opportunity = state.opportunities.find((item) => item.id === action.opportunityId)
    if (!opportunity) return state

    let nextState: GameState = {
      ...state,
      opportunities: state.opportunities.filter((item) => item.id !== action.opportunityId),
    }

    if (opportunity.type === 'offmarket-property' && opportunity.listingId) {
      nextState = {
        ...nextState,
        propertyListings: nextState.propertyListings.map((listing) =>
          listing.id === opportunity.listingId
            ? { ...listing, askingPrice: Math.max(500, listing.askingPrice - opportunity.value) }
            : listing,
        ),
      }
    }

    if (opportunity.type === 'job-lead') {
      nextState = applyConditionShift({ ...nextState }, { reputation: opportunity.value, stress: -2 })
    }

    if (opportunity.type === 'referral-bonus') {
      nextState = {
        ...nextState,
        bankTrust: clamp(nextState.bankTrust + opportunity.value, 0, 100),
        creditScore: clamp(nextState.creditScore + 6, 300, 850),
      }
    }

    if (opportunity.type === 'discounted-renovation') {
      nextState = {
        ...nextState,
        cash: nextState.cash + opportunity.value,
      }
    }

    if (opportunity.type === 'distressed-property' && opportunity.listingId && opportunity.cashCost) {
      const listing = nextState.propertyListings.find((item) => item.id === opportunity.listingId)
      if (!listing || nextState.cash < opportunity.cashCost) return state
      const template = PROPERTY_MAP[listing.templateId]
      if (!template || nextState.reputation < template.reputationRequired) return state
      nextState = {
        ...nextState,
        cash: nextState.cash - opportunity.cashCost,
        properties: [
          ...nextState.properties,
          {
            uid: `property-${nextState.nextPropertyId}`,
            templateId: template.id,
            districtId: listing.districtId,
            purchasePrice: opportunity.cashCost,
            mortgageBalance: 0,
            condition: 64,
            rented: false,
            tenantProfileId: null,
            leaseMonthsRemaining: 0,
            missedPayments: 0,
          },
        ],
        propertyListings: nextState.propertyListings.filter((item) => item.id !== opportunity.listingId),
        nextPropertyId: nextState.nextPropertyId + 1,
      }
      if (opportunity.storyFlag) nextState = addStoryFlag(nextState, opportunity.storyFlag)
    }

    if (opportunity.type === 'distressed-business' && opportunity.businessTemplateId && opportunity.districtId && opportunity.cashCost) {
      const business = BUSINESS_MAP[opportunity.businessTemplateId]
      if (!business || nextState.cash < opportunity.cashCost || nextState.reputation < business.reputationRequired) return state
      nextState = {
        ...nextState,
        cash: nextState.cash - opportunity.cashCost,
        businesses: [
          ...nextState.businesses,
          {
            uid: `business-${nextState.nextBusinessId}`,
            templateId: business.id,
            districtId: opportunity.districtId,
            purchasePrice: opportunity.cashCost,
            condition: 70,
            marketing: 1,
            staffing: 1,
            active: true,
            monthsOperating: 0,
          },
        ],
        nextBusinessId: nextState.nextBusinessId + 1,
      }
      if (opportunity.storyFlag) nextState = addStoryFlag(nextState, opportunity.storyFlag)
    }

    if (opportunity.type === 'market-dislocation' && opportunity.symbol && opportunity.cashCost && opportunity.shares) {
      const stock = nextState.market.find((item) => item.symbol === opportunity.symbol)
      if (!stock || nextState.cash < opportunity.cashCost) return state
      const existing = nextState.holdings[stock.symbol]
      const shares = (existing?.shares ?? 0) + opportunity.shares
      const averageCost = ((existing?.averageCost ?? 0) * (existing?.shares ?? 0) + opportunity.cashCost) / shares
      nextState = {
        ...nextState,
        cash: nextState.cash - opportunity.cashCost,
        holdings: {
          ...nextState.holdings,
          [stock.symbol]: { shares, averageCost: roundPrice(averageCost) },
        },
      }
      if (opportunity.storyFlag) nextState = addStoryFlag(nextState, opportunity.storyFlag)
    }

    if (opportunity.type === 'redevelopment-grant' && opportunity.districtId) {
      nextState = {
        ...nextState,
        cash: nextState.cash + opportunity.value,
        districtStates: nextState.districtStates.map((item) =>
          item.districtId === opportunity.districtId
            ? { ...item, momentum: clamp(item.momentum + 5, -18, 22) }
            : item,
        ),
      }
      if (opportunity.storyFlag) nextState = addStoryFlag(nextState, opportunity.storyFlag)
    }

    if (opportunity.type === 'buyout-offer') {
      const targetBusiness = nextState.businesses.slice().sort((a, b) => getBusinessValue(b, nextState) - getBusinessValue(a, nextState))[0]
      if (!targetBusiness) return state
      const saleValue = Math.round(getBusinessValue(targetBusiness, nextState) * 1.26)
      nextState = {
        ...nextState,
        cash: nextState.cash + saleValue,
        businesses: nextState.businesses.filter((item) => item.uid !== targetBusiness.uid),
        reputation: clamp(nextState.reputation + 2, 0, 999),
      }
      if (opportunity.storyFlag) nextState = addStoryFlag(nextState, opportunity.storyFlag)
    }

    if (opportunity.type === 'housing-offer' && opportunity.housingTier) {
      if (opportunity.cashCost && nextState.cash < opportunity.cashCost) return state
      nextState = applyConditionShift(
        {
          ...nextState,
          cash: nextState.cash - (opportunity.cashCost ?? 0),
          housingTier: opportunity.housingTier,
        },
        { stress: -8, energy: 8, reputation: opportunity.value },
      )
      if (opportunity.storyFlag) nextState = addStoryFlag(nextState, opportunity.storyFlag)
    }

    if (opportunity.type === 'transport-deal' && opportunity.transportTier) {
      if (opportunity.cashCost && nextState.cash < opportunity.cashCost) return state
      nextState = applyConditionShift(
        {
          ...nextState,
          cash: nextState.cash - (opportunity.cashCost ?? 0),
          transportTier: opportunity.transportTier,
        },
        { stress: -4, energy: 6 },
      )
      if (opportunity.storyFlag) nextState = addStoryFlag(nextState, opportunity.storyFlag)
    }

    if (opportunity.type === 'community-connection') {
      nextState = adjustContact(adjustContact(applyConditionShift({ ...nextState, cash: nextState.cash + opportunity.value }, { stress: -3, reputation: 1 }), 'contractor', 4), 'broker', 3)
      if (opportunity.storyFlag) nextState = addStoryFlag(nextState, opportunity.storyFlag)
    }

    if (opportunity.type === 'tenant-relief') {
      nextState = applyConditionShift(
        {
          ...nextState,
          cash: nextState.cash + opportunity.value,
          complianceScore: clamp(nextState.complianceScore + 4, 0, 100),
        },
        { stress: -6, reputation: 1 },
      )
      if (opportunity.storyFlag) nextState = addStoryFlag(nextState, opportunity.storyFlag)
      nextState = addStoryFlag(nextState, 'room-lead-open')
    }

    nextState = adjustContact(nextState, opportunity.contactId, 3)

    return pushLog(nextState, opportunity.title, opportunity.detail, 'good')
  }

  if (action.type === 'BUY_STOCK') {
    const stock = state.market.find((item) => item.symbol === action.symbol)
    if (!stock) return state
    const fee = getTradingFee(state)
    const totalCost = stock.price * action.shares + fee
    if (state.cash < totalCost) return state
    const existing = state.holdings[stock.symbol]
    const shares = (existing?.shares ?? 0) + action.shares
    const averageCost = ((existing?.averageCost ?? 0) * (existing?.shares ?? 0) + stock.price * action.shares) / shares
    return pushLog(
      applyConditionShift(
        { ...state, cash: state.cash - totalCost, holdings: { ...state.holdings, [stock.symbol]: { shares, averageCost: roundPrice(averageCost) } } },
        { stress: state.bankAccount ? 1 : 2 },
      ),
      'Stock purchase',
      `You bought ${action.shares} share${action.shares > 1 ? 's' : ''} of ${stock.symbol} for ${money(totalCost)} including fees.${state.bankAccount ? '' : ' Trading without a bank account is possible, but the fee drag is brutal.'}`,
    )
  }

  if (action.type === 'SELL_STOCK') {
    const stock = state.market.find((item) => item.symbol === action.symbol)
    const existing = state.holdings[action.symbol]
    if (!stock || !existing || existing.shares < action.shares) return state
    const fee = getTradingFee(state)
    const proceeds = stock.price * action.shares - fee
    const holdings = { ...state.holdings }
    const remaining = existing.shares - action.shares
    if (remaining === 0) delete holdings[action.symbol]
    else holdings[action.symbol] = { ...existing, shares: remaining }
    return pushLog(applyConditionShift({ ...state, cash: state.cash + proceeds, holdings }, { stress: -2 }), 'Stock sale', `You sold ${action.shares} share${action.shares > 1 ? 's' : ''} of ${stock.symbol} and cleared ${money(proceeds)} after fees.`)
  }

  if (action.type === 'REPAY_DEBT') {
    if (state.cash <= 0 || state.debtAccounts.length === 0) return state
    const repayment = Math.min(action.amount, state.cash, state.debt)
    return pushLog(
      applyConditionShift(
        syncDebtState({ ...state, cash: state.cash - repayment, debtAccounts: applyDebtPayment(state.debtAccounts, repayment) }),
        { stress: -5 },
      ),
      'Debt payment',
      `You sent ${money(repayment)} toward your debt stack.`,
      'good',
    )
  }

  if (action.type === 'PAY_TAXES') {
    if (state.cash <= 0 || state.taxDue <= 0) return state
    const payment = Math.min(action.amount, state.cash, state.taxDue)
    return pushLog(
      { ...state, cash: state.cash - payment, taxDue: state.taxDue - payment, complianceScore: clamp(state.complianceScore + 1, 0, 100) },
      'Tax payment',
      `You paid ${money(payment)} toward your tax bill.`,
      'good',
    )
  }

  if (action.type === 'COMPLIANCE_REVIEW') {
    if (state.actionPoints <= 0 || state.cash < 280 || state.complianceScore >= 95) return state
    return pushLog(
      applyConditionShift(
        { ...state, actionPoints: state.actionPoints - 1, cash: state.cash - 280, complianceScore: clamp(state.complianceScore + 12, 0, 100) },
        { stress: -2, energy: -4 },
      ),
      'Compliance review',
      'You spent on bookkeeping, filings, and admin cleanup to reduce regulatory risk.',
      'good',
    )
  }

  if (action.type === 'TAKE_LOAN') {
    if (state.debt >= 9000) return state
    const principal = state.bankAccount ? 1500 : 1200
    const origination = state.bankAccount ? 75 : 180
    const created = createDebtAccount(state, {
      kind: 'microloan',
      label: state.bankAccount ? 'Personal microloan' : 'Street microloan',
      principal,
      monthlyRate: clamp(getInterestRate(state) + (state.bankAccount ? 0.004 : 0.012), 0.018, 0.048),
      minimumPayment: state.bankAccount ? 130 : 160,
      delinquentMonths: 0,
      securedPropertyUid: null,
    })
    return pushLog(
      applyConditionShift(
        syncDebtState({
          ...state,
          cash: state.cash + principal - origination,
          debtAccounts: [...state.debtAccounts, created.account],
          nextDebtId: created.nextDebtId,
        }),
        { stress: state.bankAccount ? 10 : 14, energy: -4 },
      ),
      'Microloan funded',
      `You took a ${money(principal)} loan and paid ${money(origination)} in origination costs.${state.bankAccount ? '' : ' Without banking history the terms were harsher.'}`,
      'bad',
    )
  }

  if (action.type === 'END_MONTH') {
    const event = randomItem(MONTHLY_EVENTS)
    const nextInflation = clamp(Number((state.inflation + event.inflationShift + randomBetween(-0.2, 0.2)).toFixed(1)), 1.2, 8.6)
    const nextBaseRate = clamp(Number((state.baseRate + event.baseRateShift + randomBetween(-0.15, 0.15)).toFixed(1)), 2.2, 7.4)
    const nextUnemployment = clamp(Number((state.unemployment + event.unemploymentShift + randomBetween(-0.2, 0.2)).toFixed(1)), 2.8, 9.6)
    const nextHousingDemand = clamp(Number((state.housingDemand + event.housingDemandShift + randomBetween(-0.8, 0.8)).toFixed(1)), -8, 10)
    const nextMarketSentiment = clamp(Number((state.marketSentiment + event.marketSentimentShift + randomBetween(-0.9, 0.9)).toFixed(1)), -10, 10)
    const nextPhase = getEconomyPhase({
      unemployment: nextUnemployment,
      housingDemand: nextHousingDemand,
      marketSentiment: nextMarketSentiment,
      baseRate: nextBaseRate,
    })

    const nextDistrictStates = state.districtStates.map((districtState) => {
      const district = DISTRICT_MAP[districtState.districtId]
      const swing = randomInt(-5, 5)
      const baseline = district.id === 'arts' ? 1 : district.id === 'harbor' ? -1 : 0
      const macroPull = Math.round(nextHousingDemand / 2 - nextBaseRate / 4 - nextUnemployment / 5)
      return {
        ...districtState,
        momentum: clamp(districtState.momentum + swing + baseline + macroPull, -18, 22),
      }
    })

    const nextState: GameState = {
      ...state,
      month: state.month + 1,
      ageMonths: state.ageMonths + 1,
      actionPoints: 2,
      savingsBalance: state.savingsBalance,
      economyPhase: nextPhase,
      inflation: nextInflation,
      baseRate: nextBaseRate,
      unemployment: nextUnemployment,
      housingDemand: nextHousingDemand,
      marketSentiment: nextMarketSentiment,
      market: state.market.map((stock) => ({ ...stock })),
      holdings: { ...state.holdings },
      bondHoldings: state.bondHoldings.map((holding) => ({ ...holding })),
      debtAccounts: state.debtAccounts.map((account) => ({ ...account })),
      districtStates: nextDistrictStates,
      rivals: state.rivals.map((rival) => ({ ...rival })),
      propertyListings: [],
      properties: state.properties.map((property) => ({ ...property })),
      businesses: state.businesses.map((business) => ({ ...business })),
      opportunities: [],
      storyFlags: [...state.storyFlags],
      history: [...state.history],
      log: [...state.log],
    }
    const currentJob = JOB_MAP[state.jobId]
    const notes: string[] = [event.detail]
    const currentEducation = state.educationEnrollment ? EDUCATION_PROGRAM_MAP[state.educationEnrollment.programId] : null
    const dividendMultiplier = hasUpgrade(state, 'broker-terminal') ? 1.25 : 1
    const lifestyleShift = getLifestyleConditionShift(state)
    const healthPenalty = state.health < 35 ? 0.88 : 1
    const energyPenalty = state.energy < 25 ? 0.92 : 1
    const stabilityPenalty = hasStableHousing(state) ? 1 : 0.82
    const bankingPenalty = state.bankAccount ? 1 : 0.95
    const educationPenalty = currentEducation ? 0.94 : 1
    const knowledgeBonus = 1 + Math.min(state.knowledge, 12) / 150
    const macroSalaryMultiplier = clamp(1.04 - nextUnemployment / 18 + nextMarketSentiment / 60, 0.72, 1.12)
    const salary = Math.round(currentJob.salary * healthPenalty * energyPenalty * stabilityPenalty * bankingPenalty * educationPenalty * knowledgeBonus * macroSalaryMultiplier)
    let cash = state.cash + salary
    let debt = state.debt
    let rentalIncome = 0
    let businessIncome = 0
    let maintenance = 0
    let dividends = 0
    let bondIncome = 0
    let savingsInterest = 0
    let interest = 0
    let debtService = 0
    let educationStress = 0
    let educationEnergy = 0
    let tenantStress = 0
    let tenantReputation = 0
    let businessStress = 0
    let rivalStress = 0
    let delinquentAccounts = 0

    nextState.rivals.forEach((rival) => {
      const playerPropertyCount = state.properties.filter((property) => property.districtId === rival.focusDistrictId).length
      const playerBusinessCount = state.businesses.filter((business) => business.districtId === rival.focusDistrictId).length
      const successSignal = playerPropertyCount + playerBusinessCount + (state.reputation >= 10 ? 1 : 0)
      rival.rivalry = clamp(rival.rivalry + successSignal + (nextPhase === 'boom' ? 1 : 0) - (nextPhase === 'recession' ? 1 : 0), 0, 100)
      rival.pressure = clamp(
        rival.pressure + randomInt(-3, 4) + (rival.specialty === 'property' ? Math.round(nextHousingDemand / 3) : 0) + (rival.specialty === 'business' ? Math.round(nextMarketSentiment / 4) : 0),
        6,
        44,
      )
      if (Math.random() < 0.32) {
        rival.focusDistrictId = nextDistrictStates.slice().sort((a, b) => b.momentum - a.momentum)[Math.floor(Math.random() * 2)].districtId
      }
    })
    nextState.propertyListings = generatePropertyListings({ month: state.month + 1, districtStates: nextDistrictStates, rivals: nextState.rivals })

    if (nextState.educationEnrollment) {
      const program = EDUCATION_PROGRAM_MAP[nextState.educationEnrollment.programId]
      educationStress += program.monthlyStress
      educationEnergy += program.monthlyEnergy
      nextState.educationEnrollment = {
        ...nextState.educationEnrollment,
        monthsRemaining: nextState.educationEnrollment.monthsRemaining - 1,
      }
      notes.push(`${program.title} stayed in progress and took another month of study time.`)

      if (nextState.educationEnrollment.monthsRemaining <= 0) {
        nextState.knowledge = clamp(nextState.knowledge + program.knowledgeReward, 0, 999)
        nextState.reputation = clamp(nextState.reputation + program.reputationReward, 0, 999)
        if (program.certificationReward && !nextState.certifications.includes(program.certificationReward)) {
          nextState.certifications = [...nextState.certifications, program.certificationReward]
        }
        nextState.educationEnrollment = null
        notes.push(`${program.title} finished this month and added ${program.knowledgeReward} knowledge.`)
      }
    }

    nextState.properties.forEach((property) => {
      const template = PROPERTY_MAP[property.templateId]
      const district = DISTRICT_MAP[property.districtId]
      maintenance += getPropertyUpkeep(property, nextState)
      if (property.rented) {
        const tenant = property.tenantProfileId ? TENANT_PROFILE_MAP[property.tenantProfileId] : assignTenantProfile(property)
        property.tenantProfileId = tenant.id
        const scheduledRent = getPropertyRent(property, nextState, event)
        const lateRisk = clamp(0.18 - tenant.reliability * 0.11 + district.risk * 0.25 + Math.max(0, -nextHousingDemand) / 50, 0.04, 0.45)
        const defaultRisk = clamp(0.12 - tenant.reliability * 0.09 + district.risk * 0.2 + Math.max(0, nextUnemployment - 5) / 35, 0.02, 0.28)
        const paymentRoll = Math.random()

        if (paymentRoll < defaultRisk) {
          property.rented = false
          property.tenantProfileId = null
          property.leaseMonthsRemaining = 0
          property.missedPayments = 0
          tenantStress += 5
          tenantReputation -= 1
          notes.push(`${template.title} in ${district.name} went into default and the unit came back vacant.`)
        } else if (paymentRoll < defaultRisk + lateRisk) {
          const collected = Math.round(scheduledRent * 0.72)
          rentalIncome += collected
          property.missedPayments += 1
          tenantStress += 3
          notes.push(`${template.title} in ${district.name} only collected ${money(collected)} after a late payment.`)
        } else {
          rentalIncome += scheduledRent
          property.missedPayments = Math.max(0, property.missedPayments - 1)
        }

        if (property.rented && Math.random() < (hasUpgrade(state, 'tenant-crm') ? 0.06 : 0.12) + district.risk + (property.condition < 55 ? 0.07 : 0) + Math.max(0, -nextHousingDemand) / 100) {
          property.rented = false
          property.tenantProfileId = null
          property.leaseMonthsRemaining = 0
          property.missedPayments = 0
          notes.push(`${template.title} in ${district.name} lost its tenant and needs relisting.`)
        }
        if (property.rented && Math.random() < (property.condition < 50 ? 0.3 : 0.13) + district.risk * 0.35 + tenant.wear) {
          const repairBill = Math.round(getPropertyUpkeep(property, nextState) * (property.condition < 50 ? 1.7 : 1.2))
          maintenance += repairBill
          property.condition = clamp(property.condition - 6, 25, 100)
          notes.push(`${template.title} in ${district.name} needed ${money(repairBill)} in surprise repairs.`)
        }
        if (property.rented) {
          property.leaseMonthsRemaining = Math.max(0, property.leaseMonthsRemaining - 1)
          if (property.leaseMonthsRemaining === 0) {
            const renewalChance = clamp(tenant.reliability + property.condition / 180 + nextHousingDemand / 30 - nextUnemployment / 28, 0.2, 0.95)
            if (Math.random() < renewalChance) {
              property.leaseMonthsRemaining = randomInt(6, tenant.id === 'business' ? 18 : 12)
              notes.push(`${template.title} in ${district.name} renewed its lease.`)
            } else {
              property.rented = false
              property.tenantProfileId = null
              property.missedPayments = 0
              notes.push(`${template.title} in ${district.name} reached lease end and rolled vacant.`)
            }
          }
        }
      }
      property.condition = clamp(property.condition - randomInt(property.rented ? 4 : 1, property.rented ? 9 : 4), 20, 100)
    })

    nextState.businesses.forEach((business) => {
      const template = BUSINESS_MAP[business.templateId]
      if (!business.active) return

      const rivalPressure = nextState.rivals
        .filter((rival) => rival.specialty === 'business' && rival.focusDistrictId === business.districtId)
        .reduce((total, rival) => total + rival.pressure, 0)
      const profit = getBusinessMonthlyProfit(business, nextState) - rivalPressure * 6
      businessIncome += profit
      business.monthsOperating += 1

      const incidentRisk = clamp(0.08 + Math.max(0, nextUnemployment - 5) / 20 + (business.condition < 55 ? 0.1 : 0), 0.05, 0.4)
      if (Math.random() < incidentRisk) {
        const incidentCost = randomInt(180, 620)
        businessIncome -= incidentCost
        business.condition = clamp(business.condition - randomInt(5, 12), 15, 100)
        businessStress += 3
        notes.push(`${template.title} took an operational hit and burned ${money(incidentCost)} in cleanup costs.`)
      }

      if (profit < 0) {
        businessStress += 2
        business.condition = clamp(business.condition - 4, 15, 100)
      } else if (profit > 0 && business.condition < 90) {
        business.condition = clamp(business.condition - randomInt(1, 3), 15, 100)
      }
    })

    const hottestRival = nextState.rivals.slice().sort((a, b) => b.rivalry - a.rivalry)[0]
    if (hottestRival) {
      const contestedAssets =
        state.properties.filter((property) => property.districtId === hottestRival.focusDistrictId).length +
        state.businesses.filter((business) => business.districtId === hottestRival.focusDistrictId).length
      if (contestedAssets > 0 && hottestRival.rivalry >= 18) {
        rivalStress += 2
        notes.push(`${hottestRival.name} is leaning harder into ${DISTRICT_MAP[hottestRival.focusDistrictId].name}, making the area more competitive.`)
      }
    }

    cash += rentalIncome
    cash += businessIncome

    nextState.market.forEach((stock) => {
      const holding = nextState.holdings[stock.symbol]
      if (holding) dividends += holding.shares * stock.dividend * dividendMultiplier
      const macroMove = nextMarketSentiment / 220 + (nextPhase === 'recession' ? -0.01 : nextPhase === 'boom' ? 0.008 : 0)
      const move = stock.drift + event.marketBoost + macroMove + (event.sectorBoosts[stock.sector] ?? 0) + randomBetween(-stock.volatility, stock.volatility) + (hasUpgrade(state, 'broker-terminal') ? 0.006 : 0)
      const previousPrice = stock.price
      stock.price = roundPrice(Math.max(4, stock.price * (1 + move)))
      stock.change = Number((((stock.price - previousPrice) / previousPrice) * 100).toFixed(1))
    })

    nextState.bondHoldings = nextState.bondHoldings
      .map((holding) => {
        bondIncome += holding.principal * holding.couponRate
        const nextMonthsRemaining = holding.monthsRemaining - 1
        if (nextMonthsRemaining <= 0) {
          cash += holding.principal
          notes.push(`${BOND_MAP[holding.templateId].title} matured and returned ${money(holding.principal)}.`)
          return null
        }
        return { ...holding, monthsRemaining: nextMonthsRemaining }
      })
      .filter((holding): holding is GameState['bondHoldings'][number] => holding !== null)

    if (state.bankAccount && nextState.savingsBalance > 0) {
      savingsInterest = Math.round(nextState.savingsBalance * getSavingsRate(state))
      nextState.savingsBalance += savingsInterest
    }

    cash += Math.round(dividends)
    cash += Math.round(bondIncome)
    cash -= maintenance

    const livingCost = getLivingCost(state)
    const effectiveDebtRate =
      state.debtAccounts.length > 0 && state.debt > 0
        ? state.debtAccounts.reduce((total, account) => total + account.principal * account.monthlyRate, 0) / state.debt
        : getInterestRate(state)
    cash -= livingCost
    nextState.debtAccounts = nextState.debtAccounts
      .map((account) => {
        const interestCharge = Math.round(account.principal * account.monthlyRate)
        const principalWithInterest = account.principal + interestCharge
        const inDeferment = (account.deferMonthsRemaining ?? 0) > 0
        const due = inDeferment ? 0 : Math.min(principalWithInterest, account.minimumPayment)
        const nextAccount = {
          ...account,
          principal: principalWithInterest,
          deferMonthsRemaining: inDeferment ? Math.max(0, (account.deferMonthsRemaining ?? 0) - 1) : account.deferMonthsRemaining,
        }
        interest += interestCharge

        if (due === 0) {
          return nextAccount
        }

        if (cash >= due) {
          cash -= due
          debtService += due
          nextAccount.principal = Math.max(0, principalWithInterest - due)
          nextAccount.delinquentMonths = 0
        } else {
          const lateFee = Math.max(18, Math.round(account.minimumPayment * 0.18))
          nextAccount.principal = principalWithInterest + lateFee
          nextAccount.delinquentMonths += 1
          delinquentAccounts += 1
          interest += lateFee
          if (nextAccount.delinquentMonths >= 3) {
            nextAccount.minimumPayment = Math.max(nextAccount.minimumPayment, Math.round(nextAccount.principal * 0.16))
          }
        }

        return nextAccount
      })
      .filter((account) => account.principal > 0)

    debt = getDebtTotal(nextState)
    const monthlyTaxAccrual = getMonthlyTaxEstimate(nextState, rentalIncome + businessIncome + dividends + bondIncome + savingsInterest, salary)
    nextState.taxDue = state.taxDue + monthlyTaxAccrual
    nextState.complianceScore = clamp(
      state.complianceScore - state.properties.length - state.businesses.length * 2 - (state.taxDue > 0 ? 1 : 0),
      0,
      100,
    )

    const complianceRisk = getComplianceRisk(nextState)
    if (Math.random() < complianceRisk / 240) {
      const fine = randomInt(180, 720)
      cash -= fine
      nextState.complianceScore = clamp(nextState.complianceScore - 8, 0, 100)
      notes.push(`A compliance issue cost ${money(fine)} in filings, penalties, and admin cleanup.`)
    }

    if (state.month % 12 === 0) {
      const filingPenalty = nextState.complianceScore < 55 ? randomInt(120, 480) : 0
      const filingPayment = Math.min(cash, nextState.taxDue + filingPenalty)
      cash -= filingPayment
      const remainingTax = nextState.taxDue + filingPenalty - filingPayment
      nextState.taxDue = 0
      if (remainingTax > 0) {
        const created = createDebtAccount(nextState, {
          kind: 'tax',
          label: 'Rolled tax balance',
          principal: remainingTax,
          monthlyRate: clamp(getInterestRate(nextState) + 0.004, 0.018, 0.04),
          minimumPayment: Math.max(80, Math.round(remainingTax * 0.14)),
          delinquentMonths: 0,
          securedPropertyUid: null,
        })
        nextState.debtAccounts = [...nextState.debtAccounts, created.account]
        nextState.nextDebtId = created.nextDebtId
        debt = getDebtTotal(nextState)
        nextState.complianceScore = clamp(nextState.complianceScore - 14, 0, 100)
        notes.push(`Annual filing hit short cash. ${money(remainingTax)} rolled into debt after penalties.`)
      } else {
        nextState.complianceScore = clamp(nextState.complianceScore + 4, 0, 100)
        notes.push(`Annual filing cleared ${money(filingPayment)} in taxes and admin costs.`)
      }
    }

    nextState.cash = Math.round(cash)
    nextState.debt = Math.round(debt)

    let stressShift = 1 + lifestyleShift.stress
    if (state.debt > 4000) stressShift += 4
    if (state.cash < 250) stressShift += 3
    if (getPassiveIncomePreview(state) > livingCost) stressShift -= 5
    if (state.energy < 30) stressShift += 2
    if (!hasStableHousing(state)) stressShift += 5
    if (!state.bankAccount) stressShift += 2
    if (nextPhase === 'recession') stressShift += 4
    if (nextPhase === 'boom') stressShift -= 2
    stressShift += tenantStress
    stressShift += businessStress
    stressShift += rivalStress
    stressShift += educationStress

    let healthShift = (state.stress > 70 ? -6 : state.stress < 35 ? 3 : -1) + lifestyleShift.health
    if (state.energy < 25) healthShift -= 3
    if (state.health > 75 && state.stress < 40) healthShift += 1

    let energyShift = 16 - Math.floor(state.stress / 18) + lifestyleShift.energy
    if (state.health < 35) energyShift -= 4
    if (state.cash === 0) energyShift -= 3
    energyShift -= educationEnergy

    Object.assign(nextState, applyConditionShift(nextState, { stress: stressShift, health: healthShift, energy: energyShift, reputation: tenantReputation + lifestyleShift.reputation }))

    const lifeEventPool = getLifeEventPool(state)
    const lifeEventChance = state.month <= 4 || state.housingTier === 'shelter' || state.foodTier === 'skip-meals'
      ? 0.92
      : state.stress > 60 || state.health < 45
        ? 0.85
        : 0.6
    const lifeEvent = Math.random() < lifeEventChance ? randomItem(lifeEventPool) : null
    const stateAfterLife = lifeEvent ? applyLifeEvent(nextState, lifeEvent) : nextState

    let creditShift = 0
    let bankShift = 0
    if (stateAfterLife.cash === 0) {
      creditShift -= 16
      bankShift -= 5
    } else if (salary + rentalIncome + businessIncome + dividends - maintenance - livingCost - interest > 0) {
      creditShift += state.bankAccount ? 6 : 2
      bankShift += state.bankAccount ? 2 : 0
    }
    if (state.debt > 8000) creditShift -= 10
    if (state.debt < 2500) bankShift += 1
    if (!state.bankAccount) {
      creditShift -= 4
      bankShift -= 1
    }
    if (!hasStableHousing(state)) {
      creditShift -= 3
      bankShift -= 2
    }
    if (delinquentAccounts > 0) {
      creditShift -= 10 + delinquentAccounts * 3
      bankShift -= 4 + delinquentAccounts
    }
    if (nextPhase === 'recession') {
      creditShift -= 4
      bankShift -= 2
    }
    if (nextPhase === 'boom') bankShift += 2
    stateAfterLife.creditScore = clamp(state.creditScore + creditShift, 300, 850)
    stateAfterLife.bankTrust = clamp(state.bankTrust + bankShift, 0, 100)

    const hottestDistrict = nextDistrictStates.slice().sort((a, b) => b.momentum - a.momentum)[0]
    const coldestDistrict = nextDistrictStates.slice().sort((a, b) => a.momentum - b.momentum)[0]

    notes.unshift(`Salary ${money(salary)}, rent ${money(rentalIncome)}, business ${money(businessIncome)}, dividends ${money(dividends)}, bonds ${money(bondIncome)}.`)
    if (salary < currentJob.salary) notes.push('Your condition cut into your monthly job performance.')
    if (!hasStableHousing(state)) notes.push('Unstable housing shaved income and recovery this month.')
    if (!state.bankAccount) notes.push('Working and trading without a bank account kept fees and financing terms ugly.')
    if (state.transportTier === 'foot') notes.push('Walking and public transit kept your commute fragile this month.')
    if (state.foodTier === 'skip-meals') notes.push('Running on skipped meals made the month physically harsher.')
    notes.push(`Upkeep was ${money(maintenance)} and living costs were ${money(livingCost)}.`)
    if (savingsInterest > 0) notes.push(`Savings paid ${money(savingsInterest)} at ${(getSavingsRate(state) * 100).toFixed(1)}%.`)
    notes.push(`Debt service was ${money(debtService)} and finance charges added ${money(interest)} at an effective ${(effectiveDebtRate * 100).toFixed(1)}%.`)
    notes.push(`Taxes accrued ${money(monthlyTaxAccrual)}. Tax due is now ${money(nextState.taxDue)} and compliance score is ${nextState.complianceScore}.`)
    notes.push(`Lifestyle: ${state.housingTier}, ${state.transportTier}, ${state.foodTier}, ${state.wellnessTier}.`)
    notes.push(`Macro regime is ${nextPhase} with inflation at ${nextInflation.toFixed(1)}%, unemployment at ${nextUnemployment.toFixed(1)}%, housing demand ${nextHousingDemand >= 0 ? '+' : ''}${nextHousingDemand.toFixed(1)}, and sentiment ${nextMarketSentiment >= 0 ? '+' : ''}${nextMarketSentiment.toFixed(1)}.`)
    notes.push(`${DISTRICT_MAP[hottestDistrict.districtId].name} is heating up. ${DISTRICT_MAP[coldestDistrict.districtId].name} is cooling off.`)
    notes.push(`${hottestRival.name} is the loudest rival right now, focused on ${DISTRICT_MAP[hottestRival.focusDistrictId].name}.`)
    notes.push(`Credit is now ${stateAfterLife.creditScore} and bank trust is ${stateAfterLife.bankTrust}.`)
    if (delinquentAccounts > 0) notes.push(`${delinquentAccounts} debt account${delinquentAccounts > 1 ? 's were' : ' was'} delinquent this month.`)
    if (stateAfterLife.opportunities.length > 0) notes.push(`${stateAfterLife.opportunities.length} contact-driven opportunities opened up this month.`)

    if (stateAfterLife.cash < 0) {
      const rollover = Math.abs(stateAfterLife.cash)
      const created = createDebtAccount(stateAfterLife, {
        kind: 'overdraft',
        label: 'Emergency rollover',
        principal: rollover,
        monthlyRate: clamp(getInterestRate(stateAfterLife) + 0.012, 0.022, 0.05),
        minimumPayment: Math.max(65, Math.round(rollover * 0.18)),
        delinquentMonths: 0,
        securedPropertyUid: null,
      })
      stateAfterLife.debtAccounts = [...stateAfterLife.debtAccounts, created.account]
      stateAfterLife.nextDebtId = created.nextDebtId
      notes.push(`You had to float ${money(Math.abs(stateAfterLife.cash))} on credit to survive the month.`)
      stateAfterLife.cash = 0
      stateAfterLife.stress = clamp(stateAfterLife.stress + 8, 0, 100)
    }

    Object.assign(stateAfterLife, syncDebtState(stateAfterLife))
    stateAfterLife.opportunities = generateOpportunities(stateAfterLife)

    if (lifeEvent) notes.push(`Life event: ${lifeEvent.title}.`)

    const snapshot: MonthlySnapshot = {
      month: stateAfterLife.month,
      cash: stateAfterLife.cash,
      savingsBalance: stateAfterLife.savingsBalance,
      debt: stateAfterLife.debt,
      netWorth: getNetWorth(stateAfterLife),
      salary,
      rentalIncome,
      businessIncome,
      dividends: Math.round(dividends),
      bondIncome: Math.round(bondIncome),
      savingsInterest,
      maintenance,
      livingCost,
      interest,
      debtService,
      taxesAccrued: monthlyTaxAccrual,
      passiveIncome: getPassiveIncomePreview(stateAfterLife),
    }
    stateAfterLife.history = [...stateAfterLife.history, snapshot].slice(-24)

    return pushLog(stateAfterLife, event.title, notes.join(' '), salary + rentalIncome + businessIncome + dividends + bondIncome + savingsInterest - maintenance - livingCost - debtService >= 0 ? 'good' : 'bad')
  }

  return state
}
