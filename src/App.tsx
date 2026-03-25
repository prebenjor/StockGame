import { useEffect, useReducer, useState } from 'react'
import './App.css'
import { BankingPanel } from './features/banking/BankingPanel'
import { BusinessPanel } from './features/business/BusinessPanel'
import { CareerPanel } from './features/career/CareerPanel'
import { HeroPanel } from './features/dashboard/HeroPanel'
import { SidePanel, SummaryStats } from './features/dashboard/OverviewPanels'
import { EducationPanel } from './features/education/EducationPanel'
import { LedgerPanel } from './features/ledger/LedgerPanel'
import { LifestylePanel } from './features/lifestyle/LifestylePanel'
import { MarketPanel } from './features/market/MarketPanel'
import { NetworkPanel } from './features/network/NetworkPanel'
import { PropertyPanel } from './features/property/PropertyPanel'
import { getCurrentJob } from './game/core/selectors'
import { gameReducer, loadState } from './game/core/reducer'
import { persistState } from './game/core/storage'

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

  useEffect(() => {
    persistState(state)
  }, [state])

  const currentJob = getCurrentJob(state)

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
    <div className="app-shell">
      <HeroPanel state={state} currentJob={currentJob} dispatch={dispatch} />
      <SummaryStats state={state} currentJob={currentJob} />

      <nav className="view-nav" aria-label="Game sections">
        {VIEWS.map((view) => (
          <button
            key={view.id}
            className={`view-chip ${activeView === view.id ? 'active' : ''}`}
            onClick={() => setActiveView(view.id)}
            type="button"
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

      <div className="content-shell">
        {renderActiveView()}
      </div>
    </div>
  )
}

export default App
