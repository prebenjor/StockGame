import type { FoodTier, HousingTier, TransportTier, WellnessTier } from '../../game/core/types'

type LifestyleOption<T extends string> = {
  id: T
  title: string
  monthlyCost: number
  switchCost: number
  description: string
}

export const HOUSING_OPTIONS: LifestyleOption<HousingTier>[] = [
  {
    id: 'shelter',
    title: 'Shelter Bed',
    monthlyCost: 60,
    switchCost: 0,
    description: 'Cheap but unstable. Bad sleep, no privacy, and a visible drag on reliability.',
  },
  {
    id: 'shared',
    title: 'Shared Room',
    monthlyCost: 210,
    switchCost: 140,
    description: 'A door, a bed, and enough stability to stop bleeding energy every month.',
  },
  {
    id: 'studio',
    title: 'Tiny Studio',
    monthlyCost: 470,
    switchCost: 360,
    description: 'Expensive for the size, but it finally feels like you have your own base.',
  },
  {
    id: 'apartment',
    title: 'Proper Apartment',
    monthlyCost: 860,
    switchCost: 720,
    description: 'Comfortable and stable, with a real boost to energy and reputation.',
  },
]

export const TRANSPORT_OPTIONS: LifestyleOption<TransportTier>[] = [
  {
    id: 'foot',
    title: 'Walk + Bus',
    monthlyCost: 35,
    switchCost: 0,
    description: 'Cheapest option, but long commutes and bad weather grind your energy down.',
  },
  {
    id: 'bike',
    title: 'Used Bike',
    monthlyCost: 55,
    switchCost: 120,
    description: 'Low cost and efficient when your body can handle it.',
  },
  {
    id: 'scooter',
    title: 'Secondhand Scooter',
    monthlyCost: 95,
    switchCost: 280,
    description: 'Faster gig mobility and less commute pain, but upkeep starts to matter.',
  },
  {
    id: 'car',
    title: 'Cheap Car',
    monthlyCost: 260,
    switchCost: 1200,
    description: 'Expensive, but it saves time, protects energy, and signals status.',
  },
]

export const FOOD_OPTIONS: LifestyleOption<FoodTier>[] = [
  {
    id: 'skip-meals',
    title: 'Skip Meals',
    monthlyCost: 90,
    switchCost: 0,
    description: 'Survival calories only. It keeps cash free at the cost of health and energy.',
  },
  {
    id: 'cheap-eats',
    title: 'Cheap Eats',
    monthlyCost: 170,
    switchCost: 35,
    description: 'Fast food, instant noodles, and not much recovery.',
  },
  {
    id: 'balanced',
    title: 'Balanced Meals',
    monthlyCost: 260,
    switchCost: 50,
    description: 'Stable energy and fewer bad-health spirals.',
  },
  {
    id: 'fresh',
    title: 'Fresh Meal Plan',
    monthlyCost: 360,
    switchCost: 75,
    description: 'Expensive but consistently good for stress, health, and day-to-day output.',
  },
]

export const WELLNESS_OPTIONS: LifestyleOption<WellnessTier>[] = [
  {
    id: 'none',
    title: 'No Recovery Plan',
    monthlyCost: 0,
    switchCost: 0,
    description: 'You just keep pushing and hope nothing snaps.',
  },
  {
    id: 'stretch',
    title: 'Cheap Recovery',
    monthlyCost: 45,
    switchCost: 20,
    description: 'Low-cost basics like stretching, sleep discipline, and cheap recovery habits.',
  },
  {
    id: 'gym',
    title: 'Gym Membership',
    monthlyCost: 110,
    switchCost: 60,
    description: 'Helps your body hold up better through work and hustle volume.',
  },
  {
    id: 'therapy',
    title: 'Therapy + Gym',
    monthlyCost: 230,
    switchCost: 120,
    description: 'The most expensive option, but the best direct answer to long-run stress.',
  },
]

export const HOUSING_OPTION_MAP = Object.fromEntries(HOUSING_OPTIONS.map((option) => [option.id, option])) as Record<HousingTier, LifestyleOption<HousingTier>>
export const TRANSPORT_OPTION_MAP = Object.fromEntries(TRANSPORT_OPTIONS.map((option) => [option.id, option])) as Record<TransportTier, LifestyleOption<TransportTier>>
export const FOOD_OPTION_MAP = Object.fromEntries(FOOD_OPTIONS.map((option) => [option.id, option])) as Record<FoodTier, LifestyleOption<FoodTier>>
export const WELLNESS_OPTION_MAP = Object.fromEntries(WELLNESS_OPTIONS.map((option) => [option.id, option])) as Record<WellnessTier, LifestyleOption<WellnessTier>>
