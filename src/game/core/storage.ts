import { BASE_MARKET } from '../../features/market/data'
import type { GameState, MarketHistoryPoint } from './types'
import { STORAGE_KEY } from './storageKey'

function createFallbackHistoryPoint(price: number, fallback: GameState): MarketHistoryPoint {
  return {
    week: fallback.week,
    month: fallback.month,
    price,
  }
}

export function persistState(state: GameState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function hydrateState(fallback: GameState) {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return fallback

    const parsed = JSON.parse(raw) as Partial<GameState>
    return {
      ...fallback,
      ...parsed,
      week: parsed.week ?? fallback.week,
      weekOfMonth: parsed.weekOfMonth ?? fallback.weekOfMonth,
      ageMonths: parsed.ageMonths ?? fallback.ageMonths,
      market: parsed.market?.length === BASE_MARKET.length ? parsed.market : fallback.market,
      certifications: parsed.certifications ?? fallback.certifications,
      upgrades: parsed.upgrades ?? fallback.upgrades,
      holdings: parsed.holdings ?? fallback.holdings,
      watchlist: parsed.watchlist ?? fallback.watchlist,
      marketNews:
        parsed.marketNews?.map((item) => ({
          ...item,
          week: item.week ?? fallback.week,
        })) ?? fallback.marketNews,
      marketHistory:
        parsed.marketHistory && Object.keys(parsed.marketHistory).length > 0
          ? Object.fromEntries(
              BASE_MARKET.map((stock) => {
                const points = parsed.marketHistory?.[stock.symbol]
                return [
                  stock.symbol,
                  points?.length
                    ? points.map((point) => ({
                        week: point.week ?? fallback.week,
                        month: point.month ?? fallback.month,
                        price: point.price ?? stock.price,
                      }))
                    : [createFallbackHistoryPoint(parsed.market?.find((item) => item.symbol === stock.symbol)?.price ?? stock.price, fallback)],
                ]
              }),
            )
          : Object.fromEntries(
              (parsed.market?.length === BASE_MARKET.length ? parsed.market : fallback.market).map((stock) => [
                stock.symbol,
                [createFallbackHistoryPoint(stock.price, fallback)],
              ]),
            ),
      bondHoldings: parsed.bondHoldings ?? fallback.bondHoldings,
      debtAccounts:
        parsed.debtAccounts?.map((account) => ({
          ...account,
          creditLimit: account.creditLimit,
          linkedBusinessUid: account.linkedBusinessUid ?? null,
        })) ?? fallback.debtAccounts,
      districtStates: parsed.districtStates?.length ? parsed.districtStates : fallback.districtStates,
      propertyListings: parsed.propertyListings?.length ? parsed.propertyListings : fallback.propertyListings,
      contacts: parsed.contacts?.length ? parsed.contacts : fallback.contacts,
      rivals: parsed.rivals?.length ? parsed.rivals : fallback.rivals,
      opportunities: parsed.opportunities ?? fallback.opportunities,
      storyFlags: parsed.storyFlags ?? fallback.storyFlags,
      properties:
        parsed.properties?.map((property) => ({
          ...property,
          mortgageBalance: property.mortgageBalance ?? 0,
          tenantProfileId: property.tenantProfileId ?? null,
          leaseMonthsRemaining: property.leaseMonthsRemaining ?? 0,
          missedPayments: property.missedPayments ?? 0,
        })) ?? fallback.properties,
      businesses:
        parsed.businesses?.map((business) => ({
          ...business,
          condition: business.condition ?? 74,
          marketing: business.marketing ?? 0,
          staffing: business.staffing ?? 0,
          active: business.active ?? true,
          monthsOperating: business.monthsOperating ?? 0,
        })) ?? fallback.businesses,
      history: parsed.history ?? fallback.history,
      log:
        parsed.log?.length
          ? parsed.log.map((entry) => ({
              ...entry,
              week: entry.week ?? fallback.week,
            }))
          : fallback.log,
      nextBusinessId: parsed.nextBusinessId ?? fallback.nextBusinessId,
      nextBondId: parsed.nextBondId ?? fallback.nextBondId,
      nextDebtId: parsed.nextDebtId ?? fallback.nextDebtId,
      nextPropertyId: parsed.nextPropertyId ?? fallback.nextPropertyId,
      savingsBalance: parsed.savingsBalance ?? fallback.savingsBalance,
      knowledge: parsed.knowledge ?? fallback.knowledge,
      taxDue: parsed.taxDue ?? fallback.taxDue,
      complianceScore: parsed.complianceScore ?? fallback.complianceScore,
      economyPhase: parsed.economyPhase ?? fallback.economyPhase,
      inflation: parsed.inflation ?? fallback.inflation,
      baseRate: parsed.baseRate ?? fallback.baseRate,
      unemployment: parsed.unemployment ?? fallback.unemployment,
      housingDemand: parsed.housingDemand ?? fallback.housingDemand,
      marketSentiment: parsed.marketSentiment ?? fallback.marketSentiment,
      creditScore: parsed.creditScore ?? fallback.creditScore,
      bankTrust: parsed.bankTrust ?? fallback.bankTrust,
      stress: parsed.stress ?? fallback.stress,
      health: parsed.health ?? fallback.health,
      energy: parsed.energy ?? fallback.energy,
      bankAccount: parsed.bankAccount ?? fallback.bankAccount,
      housingTier: parsed.housingTier ?? fallback.housingTier,
      transportTier: parsed.transportTier ?? fallback.transportTier,
      foodTier: parsed.foodTier ?? fallback.foodTier,
      wellnessTier: parsed.wellnessTier ?? fallback.wellnessTier,
      personalActionsUsedThisWeek: parsed.personalActionsUsedThisWeek ?? fallback.personalActionsUsedThisWeek,
      plannedWeekSlots:
        parsed.plannedWeekSlots?.length === fallback.plannedWeekSlots.length
          ? parsed.plannedWeekSlots.map((slot) => (slot ? { ...slot } : null))
          : fallback.plannedWeekSlots,
      weekPlanCommitted: parsed.weekPlanCommitted ?? fallback.weekPlanCommitted,
      weekResolutionPhase: parsed.weekResolutionPhase ?? fallback.weekResolutionPhase,
      weekResolutionCursor: parsed.weekResolutionCursor ?? fallback.weekResolutionCursor,
      weekResolutionResults: parsed.weekResolutionResults ?? fallback.weekResolutionResults,
      activeWeekEventCards: parsed.activeWeekEventCards ?? fallback.activeWeekEventCards,
      sideJobIds:
        parsed.sideJobIds ??
        ((parsed as Partial<GameState> & { sideJobId?: string | null }).sideJobId
          ? [(parsed as Partial<GameState> & { sideJobId?: string | null }).sideJobId as string]
          : fallback.sideJobIds ?? []),
      educationEnrollment: parsed.educationEnrollment ?? fallback.educationEnrollment,
    }
  } catch {
    return fallback
  }
}
