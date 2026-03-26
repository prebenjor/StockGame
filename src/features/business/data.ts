import type { BusinessTemplate } from '../../game/core/types'

export const BUSINESSES: BusinessTemplate[] = [
  {
    id: 'laundromat',
    title: 'Laundromat',
    cost: 12800,
    baseRevenue: 1650,
    baseExpense: 980,
    reputationRequired: 6,
    description: 'Boring cash flow with decent durability when the neighborhood stays busy.',
    preferredDistricts: ['midtown', 'harbor'],
    imageUrl: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1400&q=80',
    imageAlt: 'Industrial-style service interior suggesting durable neighborhood cash flow',
  },
  {
    id: 'corner-cafe',
    title: 'Corner Cafe',
    cost: 17400,
    baseRevenue: 2380,
    baseExpense: 1510,
    reputationRequired: 8,
    description: 'Strong upside in active districts, but sentiment and staffing matter more.',
    preferredDistricts: ['arts', 'midtown', 'campus'],
    imageUrl: 'https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&w=1400&q=80',
    imageAlt: 'Cafe counter and espresso setup',
  },
  {
    id: 'repair-shop',
    title: 'Repair Shop',
    cost: 21100,
    baseRevenue: 2620,
    baseExpense: 1580,
    reputationRequired: 10,
    description: 'Maintenance-heavy, but a good operator can turn local demand into repeat profit.',
    preferredDistricts: ['harbor', 'midtown'],
    imageUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1400&q=80',
    imageAlt: 'Car-focused image suggesting an auto repair business',
  },
  {
    id: 'micro-saas',
    title: 'Micro SaaS',
    cost: 28600,
    baseRevenue: 3420,
    baseExpense: 1760,
    reputationRequired: 13,
    description: 'Higher margin and lower wear, but market sentiment and staffing quality matter a lot.',
    preferredDistricts: ['midtown', 'arts', 'heights'],
    imageUrl: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1400&q=80',
    imageAlt: 'Developer workstation representing a software business',
  },
]

export const BUSINESS_MAP = Object.fromEntries(BUSINESSES.map((item) => [item.id, item])) as Record<string, BusinessTemplate>
