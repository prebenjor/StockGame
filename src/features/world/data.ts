import type { Contact, District, LifeEvent, MonthlyEvent, Rival } from '../../game/core/types'

export const MONTHLY_EVENTS: MonthlyEvent[] = [
  {
    title: 'Quiet month',
    detail: 'Nothing huge moved the tape, so execution mattered more than luck.',
    marketBoost: 0,
    propertyRentBoost: 0,
    sectorBoosts: {},
    inflationShift: 0,
    baseRateShift: 0,
    unemploymentShift: 0,
    housingDemandShift: 0,
    marketSentimentShift: 0,
  },
  {
    title: 'Rate cut rally',
    detail: 'Growth names ripped higher as risk appetite came back fast.',
    marketBoost: 0.018,
    propertyRentBoost: 0,
    sectorBoosts: { tech: 0.028, mobility: 0.018 },
    inflationShift: -0.1,
    baseRateShift: -0.25,
    unemploymentShift: -0.2,
    housingDemandShift: 1.2,
    marketSentimentShift: 2.4,
  },
  {
    title: 'Housing squeeze',
    detail: 'Rental demand spiked across the city and property names firmed up.',
    marketBoost: 0.004,
    propertyRentBoost: 0.12,
    sectorBoosts: { 'real-estate': 0.025 },
    inflationShift: 0.2,
    baseRateShift: 0.1,
    unemploymentShift: -0.1,
    housingDemandShift: 2.2,
    marketSentimentShift: 0.8,
  },
  {
    title: 'Energy shock',
    detail: 'Power contracts repriced higher and defensive utilities outperformed.',
    marketBoost: -0.004,
    propertyRentBoost: 0,
    sectorBoosts: { energy: 0.04, consumer: -0.01 },
    inflationShift: 0.55,
    baseRateShift: 0.2,
    unemploymentShift: 0.1,
    housingDemandShift: -0.6,
    marketSentimentShift: -1.1,
  },
  {
    title: 'Risk-off panic',
    detail: 'Speculative names sold off as everyone suddenly rediscovered fear.',
    marketBoost: -0.03,
    propertyRentBoost: -0.04,
    sectorBoosts: { tech: -0.03, mobility: -0.04, health: -0.01 },
    inflationShift: -0.2,
    baseRateShift: 0.15,
    unemploymentShift: 0.55,
    housingDemandShift: -1.5,
    marketSentimentShift: -2.6,
  },
  {
    title: 'Consumer rebound',
    detail: 'Street spending improved and Main Street names caught a bid.',
    marketBoost: 0.01,
    propertyRentBoost: 0.03,
    sectorBoosts: { consumer: 0.03, 'real-estate': 0.01 },
    inflationShift: 0.1,
    baseRateShift: -0.1,
    unemploymentShift: -0.35,
    housingDemandShift: 0.8,
    marketSentimentShift: 1.4,
  },
]

export const LIFE_EVENTS: LifeEvent[] = [
  { id: 'clinic', title: 'Walk-in clinic bill', detail: 'A routine medical issue turned into an out-of-pocket expense.', cash: -180, health: -6, stress: 8, tone: 'bad' },
  { id: 'burnout', title: 'Burnout week', detail: 'Too many shifts and too little recovery dragged your energy down.', energy: -18, health: -4, stress: 14, tone: 'bad' },
  { id: 'gift', title: 'Family cash gift', detail: 'Someone in your corner sent help right when you needed it.', cash: 220, stress: -6, tone: 'good' },
  { id: 'broken-phone', title: 'Broken phone', detail: 'A cracked phone forced an annoying replacement.', cash: -140, stress: 6, energy: -4, tone: 'bad' },
  { id: 'community-help', title: 'Neighborhood favor', detail: 'Helping out locally earned you trust and a few useful introductions.', reputation: 1, stress: -4, storyFlags: ['neighbor-network-open'], tone: 'good' },
  { id: 'flu', title: 'Rough flu week', detail: 'You pushed through it, but it still cost you physically.', health: -10, energy: -16, stress: 10, tone: 'bad' },
  { id: 'rest', title: 'Solid recovery month', detail: 'A rare stretch of decent sleep and fewer emergencies helped you reset.', health: 8, energy: 12, stress: -10, tone: 'good' },
  { id: 'fee', title: 'Admin fee surprise', detail: 'A boring paperwork problem turned into another small bill.', cash: -90, stress: 5, tone: 'bad' },
]

