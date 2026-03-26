export type Tone = 'good' | 'bad' | 'neutral'

export type MediaAsset = {
  imageUrl?: string
  imageAlt?: string
  imageCreditLabel?: string
  imageCreditUrl?: string
}

export type Job = MediaAsset & {
  id: string
  title: string
  salary: number
  reputationRequired: number
  certifications: string[]
  description: string
}

export type Gig = MediaAsset & {
  id: string
  title: string
  payout: number
  reputationRequired: number
  certifications: string[]
  description: string
  needsProperty?: boolean
}

export type SideJob = MediaAsset & {
  id: string
  title: string
  category: 'shift' | 'internship' | 'seasonal' | 'freelance'
  schedule: 'daytime' | 'evening' | 'weekend' | 'flex'
  commitment: 'light' | 'medium' | 'heavy'
  weeklyPay: number
  reputationRequired: number
  certifications: string[]
  description: string
  weeklyStress: number
  weeklyEnergy: number
  reputationGain: number
  knowledgeGain?: number
  contactId?: string
  seasonMonths?: number[]
  bankAccountRequired?: boolean
}

export type Course = MediaAsset & {
  id: string
  title: string
  cost: number
  reputationRequired: number
  description: string
}

export type Upgrade = MediaAsset & {
  id: string
  title: string
  cost: number
  description: string
}

export type HousingTier = 'shelter' | 'shared' | 'studio' | 'apartment'

export type TransportTier = 'foot' | 'bike' | 'scooter' | 'car'

export type FoodTier = 'skip-meals' | 'cheap-eats' | 'balanced' | 'fresh'

export type WellnessTier = 'none' | 'stretch' | 'gym' | 'therapy'

export type LifestyleCategory = 'housing' | 'transport' | 'food' | 'wellness'

export type PersonalActionCategory = 'recovery' | 'leisure' | 'social'

export type DebtKind = 'survival' | 'microloan' | 'mortgage' | 'tax' | 'overdraft' | 'student' | 'credit-card' | 'business-loan'

export type PropertyTemplate = MediaAsset & {
  id: string
  title: string
  cost: number
  baseRent: number
  upkeep: number
  reputationRequired: number
  description: string
}

export type TenantProfile = {
  id: string
  label: string
  description: string
  rentModifier: number
  reliability: number
  wear: number
  preferredDistricts?: string[]
  commercialOnly?: boolean
}

export type OwnedProperty = {
  uid: string
  templateId: string
  districtId: string
  purchasePrice: number
  mortgageBalance: number
  condition: number
  rented: boolean
  tenantProfileId: string | null
  leaseMonthsRemaining: number
  missedPayments: number
}

export type District = {
  id: string
  name: string
  description: string
  theme: string
  vibe: string
  accent: string
  glow: string
  costMultiplier: number
  rentMultiplier: number
  upkeepMultiplier: number
  risk: number
}

export type DistrictState = {
  districtId: string
  momentum: number
}

export type PropertyListing = {
  id: string
  templateId: string
  districtId: string
  askingPrice: number
}

export type BusinessTemplate = MediaAsset & {
  id: string
  title: string
  cost: number
  baseRevenue: number
  baseExpense: number
  reputationRequired: number
  description: string
  preferredDistricts?: string[]
}

export type OwnedBusiness = {
  uid: string
  templateId: string
  districtId: string
  purchasePrice: number
  condition: number
  marketing: number
  staffing: number
  active: boolean
  monthsOperating: number
}

export type Stock = MediaAsset & {
  symbol: string
  name: string
  sector: string
  assetType: 'stock' | 'etf'
  thesis: string
  price: number
  drift: number
  volatility: number
  dividend: number
  change: number
  expenseRatio?: number
  earningsMonth?: number
}

export type Holding = {
  shares: number
  averageCost: number
}

export type BondTemplate = MediaAsset & {
  id: string
  title: string
  description: string
  termMonths: number
  spread: number
  minPurchase: number
  risk: 'treasury' | 'investment-grade' | 'high-yield'
}

