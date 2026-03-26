import type { BondTemplate } from '../../game/core/types'

const image = (imageUrl: string, imageAlt: string) => ({ imageUrl, imageAlt })

export const BONDS: BondTemplate[] = [
  {
    id: 't-bill-12m',
    title: '12M Treasury Bill',
    description: 'Low-risk government paper that works as a cash alternative once you have a little room.',
    termMonths: 12,
    spread: -0.01,
    minPurchase: 250,
    risk: 'treasury',
    ...image('https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=1400&q=80', 'Budget notebook, calculator, and cash representing safe short-term savings paper'),
  },
  {
    id: 'treasury-5y',
    title: '5Y Treasury Note',
    description: 'Longer duration, better yield, and more price sensitivity when rates move.',
    termMonths: 24,
    spread: 0,
    minPurchase: 500,
    risk: 'treasury',
    ...image('https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=1400&q=80', 'Classical government building representing treasury debt'),
  },
  {
    id: 'corp-a',
    title: 'A-Rated Corporate Bond',
    description: 'A steadier corporate fixed-income option with better carry than government debt.',
    termMonths: 18,
    spread: 0.012,
    minPurchase: 500,
    risk: 'investment-grade',
    ...image('https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=80', 'Modern office workspace representing investment-grade corporate debt'),
  },
  {
    id: 'junk-short',
    title: 'Short High-Yield Note',
    description: 'Much better carry, but more exposed to stress when the economy weakens.',
    termMonths: 9,
    spread: 0.028,
    minPurchase: 250,
    risk: 'high-yield',
    ...image('https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1400&q=80', 'Rougher industrial setting representing riskier high-yield credit'),
  },
]

export const BOND_MAP = Object.fromEntries(BONDS.map((bond) => [bond.id, bond])) as Record<string, BondTemplate>
