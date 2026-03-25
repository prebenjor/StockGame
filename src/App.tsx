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

const VIEWS: Array<{ id: ViewId; label: string; kicker: string }> = [
  { id: 'overview', label: 'Overview', kicker: 'Run state' },
  { id: 'career', label: 'Career', kicker: 'Jobs and gigs' },
  { id: 'education', label: 'Education', kicker: 'Skills and study' },
  { id: 'lifestyle', label: 'Lifestyle', kicker: 'Living conditions' },
  { id: 'banking', label: 'Banking', kicker: 'Cash and debt' },
  { id: 'market', label: 'Market', kicker: 'Stocks and ETFs' },
  { id: 'property', label: 'Property', kicker: 'Buildings and rent' },
  { id: 'business', label: 'Business', kicker: 'Operators' },
  { id: 'network', label: 'Network', kicker: 'Contacts and rivals' },
  { id: 'ledger', label: 'Ledger', kicker: 'Reports and history' },
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
