import { startTransition, useEffect, useReducer, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import './App.css'
import { BankingPanel } from './features/banking/BankingPanel'
import { BusinessPanel } from './features/business/BusinessPanel'
import { CareerPanel } from './features/career/CareerPanel'
import { GIGS, SIDE_JOB_MAP } from './features/career/data'
import { HeroPanel } from './features/dashboard/HeroPanel'
import { SidePanel, SummaryStats } from './features/dashboard/OverviewPanels'
import { EducationPanel } from './features/education/EducationPanel'
import { LedgerPanel } from './features/ledger/LedgerPanel'
import { LifestylePanel } from './features/lifestyle/LifestylePanel'
import { MarketPanel } from './features/market/MarketPanel'
import { NetworkPanel } from './features/network/NetworkPanel'
import { PropertyPanel } from './features/property/PropertyPanel'
import { money } from './game/core/format'
import { getCurrentJob, getTips, getWeeklyRunway } from './game/core/selectors'
import { gameReducer, loadState } from './game/core/reducer'
import { persistState } from './game/core/storage'
import { canRunGig, canTakeSideJob, getNetWorth, getPassiveIncomePreview, getTradingFee } from './game/core/utils'

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
  | 'banking'
  | 'market'
  | 'property'
  | 'business'
  | 'network'
  | 'ledger'

const VIEWS: Array<{ id: ViewId; label: string; kicker: string; accent: string; accentSoft: string; glow: string }> = [
  { id: 'overview', label: 'Overview', kicker: 'Run state', accent: '#cf7a18', accentSoft: 'rgba(255, 214, 150, 0.68)', glow: 'rgba(231, 143, 31, 0.24)' },
  { id: 'career', label: 'Career', kicker: 'Jobs and gigs', accent: '#9e5d1e', accentSoft: 'rgba(233, 196, 154, 0.72)', glow: 'rgba(174, 101, 31, 0.2)' },
  { id: 'education', label: 'Education', kicker: 'Skills and study', accent: '#346f8f', accentSoft: 'rgba(176, 214, 233, 0.7)', glow: 'rgba(57, 120, 160, 0.2)' },
  { id: 'lifestyle', label: 'Lifestyle', kicker: 'Living conditions', accent: '#51773d', accentSoft: 'rgba(193, 224, 172, 0.72)', glow: 'rgba(95, 148, 64, 0.2)' },
  { id: 'banking', label: 'Banking', kicker: 'Cash and debt', accent: '#145c55', accentSoft: 'rgba(167, 222, 213, 0.72)', glow: 'rgba(25, 128, 118, 0.2)' },
  { id: 'market', label: 'Market', kicker: 'Stocks and ETFs', accent: '#1d6a8a', accentSoft: 'rgba(169, 216, 237, 0.72)', glow: 'rgba(35, 128, 171, 0.22)' },
  { id: 'property', label: 'Property', kicker: 'Buildings and rent', accent: '#7b4f95', accentSoft: 'rgba(214, 192, 231, 0.72)', glow: 'rgba(124, 83, 162, 0.2)' },
  { id: 'business', label: 'Business', kicker: 'Operators', accent: '#974545', accentSoft: 'rgba(239, 194, 194, 0.72)', glow: 'rgba(171, 82, 82, 0.2)' },
  { id: 'network', label: 'Network', kicker: 'Contacts and rivals', accent: '#a44e2f', accentSoft: 'rgba(242, 202, 179, 0.72)', glow: 'rgba(196, 101, 57, 0.2)' },
  { id: 'ledger', label: 'Ledger', kicker: 'Reports and history', accent: '#5f5a8e', accentSoft: 'rgba(206, 202, 236, 0.72)', glow: 'rgba(103, 96, 173, 0.2)' },
]

function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, loadState)
  const [activeView, setActiveView] = useState<ViewId>('overview')
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

  const currentJob = getCurrentJob(state)

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
        selectView(VIEWS.length - 1)
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

        if ((latestView === 'lifestyle' || latestView === 'banking') && key === 'a') {
          if (!latestState.bankAccount && latestState.actionPoints > 0 && latestState.cash >= 25) {
            dispatch({ type: 'OPEN_BANK_ACCOUNT' })
            return
          }

          if (latestView === 'banking' && latestState.bankAccount && latestState.cash >= 250) {
            dispatch({ type: 'DEPOSIT_SAVINGS', amount: 250 })
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
      const latestJob = getCurrentJob(latestState)
      const latestRunway = getWeeklyRunway(latestState)
      const snapshot = {
        coordinateSystem: 'No spatial coordinates. This is a UI-driven management sim with views indexed left-to-right from 0 to 9.',
        mode: 'management-sim',
        activeView: latestActiveView,
        activeViewIndex: VIEWS.findIndex((view) => view.id === latestActiveView),
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
          digits: 'Jump to section 1-0',
          a: 'Context action A for the current section',
          b: 'Context action B for the current section',
        },
        player: {
          currentJob: latestJob.title,
          sideJobs: latestState.sideJobIds.map((id) => SIDE_JOB_MAP[id]?.title ?? id),
          actionPoints: latestState.actionPoints,
          bankAccount: latestState.bankAccount,
        },
        finance: {
          cash: money(latestState.cash),
          savings: money(latestState.savingsBalance),
          debt: money(latestState.debt),
          weeklyRunway: money(latestRunway),
          passiveIncomeMonthly: money(getPassiveIncomePreview(latestState)),
          netWorth: money(getNetWorth(latestState)),
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
          holdings: latestState.market
            .filter((stock) => latestState.holdings[stock.symbol])
            .map((stock) => ({
              symbol: stock.symbol,
              shares: latestState.holdings[stock.symbol]?.shares ?? 0,
              price: stock.price,
            })),
        },
        opportunities: latestState.opportunities.slice(0, 3).map((opportunity) => opportunity.title),
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
      return (
        <div className="dashboard-grid">
          <SidePanel state={state} dispatch={dispatch} />
          <div className="dashboard-stack">
            <LedgerPanel state={state} />
            <NetworkPanel state={state} dispatch={dispatch} />
          </div>
        </div>
      )
    }
    if (activeView === 'career') return <CareerPanel state={state} dispatch={dispatch} />
    if (activeView === 'education') return <EducationPanel state={state} dispatch={dispatch} />
    if (activeView === 'lifestyle') return <LifestylePanel state={state} dispatch={dispatch} />
    if (activeView === 'banking') return <BankingPanel state={state} dispatch={dispatch} />
    if (activeView === 'market') return <MarketPanel state={state} dispatch={dispatch} />
    if (activeView === 'property') return <PropertyPanel state={state} dispatch={dispatch} />
    if (activeView === 'business') return <BusinessPanel state={state} dispatch={dispatch} />
    if (activeView === 'network') return <NetworkPanel state={state} dispatch={dispatch} />
    return <LedgerPanel state={state} />
  }

  return (
    <div className="app-shell" data-active-view={activeView}>
      <a className="skip-link" href="#main-content">
        Skip to active section
      </a>

      <HeroPanel state={state} currentJob={currentJob} dispatch={dispatch} />
      <SummaryStats state={state} currentJob={currentJob} />

      <nav className="view-nav" aria-label="Game sections" role="tablist">
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
    </div>
  )
}

export default App
