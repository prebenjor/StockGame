import type { Stock } from '../../game/core/types'

export const BASE_MARKET: Stock[] = [
  { symbol: 'BYTE', name: 'ByteForge AI', sector: 'tech', assetType: 'stock', thesis: 'High-beta AI platform name with fast earnings reactions.', price: 42, drift: 0.026, volatility: 0.17, dividend: 0.05, change: 0, earningsMonth: 3 },
  { symbol: 'BRIX', name: 'Brix Urban REIT', sector: 'real-estate', assetType: 'stock', thesis: 'Yield-heavy real-estate vehicle tied to rate pressure and rent demand.', price: 18, drift: 0.016, volatility: 0.08, dividend: 0.14, change: 0, earningsMonth: 2 },
  { symbol: 'HEAL', name: 'Healix Bio', sector: 'health', assetType: 'stock', thesis: 'Health-growth name that trades hard on trial and earnings headlines.', price: 31, drift: 0.018, volatility: 0.1, dividend: 0.08, change: 0, earningsMonth: 1 },
  { symbol: 'SODA', name: 'Soda Street Brands', sector: 'consumer', assetType: 'stock', thesis: 'Steadier consumer brand with modest dividends and demand sensitivity.', price: 15, drift: 0.012, volatility: 0.07, dividend: 0.09, change: 0, earningsMonth: 4 },
  { symbol: 'GRID', name: 'Gridline Utilities', sector: 'energy', assetType: 'stock', thesis: 'Defensive utility-style payer that holds up better in bad tape.', price: 27, drift: 0.019, volatility: 0.09, dividend: 0.12, change: 0, earningsMonth: 6 },
  { symbol: 'NOVA', name: 'Nova Mobility', sector: 'mobility', assetType: 'stock', thesis: 'Growth mobility name with wider swings on sentiment and execution.', price: 23, drift: 0.024, volatility: 0.14, dividend: 0.04, change: 0, earningsMonth: 5 },
  { symbol: 'CITY', name: 'CityCore Index ETF', sector: 'index', assetType: 'etf', thesis: 'Broad-market ETF that smooths single-name risk across the city economy.', price: 34, drift: 0.017, volatility: 0.06, dividend: 0.1, change: 0, expenseRatio: 0.003 },
  { symbol: 'YIELD', name: 'Cashflow Dividend ETF', sector: 'dividend', assetType: 'etf', thesis: 'Income-focused ETF with steadier payouts and lower upside.', price: 26, drift: 0.013, volatility: 0.05, dividend: 0.15, change: 0, expenseRatio: 0.004 },
  { symbol: 'SPRK', name: 'Frontier Growth ETF', sector: 'growth', assetType: 'etf', thesis: 'Aggressive growth basket that captures momentum without single-name blowups.', price: 29, drift: 0.021, volatility: 0.09, dividend: 0.05, change: 0, expenseRatio: 0.005 },
]
