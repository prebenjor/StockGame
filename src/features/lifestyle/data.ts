import type { FoodTier, HousingTier, MediaAsset, TransportTier, WellnessTier } from '../../game/core/types'

type LifestyleOption<T extends string> = MediaAsset & {
  id: T
  title: string
  monthlyCost: number
  switchCost: number
  description: string
}

const image = (imageUrl: string, imageAlt: string) => ({ imageUrl, imageAlt })

export const HOUSING_OPTIONS: LifestyleOption<HousingTier>[] = [
  {
    id: 'shelter',
    title: 'Shelter Bed',
    monthlyCost: 60,
    switchCost: 0,
    description: 'Cheap but unstable. Bad sleep, no privacy, and a visible drag on reliability.',
    ...image('https://images.unsplash.com/photo-1514894786521-67f8d7d07c1a?auto=format&fit=crop&w=1200&q=80', 'Simple bunk bed in a sparse room'),
  },
  {
    id: 'shared',
    title: 'Shared Room',
    monthlyCost: 210,
    switchCost: 140,
    description: 'A door, a bed, and enough stability to stop bleeding energy every month.',
    ...image('https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80', 'Compact shared bedroom with a neatly made bed'),
  },
  {
    id: 'studio',
    title: 'Tiny Studio',
    monthlyCost: 470,
    switchCost: 360,
    description: 'Expensive for the size, but it finally feels like you have your own base.',
    ...image('https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80', 'Small studio apartment with a bed and window light'),
  },
  {
    id: 'apartment',
    title: 'Proper Apartment',
    monthlyCost: 860,
    switchCost: 720,
    description: 'Comfortable and stable, with a real boost to energy and reputation.',
    ...image('https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80', 'Bright modern apartment interior with sofa and kitchen'),
  },
]

export const TRANSPORT_OPTIONS: LifestyleOption<TransportTier>[] = [
  {
    id: 'foot',
    title: 'Walk + Bus',
    monthlyCost: 35,
    switchCost: 0,
    description: 'Cheapest option, but long commutes and bad weather grind your energy down.',
    ...image('https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80', 'City street with buses and pedestrians at dusk'),
  },
  {
    id: 'bike',
    title: 'Used Bike',
    monthlyCost: 55,
    switchCost: 120,
    description: 'Low cost and efficient when your body can handle it.',
    ...image('https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?auto=format&fit=crop&w=1200&q=80', 'Used bicycle leaning against a city wall'),
  },
  {
    id: 'scooter',
    title: 'Secondhand Scooter',
    monthlyCost: 95,
    switchCost: 280,
    description: 'Faster gig mobility and less commute pain, but upkeep starts to matter.',
    ...image('https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80', 'Scooter parked on a city street'),
  },
  {
    id: 'car',
    title: 'Cheap Car',
    monthlyCost: 260,
    switchCost: 1200,
    description: 'Expensive, but it saves time, protects energy, and signals status.',
    ...image('https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80', 'Compact car driving through an urban street'),
  },
]

export const FOOD_OPTIONS: LifestyleOption<FoodTier>[] = [
  {
    id: 'skip-meals',
    title: 'Skip Meals',
    monthlyCost: 90,
    switchCost: 0,
    description: 'Survival calories only. It keeps cash free at the cost of health and energy.',
    ...image('https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=1200&q=80', 'Sparse cheap meal on a small table'),
  },
  {
    id: 'cheap-eats',
    title: 'Cheap Eats',
    monthlyCost: 170,
    switchCost: 35,
    description: 'Fast food, instant noodles, and not much recovery.',
    ...image('https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80', 'Takeout containers and quick comfort food on a table'),
  },
  {
    id: 'balanced',
    title: 'Balanced Meals',
    monthlyCost: 260,
    switchCost: 50,
    description: 'Stable energy and fewer bad-health spirals.',
    ...image('https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1200&q=80', 'Balanced meal with vegetables and grains'),
  },
  {
    id: 'fresh',
    title: 'Fresh Meal Plan',
    monthlyCost: 360,
    switchCost: 75,
    description: 'Expensive but consistently good for stress, health, and day-to-day output.',
    ...image('https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=1200&q=80', 'Fresh healthy meal ingredients arranged on a table'),
  },
]

export const WELLNESS_OPTIONS: LifestyleOption<WellnessTier>[] = [
  {
    id: 'none',
    title: 'No Recovery Plan',
    monthlyCost: 0,
    switchCost: 0,
    description: 'You just keep pushing and hope nothing snaps.',
    ...image('https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80', 'Tired workspace late at night with little recovery'),
  },
  {
    id: 'stretch',
    title: 'Cheap Recovery',
    monthlyCost: 45,
    switchCost: 20,
    description: 'Low-cost basics like stretching, sleep discipline, and cheap recovery habits.',
    ...image('https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1200&q=80', 'Person stretching on a mat at home'),
  },
  {
    id: 'gym',
    title: 'Gym Membership',
    monthlyCost: 110,
    switchCost: 60,
    description: 'Helps your body hold up better through work and hustle volume.',
    ...image('https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80', 'Gym interior with weights and training equipment'),
  },
  {
    id: 'therapy',
    title: 'Therapy + Gym',
    monthlyCost: 230,
    switchCost: 120,
    description: 'The most expensive option, but the best direct answer to long-run stress.',
    ...image('https://images.unsplash.com/photo-1516302752625-fcc3c50ae61f?auto=format&fit=crop&w=1200&q=80', 'Calm therapy office with chair and soft lighting'),
  },
]

export const HOUSING_OPTION_MAP = Object.fromEntries(HOUSING_OPTIONS.map((option) => [option.id, option])) as Record<HousingTier, LifestyleOption<HousingTier>>
export const TRANSPORT_OPTION_MAP = Object.fromEntries(TRANSPORT_OPTIONS.map((option) => [option.id, option])) as Record<TransportTier, LifestyleOption<TransportTier>>
export const FOOD_OPTION_MAP = Object.fromEntries(FOOD_OPTIONS.map((option) => [option.id, option])) as Record<FoodTier, LifestyleOption<FoodTier>>
export const WELLNESS_OPTION_MAP = Object.fromEntries(WELLNESS_OPTIONS.map((option) => [option.id, option])) as Record<WellnessTier, LifestyleOption<WellnessTier>>