export const HOUSING_SURVIVAL_EVENTS: LifeEvent[] = [
  { id: 'shelter-full', title: 'Shelter turned you away', detail: 'The shelter ran out of beds and you lost most of a night trying to find somewhere safe to sleep.', energy: -16, health: -4, stress: 14, storyFlags: ['room-lead-open'], tone: 'bad' },
  { id: 'stolen-locker', title: 'Locker got raided', detail: 'A few essentials disappeared from your storage setup and replacing them cost real cash.', cash: -85, stress: 9, energy: -4, tone: 'bad' },
  { id: 'hygiene-hit', title: 'Rough hygiene week', detail: 'Bad access to showers and laundry hurt your confidence and how people read you.', reputation: -1, stress: 7, energy: -5, storyFlags: ['room-lead-open'], tone: 'bad' },
]

export const SHARED_HOUSING_EVENTS: LifeEvent[] = [
  { id: 'slumlord', title: 'Bad landlord pressure', detail: 'A sloppy landlord pushed fees and threats into a living setup that already felt fragile.', cash: -95, stress: 11, reputation: -1, storyFlags: ['tenant-relief-open'], tone: 'bad' },
  { id: 'roommate-chaos', title: 'Roommate chaos', detail: 'Shared housing stayed technically stable, but it wrecked sleep and focus for the month.', energy: -10, stress: 8, storyFlags: ['room-lead-open'], tone: 'bad' },
]

export const TRANSPORT_SURVIVAL_EVENTS: LifeEvent[] = [
  { id: 'missed-connection', title: 'Missed a connection', detail: 'A bad transit chain cost you time, energy, and a chunk of your work momentum.', energy: -10, stress: 7, storyFlags: ['transport-deal-open'], tone: 'bad' },
  { id: 'fare-fine', title: 'Transit fare fine', detail: 'Trying to stretch your transport budget backfired into a fee.', cash: -55, stress: 6, storyFlags: ['transport-deal-open'], tone: 'bad' },
  { id: 'soaked-commute', title: 'Rain-soaked commute', detail: 'A miserable trip across town left you drained before work even started.', energy: -8, health: -3, stress: 5, storyFlags: ['transport-deal-open'], tone: 'bad' },
]

export const FOOD_SURVIVAL_EVENTS: LifeEvent[] = [
  { id: 'low-blood-sugar', title: 'Ran on fumes', detail: 'Skipping meals finally caught up with you and the month felt slower and heavier.', health: -8, energy: -12, stress: 8, tone: 'bad' },
  { id: 'cheap-food-sickness', title: 'Cheap food backfired', detail: 'Trying to save money on food turned into a miserable couple of days.', health: -6, energy: -8, stress: 7, tone: 'bad' },
  { id: 'community-dinner', title: 'Community dinner', detail: 'A free hot meal and a calmer evening helped more than you expected.', health: 4, energy: 6, stress: -5, storyFlags: ['neighbor-network-open'], tone: 'good' },
]

export const STARTER_BREAK_EVENTS: LifeEvent[] = [
  { id: 'tip-jar', title: 'Unexpected cash tips', detail: 'A small run of luck put a little extra money in your pocket right when you needed it.', cash: 70, stress: -3, tone: 'good' },
  { id: 'spare-room', title: 'Spare room offer', detail: 'Someone offered you a proper shared room for now, which finally gives you a bit more stability.', housingTier: 'shared', stress: -9, energy: 8, reputation: 1, tone: 'good' },
  { id: 'bike-giveaway', title: 'Community bike giveaway', detail: 'You picked up a usable bike through a neighborhood giveaway and your commute just got easier.', transportTier: 'bike', energy: 5, stress: -3, tone: 'good' },
  { id: 'credit-union-drive', title: 'Credit union signup drive', detail: 'A local credit union waived the usual friction and helped you open a basic account.', bankAccount: true, stress: -2, reputation: 1, tone: 'good' },
]

