import { useEffect, useReducer } from 'react'
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

function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, loadState)

  useEffect(() => {
    persistState(state)
  }, [state])

  const currentJob = getCurrentJob(state)

  return (
    <div className="app-shell">
      <HeroPanel state={state} currentJob={currentJob} dispatch={dispatch} />
      <SummaryStats state={state} currentJob={currentJob} />

      <div className="main-grid">
        <CareerPanel state={state} dispatch={dispatch} />
        <div className="stack-grid">
          <EducationPanel state={state} dispatch={dispatch} />
          <LifestylePanel state={state} dispatch={dispatch} />
          <BankingPanel state={state} dispatch={dispatch} />
          <MarketPanel state={state} dispatch={dispatch} />
          <PropertyPanel state={state} dispatch={dispatch} />
          <BusinessPanel state={state} dispatch={dispatch} />
          <NetworkPanel state={state} dispatch={dispatch} />
          <LedgerPanel state={state} />
        </div>
        <SidePanel state={state} dispatch={dispatch} />
      </div>
    </div>
  )
}

export default App
