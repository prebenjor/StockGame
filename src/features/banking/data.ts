import type { BondTemplate } from '../../game/core/types'

export const BONDS: BondTemplate[] = [
  {
    id: 't-bill-12m',
    title: '12M Treasury Bill',
    description: 'Low-risk government paper that works as a cash alternative once you have a little room.',
    termMonths: 12,
    spread: -0.01,
    minPurchase: 250,
    risk: 'treasury',
  },
  {
    id: 'treasury-5y',
    title: '5Y Treasury Note',
    description: 'Longer duration, better yield, and more price sensitivity when rates move.',
    termMonths: 24,
    spread: 0,
    minPurchase: 500,
    risk: 'treasury',
  },
  {
    id: 'corp-a',
    title: 'A-Rated Corporate Bond',
    description: 'A steadier corporate fixed-income option with better carry than government debt.',
    termMonths: 18,
    spread: 0.012,
    minPurchase: 500,
    risk: 'investment-grade',
  },
  {
    id: 'junk-short',
    title: 'Short High-Yield Note',
    description: 'Much better carry, but more exposed to stress when the economy weakens.',
    termMonths: 9,
    spread: 0.028,
    minPurchase: 250,
    risk: 'high-yield',
  },
]

export const BOND_MAP = Object.fromEntries(BONDS.map((bond) => [bond.id, bond])) as Record<string, BondTemplate>