export const DISTRICTS: District[] = [
  {
    id: 'harbor',
    name: 'Harbor Edge',
    description: 'Cheaper units, rougher tenants, and stronger upside when the city starts spending nearby.',
    theme: 'Blue-collar waterfront',
    vibe: 'Docks, grit, and upside if the cranes come back.',
    accent: '#4b6b83',
    glow: 'linear-gradient(135deg, rgba(58, 96, 124, 0.28), rgba(205, 225, 238, 0.14))',
    costMultiplier: 0.88,
    rentMultiplier: 0.93,
    upkeepMultiplier: 1.08,
    risk: 0.19,
  },
  {
    id: 'midtown',
    name: 'Midtown Grid',
    description: 'Balanced pricing, steady renters, and reliable appreciation without much drama.',
    theme: 'Transit-linked core',
    vibe: 'Fast sidewalks, office lunches, and dependable demand.',
    accent: '#8b5c2d',
    glow: 'linear-gradient(135deg, rgba(190, 129, 59, 0.24), rgba(255, 229, 188, 0.16))',
    costMultiplier: 1,
    rentMultiplier: 1,
    upkeepMultiplier: 1,
    risk: 0.11,
  },
  {
    id: 'campus',
    name: 'Campus Walk',
    description: 'Student demand keeps occupancy high, but units get worn down faster.',
    theme: 'Student-heavy district',
    vibe: 'Cheap coffee, messy leases, and constant turnover.',
    accent: '#3c7b56',
    glow: 'linear-gradient(135deg, rgba(73, 145, 101, 0.24), rgba(207, 241, 214, 0.16))',
    costMultiplier: 0.95,
    rentMultiplier: 1.04,
    upkeepMultiplier: 1.07,
    risk: 0.14,
  },
  {
    id: 'heights',
    name: 'North Heights',
    description: 'Safer neighborhoods, better tenants, and expensive entries into the market.',
    theme: 'Affluent suburb',
    vibe: 'Quiet streets, strong schools, and premium stability.',
    accent: '#695aa1',
    glow: 'linear-gradient(135deg, rgba(112, 96, 176, 0.22), rgba(226, 219, 255, 0.16))',
    costMultiplier: 1.18,
    rentMultiplier: 1.1,
    upkeepMultiplier: 0.94,
    risk: 0.07,
  },
  {
    id: 'arts',
    name: 'Old Town Arts',
    description: 'An up-and-coming area where demand can surge fast if momentum turns positive.',
    theme: 'Gentrifying arts quarter',
    vibe: 'Murals, galleries, and a lot of speculative money sniffing around.',
    accent: '#b44f3c',
    glow: 'linear-gradient(135deg, rgba(203, 93, 70, 0.24), rgba(255, 214, 202, 0.18))',
    costMultiplier: 1.06,
    rentMultiplier: 1.08,
    upkeepMultiplier: 1.02,
    risk: 0.13,
  },
]

export const DISTRICT_MAP = Object.fromEntries(DISTRICTS.map((item) => [item.id, item])) as Record<string, District>

export const CONTACTS: Contact[] = [
  { id: 'broker', name: 'Elena Park', role: 'Broker', description: 'Finds properties before they hit the public feed.', perk: 'Off-market property deals' },
  { id: 'banker', name: 'Marcus Vale', role: 'Banker', description: 'Can smooth financing and improve terms when he trusts you.', perk: 'Better credit opportunities' },
  { id: 'recruiter', name: 'Jules Mercer', role: 'Recruiter', description: 'Pushes job leads your way when your reputation rises.', perk: 'Higher-paying job leads' },
  { id: 'contractor', name: 'Rina Solis', role: 'Contractor', description: 'Helps cut repair and renovation costs when you send steady work.', perk: 'Renovation discounts and repair help' },
]

export const CONTACT_MAP = Object.fromEntries(CONTACTS.map((item) => [item.id, item])) as Record<string, Contact>

export const RIVALS: Rival[] = [
  {
    id: 'vera',
    name: 'Vera Slate',
    archetype: 'Aggressive landlord',
    description: 'Pushes hard into hot rental districts and forces bidding pressure where rent is running.',
    specialty: 'property',
    focusDistrictId: 'arts',
    pressure: 16,
    rivalry: 14,
  },
  {
    id: 'dorian',
    name: 'Dorian Pike',
    archetype: 'Operator founder',
    description: 'Buys neighborhood businesses early and squeezes margins with heavy local promotion.',
    specialty: 'business',
    focusDistrictId: 'midtown',
    pressure: 18,
    rivalry: 12,
  },
  {
    id: 'noah',
    name: 'Noah Vale',
    archetype: 'Momentum trader',
    description: 'Rides sentiment fast and shows up whenever growth markets get loud.',
    specialty: 'stocks',
    focusDistrictId: 'heights',
    pressure: 12,
    rivalry: 10,
  },
]
