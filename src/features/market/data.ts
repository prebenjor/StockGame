import type { Stock } from '../../game/core/types'

export const BASE_MARKET: Stock[] = [
  { symbol: 'BYTE', name: 'ByteForge AI', sector: 'tech', price: 42, drift: 0.026, volatility: 0.17, dividend: 0.05, change: 0 },
  { symbol: 'BRIX', name: 'Brix Urban REIT', sector: 'real-estate', price: 18, drift: 0.016, volatility: 0.08, dividend: 0.14, change: 0 },
  { symbol: 'HEAL', name: 'Healix Bio', sector: 'health', price: 31, drift: 0.018, volatility: 0.1, dividend: 0.08, change: 0 },
  { symbol: 'SODA', name: 'Soda Street Brands', sector: 'consumer', price: 15, drift: 0.012, volatility: 0.07, dividend: 0.09, change: 0 },
  { symbol: 'GRID', name: 'Gridline Utilities', sector: 'energy', price: 27, drift: 0.019, volatility: 0.09, dividend: 0.12, change: 0 },
  { symbol: 'NOVA', name: 'Nova Mobility', sector: 'mobility', price: 23, drift: 0.024, volatility: 0.14, dividend: 0.04, change: 0 },
]
