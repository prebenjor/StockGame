import { startTransition, useEffect, useReducer, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import './App.css'
import { BankingPanel } from './features/banking/BankingPanel'
import { BusinessPanel } from './features/business/BusinessPanel'
import { CareerPanel } from './features/career/CareerPanel'
import { GIGS, SIDE_JOB_MAP } from './features/career/data'
import { HintsDock } from './components/HintsDock'
import { HeroPanel } from './features/dashboard/HeroPanel'
import { SidePanel } from './features/dashboard/OverviewPanels'
import { EducationPanel } from './features/education/EducationPanel'
import { LedgerPanel } from './features/ledger/LedgerPanel'
import { LifestylePanel } from './features/lifestyle/LifestylePanel'
import { MarketPanel } from './features/market/MarketPanel'
import type { MarketChartRange } from './features/market/chartRanges'
import { sliceMarketHistory } from './features/market/chartRanges'
import { NetworkPanel } from './features/network/NetworkPanel'
import { PersonalPanel } from './features/personal/PersonalPanel'
import { PERSONAL_ACTIONS } from './features/personal/data'
import { PropertyPanel } from './features/property/PropertyPanel'
import { money } from './game/core/format'
import { getCurrentJob, getTips, getWeeklyRunway } from './game/core/selectors'
import { gameReducer, loadState } from './game/core/reducer'
import { persistState } from './game/core/storage'
import { canOpenCreditCard, canRunGig, canTakeSideJob, getCreditCardAccount, getCreditUtilization, getNetWorth, getPassiveIncomePreview, getTradingFee } from './game/core/utils'
import { SECTION_THEMES } from './ui/sectionThemes'

declare global {
  interface Window {
    advanceTime?: (ms: number) => Promise<void>
    render_game_to_text?: () => string
  }
}

type ViewId =
  | 'overview'
  | 'career'
  | 'education'
  | 'lifestyle'
  | 'personal'
  | 'banking'
  | 'market'
  | 'property'
  | 'business'
  | 'network'
  | 'ledger'

const VIEWS: Array<{ id: ViewId; label: string; kicker: string; accent: string; accentSoft: string; glow: string }> = [
  { id: 'overview', label: 'Overview', kicker: 'Run state', ...SECTION_THEMES.overview },
  { id: 'career', label: 'Career', kicker: 'Jobs and gigs', ...SECTION_THEMES.career },
  { id: 'education', label: 'Education', kicker: 'Skills and study', ...SECTION_THEMES.education },
  { id: 'lifestyle', label: 'Lifestyle', kicker: 'Living conditions', ...SECTION_THEMES.lifestyle },
  { id: 'personal', label: 'Personal', kicker: 'Recovery and leisure', ...SECTION_THEMES.personal },
  { id: 'banking', label: 'Banking', kicker: 'Cash and debt', ...SECTION_THEMES.banking },
  { id: 'market', label: 'Market', kicker: 'Stocks and ETFs', ...SECTION_THEMES.market },
  { id: 'property', label: 'Property', kicker: 'Buildings and rent', ...SECTION_THEMES.property },
  { id: 'business', label: 'Business', kicker: 'Operators', ...SECTION_THEMES.business },
  { id: 'network', label: 'Network', kicker: 'Contacts and rivals', ...SECTION_THEMES.network },
  { id: 'ledger', label: 'Ledger', kicker: 'Reports and history', ...SECTION_THEMES.ledger },
]

function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, loadState)
  const [activeView, setActiveView] = useState<ViewId>('overview')
  const [headerCompact, setHeaderCompact] = useState(false)
  const viewRefs = useRef<Array<HTMLButtonElement | null>>([])
  const stateRef = useRef(state)
  const activeViewRef = useRef(activeView)

  useEffect(() => {
    persistState(state)
  }, [state])

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    activeViewRef.current = activeView
  }, [activeView])

  useEffect(() => {
    const syncHeaderCompact = () => {
      setHeaderCompact(window.scrollY > 56)
    }

    syncHeaderCompact()
    window.addEventListener('scroll', syncHeaderCompact, { passive: true })
    return () => {
      window.removeEventListener('scroll', syncHeaderCompact)
    }
  }, [])

  const currentJob = getCurrentJob(state)
  const activeTheme = SECTION_THEMES[activeView]

  const setViewByIndex = (index: number) => {
    const nextIndex = (index + VIEWS.length) % VIEWS.length
    const nextView = VIEWS[nextIndex]
    setActiveView(nextView.id)
    requestAnimationFrame(() => {
      viewRefs.current[nextIndex]?.focus()
    })
  }

  const advanceWeek = () => {
    startTransition(() => dispatch({ type: 'END_WEEK' }))
  }

  const handleViewKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      setViewByIndex(index + 1)
      return
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      setViewByIndex(index - 1)
      return
    }

    if (event.key === 'Home') {
      event.preventDefault()
      setViewByIndex(0)
      return
    }

    if (event.key === 'End') {
      event.preventDefault()
      setViewByIndex(VIEWS.length - 1)
    }
  }

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false
      return target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)
    }

    const selectView = (index: number) => {
      const nextIndex = (index + VIEWS.length) % VIEWS.length
      const nextView = VIEWS[nextIndex]
      setActiveView(nextView.id)
      requestAnimationFrame(() => {
        viewRefs.current[nextIndex]?.focus()
      })
    }

    const handleGlobalKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || isEditableTarget(event.target)) {
        return
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        const currentIndex = VIEWS.findIndex((view) => view.id === activeViewRef.current)
        selectView(currentIndex - 1)
        return
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault()
        const currentIndex = VIEWS.findIndex((view) => view.id === activeViewRef.current)
        selectView(currentIndex + 1)
        return
      }

      if (event.key === 'Home') {
        event.preventDefault()
        selectView(0)
        return
      }

      if (event.key === 'End') {
        event.preventDefault()
        selectView(VIEWS.length - 1)
        return
      }

      if (event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault()
        advanceWeek()
        return
      }

      if (/^[1-9]$/.test(event.key)) {
        event.preventDefault()
        selectView(Number(event.key) - 1)
        return
      }

      if (event.key === '0') {
        event.preventDefault()
        selectView(9)
        return
      }

      if (event.key === '-') {
        event.preventDefault()
        selectView(10)
        return
      }

      if (event.key === 'a' || event.key === 'A' || event.key === 'b' || event.key === 'B') {
        event.preventDefault()

        const latestState = stateRef.current
        const latestView = activeViewRef.current
        const key = event.key.toLowerCase()

        if (latestView === 'career') {
          if (key === 'a') {
            const bestGig = GIGS.filter((gig) => canRunGig(latestState, gig)).sort((left, right) => right.payout - left.payout)[0]
            if (bestGig) {
              dispatch({ type: 'RUN_GIG', gigId: bestGig.id })
            }
          }

          if (key === 'b') {
            const recommendedSideJob = SIDE_JOB_MAP['delivery-route']
            if (recommendedSideJob && !latestState.sideJobIds.includes(recommendedSideJob.id) && canTakeSideJob(latestState, recommendedSideJob)) {
              dispatch({ type: 'TAKE_SIDE_JOB', sideJobId: recommendedSideJob.id })
            }
          }
          return
        }

        if (latestView === 'personal') {
          const getAvailablePersonalAction = (categories: Array<'recovery' | 'leisure' | 'social'>, preferredIds: string[]) =>
            preferredIds
              .map((id) =>
                PERSONAL_ACTIONS.find(
                  (action) =>
                    action.id === id &&
                    categories.includes(action.category) &&
                    latestState.actionPoints >= action.actionCost &&
                    latestState.cash >= action.cashCost &&
                    !latestState.personalActionsUsedThisWeek.includes(action.id),
                ),
              )
              .find(Boolean)

          if (key === 'a') {
            const recoveryAction = getAvailablePersonalAction(['recovery'], ['sleep-in', 'nature-walk', 'stay-in'])
            if (recoveryAction) {
              dispatch({ type: 'RUN_PERSONAL_ACTION', personalActionId: recoveryAction.id })
            }
          }

          if (key === 'b') {
            const socialAction = getAvailablePersonalAction(['social', 'leisure'], ['community-dinner', 'call-family', 'meet-friend', 'cheap-treat'])
            if (socialAction) {
              dispatch({ type: 'RUN_PERSONAL_ACTION', personalActionId: socialAction.id })
            }
          }
          return
        }

        if ((latestView === 'lifestyle' || latestView === 'banking') && key === 'a') {
          if (!latestState.bankAccount && latestState.actionPoints > 0 && latestState.cash >= 25) {
            dispatch({ type: 'OPEN_BANK_ACCOUNT' })
            return
          }

          if (latestView === 'banking') {
            const creditCard = getCreditCardAccount(latestState)

            if (!creditCard && canOpenCreditCard(latestState)) {
              dispatch({ type: 'OPEN_CREDIT_CARD' })
              return
            }

            if (creditCard && creditCard.principal > 0 && latestState.cash >= Math.min(250, Math.ceil(creditCard.principal))) {
              dispatch({ type: 'REPAY_DEBT', amount: 250 })
              return
            }

            if (latestState.bankAccount && latestState.cash >= 250) {
              dispatch({ type: 'DEPOSIT_SAVINGS', amount: 250 })
            }
          }
          return
        }

        if (latestView === 'banking' && key === 'b') {
          const creditCard = getCreditCardAccount(latestState)
          const availableCredit = creditCard?.creditLimit ? Math.max(0, creditCard.creditLimit - creditCard.principal) : 0
          if (creditCard && availableCredit >= 250) {
            dispatch({ type: 'CHARGE_CREDIT_CARD', amount: 250 })
          }
          return
        }

        if (latestView === 'market') {
          if (key === 'b' && !latestState.watchlist.includes('YIELD')) {
            dispatch({ type: 'TOGGLE_WATCHLIST', symbol: 'YIELD' })
            return
          }

          if (key === 'a') {
            const tradingFee = getTradingFee(latestState)
            const preferredSymbols = ['CITY', 'YIELD', 'BRIX', 'SODA']
            const preferredStock = preferredSymbols
              .map((symbol) => latestState.market.find((stock) => stock.symbol === symbol))
              .find((stock) => stock && latestState.cash >= stock.price + tradingFee)
            const fallbackStock = latestState.market
              .filter((stock) => latestState.cash >= stock.price + tradingFee)
              .sort((left, right) => left.price - right.price)[0]
            const targetStock = preferredStock ?? fallbackStock
            if (targetStock) {
              dispatch({ type: 'BUY_STOCK', symbol: targetStock.symbol, shares: 1 })
            }
          }
        }
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown)
    }
  }, [])

  useEffect(() => {
    window.render_game_to_text = () => {
      const latestState = stateRef.current
      const latestActiveView = activeViewRef.current
      const activeSection = document.querySelector<HTMLElement>('#main-content [data-ui-section]')
      const headerShell = document.querySelector<HTMLElement>('.game-header-shell')
      const toolbarSummary = activeSection?.dataset.toolbarSummary
      const selectedSymbol = activeSection?.dataset.selectedSymbol
      const activeSubtab = activeSection?.dataset.activeSubtab
      const activeChartRange = activeSection?.dataset.chartRange as MarketChartRange | undefined
      const activeHeaderCompact = headerShell?.dataset.headerCompact === 'true'
      const marketHistoryPoints = selectedSymbol ? latestState.marketHistory[selectedSymbol] ?? [] : []
      const visibleMarketHistory = selectedSymbol && activeChartRange
        ? sliceMarketHistory(marketHistoryPoints, activeChartRange, latestState.week)
        : marketHistoryPoints
      const latestJob = getCurrentJob(latestState)
      const latestRunway = getWeeklyRunway(latestState)
      const creditCard = getCreditCardAccount(latestState)
      const creditUtilization = getCreditUtilization(latestState)
      const snapshot = {
        coordinateSystem: 'No spatial coordinates. This is a UI-driven management sim with views indexed left-to-right from 0 to 10.',
        mode: 'management-sim',
        activeView: latestActiveView,
        activeViewIndex: VIEWS.findIndex((view) => view.id === latestActiveView),
        activeSubtab: activeSubtab ?? null,
        timeline: {
          week: latestState.week,
          month: latestState.month,
          weekOfMonth: latestState.weekOfMonth,
          ageMonths: latestState.ageMonths,
        },
        controls: {
          left: 'Previous section',
          right: 'Next section',
          space: 'Advance one week',
          digits: 'Jump to sections 1-0, then - for the final section',
          a: 'Context action A for the current section',
          b: 'Context action B for the current section',
        },
        player: {
          currentJob: latestJob.title,
          sideJobs: latestState.sideJobIds.map((id) => SIDE_JOB_MAP[id]?.title ?? id),
          openDays: latestState.actionPoints,
          actionPoints: latestState.actionPoints,
          bankAccount: latestState.bankAccount,
          personalActionsUsedThisWeek: latestState.personalActionsUsedThisWeek.map((id) => PERSONAL_ACTIONS.find((action) => action.id === id)?.title ?? id),
        },
        finance: {
          cash: money(latestState.cash),
          savings: money(latestState.savingsBalance),
          debt: money(latestState.debt),
          weeklyRunway: money(latestRunway),
          passiveIncomeMonthly: money(getPassiveIncomePreview(latestState)),
          netWorth: money(getNetWorth(latestState)),
          creditCard: creditCard
            ? {
                balance: money(creditCard.principal),
                limit: money(creditCard.creditLimit ?? 0),
                utilization: `${(creditUtilization * 100).toFixed(0)}%`,
              }
            : null,
        },
        condition: {
          health: latestState.health,
          energy: latestState.energy,
          stress: latestState.stress,
          reputation: latestState.reputation,
          knowledge: latestState.knowledge,
          creditScore: latestState.creditScore,
          bankTrust: latestState.bankTrust,
        },
        world: {
          economyPhase: latestState.economyPhase,
          inflation: latestState.inflation,
          baseRate: latestState.baseRate,
          unemployment: latestState.unemployment,
          housingDemand: latestState.housingDemand,
          marketSentiment: latestState.marketSentiment,
        },
        assets: {
          properties: latestState.properties.length,
          businesses: latestState.businesses.length,
          stockHoldings: Object.keys(latestState.holdings).length,
          bondHoldings: latestState.bondHoldings.length,
          watchlist: latestState.watchlist,
          selectedMarketSymbol: selectedSymbol ?? null,
          selectedMarketRange: activeChartRange ?? null,
          selectedMarketHistory: visibleMarketHistory.map((point) => ({
            week: point.week,
            month: point.month,
            price: point.price,
          })),
          holdings: latestState.market
            .filter((stock) => latestState.holdings[stock.symbol])
            .map((stock) => ({
              symbol: stock.symbol,
              shares: latestState.holdings[stock.symbol]?.shares ?? 0,
              price: stock.price,
            })),
        },
        opportunities: latestState.opportunities.slice(0, 3).map((opportunity) => opportunity.title),
        ui: {
          toolbarSummary: toolbarSummary ?? null,
          headerCompact: activeHeaderCompact,
        },
        recentLog: latestState.log.slice(0, 3).map((entry) => ({
          title: entry.title,
          tone: entry.tone,
          week: entry.week,
        })),
        tips: getTips(latestState),
      }
      return JSON.stringify(snapshot)
    }

    window.advanceTime = async (ms: number) => {
      const frames = Math.max(1, Math.round(ms / (1000 / 60)))
      for (let index = 0; index < frames; index += 1) {
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve())
        })
      }
    }

    return () => {
      delete window.render_game_to_text
      delete window.advanceTime
    }
  }, [])

  const renderActiveView = () => {
    if (activeView === 'overview') {
      return <SidePanel state={state} dispatch={dispatch} onNavigate={(view) => setActiveView(view)} />
    }
    if (activeView === 'career') return <CareerPanel state={state} dispatch={dispatch} />
    if (activeView === 'education') return <EducationPanel state={state} dispatch={dispatch} />
    if (activeView === 'lifestyle') return <LifestylePanel state={state} dispatch={dispatch} />
    if (activeView === 'personal') return <PersonalPanel state={state} dispatch={dispatch} />
    if (activeView === 'banking') return <BankingPanel state={state} dispatch={dispatch} />
    if (activeView === 'market') return <MarketPanel state={state} dispatch={dispatch} />
    if (activeView === 'property') return <PropertyPanel state={state} dispatch={dispatch} />
    if (activeView === 'business') return <BusinessPanel state={state} dispatch={dispatch} />
    if (activeView === 'network') return <NetworkPanel state={state} dispatch={dispatch} />
    return <LedgerPanel state={state} />
  }

  return (
    <div
      className="app-shell"
      data-active-view={activeView}
      style={
        {
          '--active-section-accent': activeTheme.accent,
          '--active-section-soft': activeTheme.accentSoft,
          '--active-section-glow': activeTheme.glow,
          '--active-section-panel': activeTheme.panelTint,
        } as React.CSSProperties
      }
    >
      <a className="skip-link" href="#main-content">
        Skip to active section
      </a>

      <div className={`game-header-shell ${headerCompact ? 'compact' : ''}`} data-header-compact={headerCompact ? 'true' : 'false'}>
        <HeroPanel state={state} currentJob={currentJob} dispatch={dispatch} compact={headerCompact} />

        <nav className="view-nav integrated" aria-label="Game sections" role="tablist">
          {VIEWS.map((view, index) => (
            <button
              key={view.id}
              ref={(element) => {
                viewRefs.current[index] = element
              }}
              className={`view-chip ${activeView === view.id ? 'active' : ''}`}
              onClick={() => setActiveView(view.id)}
              onKeyDown={(event) => handleViewKeyDown(event, index)}
              type="button"
              role="tab"
              id={`tab-${view.id}`}
              aria-selected={activeView === view.id}
              aria-controls={`panel-${view.id}`}
              tabIndex={activeView === view.id ? 0 : -1}
              style={
                {
                  '--chip-accent': view.accent,
                  '--chip-accent-soft': view.accentSoft,
                  '--chip-glow': view.glow,
                } as React.CSSProperties
              }
            >
              <span>{view.kicker}</span>
              <strong>{view.label}</strong>
            </button>
          ))}
        </nav>
      </div>

      <main
        className="content-shell"
        id="main-content"
        role="tabpanel"
        aria-labelledby={`tab-${activeView}`}
        aria-live="polite"
        tabIndex={-1}
      >
        {renderActiveView()}
      </main>

      <HintsDock />
    </div>
  )
}

export default App