export type BondHolding = {
  uid: string
  templateId: string
  principal: number
  couponRate: number
  purchaseRate: number
  monthsRemaining: number
}

export type DebtAccount = {
  uid: string
  kind: DebtKind
  label: string
  principal: number
  monthlyRate: number
  minimumPayment: number
  delinquentMonths: number
  deferMonthsRemaining?: number
  creditLimit?: number
  linkedBusinessUid?: string | null
  securedPropertyUid?: string | null
}

export type EducationProgram = MediaAsset & {
  id: string
  title: string
  description: string
  durationMonths: number
  totalCost: number
  reputationRequired: number
  monthlyStress: number
  monthlyEnergy: number
  knowledgeReward: number
  reputationReward: number
  certificationReward?: string
}

export type EducationEnrollment = {
  programId: string
  monthsRemaining: number
  financed: boolean
}

export type LogEntry = {
  id: string
  week: number
  month: number
  title: string
  detail: string
  tone: Tone
}

export type MarketNews = {
  id: string
  week: number
  month: number
  symbol: string
  title: string
  detail: string
  tone: Tone
}

export type MarketHistoryPoint = {
  week: number
  month: number
  price: number
}

export type PersonalAction = MediaAsset & {
  id: string
  title: string
  category: PersonalActionCategory
  cashCost: number
  actionCost: number
  description: string
  oncePerWeek: boolean
  effects: {
    stress?: number
    energy?: number
    health?: number
    reputation?: number
  }
  contactId?: string
  storyFlag?: string
}

export type MonthlySnapshot = {
  month: number
  cash: number
  savingsBalance: number
  debt: number
  netWorth: number
  salary: number
  rentalIncome: number
  businessIncome: number
  dividends: number
  bondIncome: number
  savingsInterest: number
  maintenance: number
  livingCost: number
  interest: number
  debtService: number
  taxesAccrued: number
  passiveIncome: number
}

export type MonthlyEvent = {
  title: string
  detail: string
  marketBoost: number
  propertyRentBoost: number
  sectorBoosts: Record<string, number>
  inflationShift: number
  baseRateShift: number
  unemploymentShift: number
  housingDemandShift: number
  marketSentimentShift: number
}

export type LifeEvent = {
  id: string
  title: string
  detail: string
  cash?: number
  debt?: number
  stress?: number
  health?: number
  energy?: number
  reputation?: number
  bankAccount?: boolean
  housingTier?: HousingTier
  transportTier?: TransportTier
  storyFlags?: string[]
  tone: Tone
}

export type Contact = MediaAsset & {
  id: string
  name: string
  role: string
  description: string
  perk: string
}

export type ContactState = {
  contactId: string
  relationship: number
}

export type Rival = MediaAsset & {
  id: string
  name: string
  archetype: string
  description: string
  specialty: 'property' | 'stocks' | 'business'
  focusDistrictId: string
  pressure: number
  rivalry: number
}

export type Opportunity = {
  id: string
  type:
    | 'offmarket-property'
    | 'job-lead'
    | 'referral-bonus'
    | 'discounted-renovation'
    | 'distressed-property'
    | 'distressed-business'
    | 'market-dislocation'
    | 'redevelopment-grant'
    | 'buyout-offer'
    | 'housing-offer'
    | 'transport-deal'
    | 'community-connection'
    | 'tenant-relief'
  title: string
  detail: string
  contactId: string
  districtId?: string
  listingId?: string
  businessTemplateId?: string
  symbol?: string
  shares?: number
  cashCost?: number
  storyFlag?: string
  value: number
  housingTier?: HousingTier
  transportTier?: TransportTier
}

