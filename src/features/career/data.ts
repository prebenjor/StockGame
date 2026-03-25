import type { Course, Gig, Job, Upgrade } from '../../game/core/types'

export const JOBS: Job[] = [
  { id: 'night-cleaning', title: 'Night Cleaning Shift', salary: 240, reputationRequired: 0, certifications: [], description: 'Low pay, rough hours, and just enough money to stay in motion.' },
  { id: 'odd-jobs', title: 'Odd Jobs Circuit', salary: 420, reputationRequired: 0, certifications: [], description: 'Temp shifts, cleaning gigs, and moving boxes just to stay afloat.' },
  { id: 'cafe', title: 'Cafe Shift Lead', salary: 700, reputationRequired: 2, certifications: [], description: 'Early mornings, steady tips, and a little more structure.' },
  { id: 'warehouse', title: 'Warehouse Picker', salary: 920, reputationRequired: 3, certifications: [], description: 'Long hours and sore knees, but reliable monthly pay.' },
  { id: 'sales', title: 'Sales Assistant', salary: 1400, reputationRequired: 5, certifications: ['sales-course'], description: 'Commission upside if you can keep a smile on hard days.' },
  { id: 'analyst', title: 'Junior Market Analyst', salary: 1900, reputationRequired: 7, certifications: ['finance-cert'], description: 'You finally get paid to read charts instead of just staring at them.' },
  { id: 'manager', title: 'Property Manager', salary: 2700, reputationRequired: 10, certifications: ['landlord-license'], description: 'Leasing, maintenance calls, and useful landlord contacts.' },
  { id: 'operator', title: 'Startup Operations Lead', salary: 3500, reputationRequired: 14, certifications: ['coding-bootcamp'], description: 'Fast money, fast chaos, and enough cash to scale your empire.' },
]

export const GIGS: Gig[] = [
  { id: 'flyers', title: 'Street Flyer Handout', payout: 65, reputationRequired: 0, certifications: [], description: 'Hours on your feet pushing leaflets for barely enough cash to matter.' },
  { id: 'delivery', title: 'Food Delivery Rush', payout: 150, reputationRequired: 0, certifications: [], description: 'A few brutal nights on the road for quick cash.' },
  { id: 'market-stall', title: 'Weekend Market Stall', payout: 260, reputationRequired: 3, certifications: ['sales-course'], description: 'Move product, haggle hard, and make a decent side margin.' },
  { id: 'tutoring', title: 'Exam Prep Tutoring', payout: 340, reputationRequired: 5, certifications: ['finance-cert'], description: 'Solid pay for sharp prep sessions and patient explanations.' },
  { id: 'freelance', title: 'Freelance Web Fix', payout: 460, reputationRequired: 7, certifications: ['coding-bootcamp'], description: 'Patch a landing page, send an invoice, repeat when needed.' },
  { id: 'repair-callout', title: 'Property Repair Callout', payout: 220, reputationRequired: 4, certifications: ['landlord-license'], description: 'Handle snag lists and keep units market-ready.', needsProperty: true },
]

export const COURSES: Course[] = [
  { id: 'sales-course', title: 'Sales Course', cost: 450, reputationRequired: 2, description: 'Unlock better customer-facing jobs and the weekend stall.' },
  { id: 'finance-cert', title: 'Finance Certificate', cost: 950, reputationRequired: 4, description: 'Opens analyst work and stronger investing-related gigs.' },
  { id: 'landlord-license', title: 'Landlord License', cost: 700, reputationRequired: 4, description: 'Lets you operate property gigs and higher-tier real-estate roles.' },
  { id: 'coding-bootcamp', title: 'Coding Bootcamp', cost: 1400, reputationRequired: 6, description: 'Unlocks startup work and freelance jobs with higher payout.' },
]

export const UPGRADES: Upgrade[] = [
  { id: 'scooter', title: 'Secondhand Scooter', cost: 650, description: 'Food delivery pays more because you can take more orders.' },
  { id: 'toolkit', title: 'Tool Kit', cost: 480, description: 'Renovations cost less and repair gigs pay a little extra.' },
  { id: 'tenant-crm', title: 'Tenant CRM', cost: 900, description: 'Boost rent collection and lower vacancy risk.' },
  { id: 'broker-terminal', title: 'Broker Terminal', cost: 1200, description: 'Cuts trading fees and improves dividend income.' },
  { id: 'emergency-fund', title: 'Emergency Reserve System', cost: 850, description: 'Tighter budgeting trims your monthly living costs.' },
]

export const JOB_MAP = Object.fromEntries(JOBS.map((item) => [item.id, item])) as Record<string, Job>
export const GIG_MAP = Object.fromEntries(GIGS.map((item) => [item.id, item])) as Record<string, Gig>
export const COURSE_MAP = Object.fromEntries(COURSES.map((item) => [item.id, item])) as Record<string, Course>
export const UPGRADE_MAP = Object.fromEntries(UPGRADES.map((item) => [item.id, item])) as Record<string, Upgrade>