export type GameState = {
  week: number
  weekOfMonth: number
  month: number
  ageMonths: number
  actionPoints: number
  cash: number
  savingsBalance: number
  debt: number
  taxDue: number
  complianceScore: number
  economyPhase: 'fragile' | 'expansion' | 'boom' | 'slowdown' | 'recession'
  inflation: number
  baseRate: number
  unemployment: number
  housingDemand: number
  marketSentiment: number
  creditScore: number
  bankTrust: number
  reputation: number
  knowledge: number
  stress: number
  health: number
  energy: number
  bankAccount: boolean
  housingTier: HousingTier
  transportTier: TransportTier
  foodTier: FoodTier
  wellnessTier: WellnessTier
  personalActionsUsedThisWeek: string[]
  jobId: string
  sideJobIds: string[]
  certifications: string[]
  upgrades: string[]
  educationEnrollment: EducationEnrollment | null
  market: Stock[]
  holdings: Record<string, Holding>
  watchlist: string[]
  marketNews: MarketNews[]
  marketHistory: Record<string, MarketHistoryPoint[]>
  bondHoldings: BondHolding[]
  debtAccounts: DebtAccount[]
  districtStates: DistrictState[]
  propertyListings: PropertyListing[]
  contacts: ContactState[]
  rivals: Rival[]
  opportunities: Opportunity[]
  storyFlags: string[]
  properties: OwnedProperty[]
  businesses: OwnedBusiness[]
  nextBondId: number
  nextDebtId: number
  nextBusinessId: number
  nextPropertyId: number
  history: MonthlySnapshot[]
  log: LogEntry[]
}

export type GameAction =
  | { type: 'RESET' }
  | { type: 'TAKE_JOB'; jobId: string }
  | { type: 'TAKE_SIDE_JOB'; sideJobId: string }
  | { type: 'DROP_SIDE_JOB'; sideJobId: string }
  | { type: 'RUN_GIG'; gigId: string }
  | { type: 'OPEN_BANK_ACCOUNT' }
  | { type: 'OPEN_CREDIT_CARD' }
  | { type: 'RUN_PERSONAL_ACTION'; personalActionId: string }
  | { type: 'SET_LIFESTYLE'; category: LifestyleCategory; tier: HousingTier | TransportTier | FoodTier | WellnessTier }
  | { type: 'DEPOSIT_SAVINGS'; amount: number }
  | { type: 'WITHDRAW_SAVINGS'; amount: number }
  | { type: 'CHARGE_CREDIT_CARD'; amount: number }
  | { type: 'BUY_BOND'; bondId: string; amount: number }
  | { type: 'SELL_BOND'; bondUid: string }
  | { type: 'ENROLL_EDUCATION'; programId: string; financing: 'cash' | 'student-loan' }
  | { type: 'BUY_COURSE'; courseId: string }
  | { type: 'BUY_UPGRADE'; upgradeId: string }
  | { type: 'BUY_PROPERTY'; listingId: string; financing: 'cash' | 'mortgage' }
  | { type: 'BUY_BUSINESS'; templateId: string; districtId: string }
  | { type: 'TAKE_BUSINESS_LOAN'; businessUid: string }
  | { type: 'CLAIM_OPPORTUNITY'; opportunityId: string }
  | { type: 'TOGGLE_RENTAL'; propertyUid: string }
  | { type: 'EVICT_TENANT'; propertyUid: string }
  | { type: 'RENOVATE_PROPERTY'; propertyUid: string }
  | { type: 'SELL_PROPERTY'; propertyUid: string }
  | { type: 'REFINANCE_PROPERTY'; propertyUid: string }
  | { type: 'INVEST_IN_BUSINESS'; businessUid: string; focus: 'marketing' | 'staffing' | 'maintenance' }
  | { type: 'TOGGLE_BUSINESS'; businessUid: string }
  | { type: 'SELL_BUSINESS'; businessUid: string }
  | { type: 'BUY_STOCK'; symbol: string; shares: number }
  | { type: 'SELL_STOCK'; symbol: string; shares: number }
  | { type: 'TOGGLE_WATCHLIST'; symbol: string }
  | { type: 'REPAY_DEBT'; amount: number }
  | { type: 'PAY_TAXES'; amount: number }
  | { type: 'COMPLIANCE_REVIEW' }
  | { type: 'TAKE_LOAN' }
  | { type: 'END_WEEK' }
  | { type: 'END_MONTH' }
