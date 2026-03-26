import { SectionTabs } from '../../components/SectionTabs'
import { SectionToolbar, type ToolbarFilter } from '../../components/SectionToolbar'
import { useStoredUiState } from '../../components/useStoredUiState'
import { money } from '../../game/core/format'
import { getLatestSnapshot, getRecentHistory } from '../../game/core/selectors'
import type { GameState } from '../../game/core/types'
import { SECTION_THEMES } from '../../ui/sectionThemes'

type Props = {
  state: GameState
}

type LedgerTab = 'latest' | 'history'

type LedgerUiState = {
  tab: LedgerTab
  historyWindow: '3' | '6' | '8'
}

const LEDGER_DEFAULT: LedgerUiState = {
  tab: 'latest',
  historyWindow: '6',
}

const LEDGER_TABS = [
  { id: 'latest', label: 'Latest', kicker: 'Current report' },
  { id: 'history', label: 'History', kicker: 'Archive' },
] as const

export function LedgerPanel({ state }: Props) {
  const theme = SECTION_THEMES.ledger
  const [ui, setUi] = useStoredUiState<LedgerUiState>('street-to-stock-ledger-ui-v1', LEDGER_DEFAULT)
  const latest = getLatestSnapshot(state)
  const history = getRecentHistory(state).slice(0, Number(ui.historyWindow))
  const maxNetWorth = Math.max(...history.map((item) => item.netWorth), 1)

  const filters: ToolbarFilter[] =
    ui.tab === 'history'
      ? [
          {
            id: 'history-window',
            label: 'Window',
            type: 'select',
            value: ui.historyWindow,
            options: [
              { value: '3', label: 'Last 3' },
              { value: '6', label: 'Last 6' },
              { value: '8', label: 'Last 8' },
            ],
            onChange: (value) => setUi((current) => ({ ...current, historyWindow: value as LedgerUiState['historyWindow'] })),
          },
        ]
      : []

  const summary = ui.tab === 'latest' ? `${latest ? `month ${latest.month}` : 'no reports yet'}` : `${history.length} archived snapshots`

  return (
    <section
      className="panel section-panel ledger-panel"
      data-ui-section="ledger"
      data-active-subtab={ui.tab}
      data-toolbar-summary={summary}
      style={
        {
          '--section-accent': theme.accent,
          '--section-accent-soft': theme.accentSoft,
          '--section-glow': theme.glow,
          '--section-panel': theme.panelTint,
          '--section-border': theme.borderTone,
        } as React.CSSProperties
      }
    >
      <div className="panel-header">
        <div>
          <span className="panel-kicker">Ledger</span>
          <h2>Monthly reports</h2>
        </div>
        <p>Keep this section calmer than the others. It is the report archive, not another action surface.</p>
      </div>

      <SectionTabs
        sectionId="ledger"
        activeTab={ui.tab}
        onChange={(tabId) => setUi((current) => ({ ...current, tab: tabId as LedgerTab }))}
        tabs={LEDGER_TABS as unknown as Array<{ id: string; label: string; kicker?: string }>}
        theme={theme}
      />

      <SectionToolbar sectionId="ledger" filters={filters} summary={summary} />

      {!latest ? (
        <article className="card empty-state">
          <h3>No reporting history yet</h3>
          <p>End the first month to generate a ledger snapshot and start building trend history.</p>
        </article>
      ) : null}

      {latest && ui.tab === 'latest' ? (
        <div className="card-grid compact">
          <article className="card">
            <div className="card-topline">
              <h3>Latest month</h3>
              <span>Month {latest.month}</span>
            </div>
            <div className="tag-row">
              <span className="tag">Salary {money(latest.salary)}</span>
              <span className="tag">Rent {money(latest.rentalIncome)}</span>
              <span className="tag">Business {money(latest.businessIncome)}</span>
              <span className="tag">Dividends {money(latest.dividends)}</span>
              <span className="tag">Bonds {money(latest.bondIncome)}</span>
            </div>
            <div className="ledger-grid">
              <div><span>Savings interest</span><strong>{money(latest.savingsInterest)}</strong></div>
              <div><span>Maintenance</span><strong>{money(latest.maintenance)}</strong></div>
              <div><span>Living costs</span><strong>{money(latest.livingCost)}</strong></div>
              <div><span>Interest</span><strong>{money(latest.interest)}</strong></div>
              <div><span>Debt service</span><strong>{money(latest.debtService)}</strong></div>
              <div><span>Taxes accrued</span><strong>{money(latest.taxesAccrued)}</strong></div>
              <div><span>Passive income</span><strong>{money(latest.passiveIncome)}</strong></div>
              <div><span>Net worth</span><strong>{money(latest.netWorth)}</strong></div>
            </div>
          </article>
        </div>
      ) : null}

      {latest && ui.tab === 'history' ? (
        <div className="history-list">
          {history.map((snapshot) => (
            <article className="history-row" key={snapshot.month}>
              <div className="history-topline">
                <strong>Month {snapshot.month}</strong>
                <span>{money(snapshot.netWorth)}</span>
              </div>
              <div className="history-bar">
                <span style={{ width: `${Math.max(8, (snapshot.netWorth / maxNetWorth) * 100)}%` }} />
              </div>
              <div className="tag-row">
                <span className="tag">Cash {money(snapshot.cash)}</span>
                <span className="tag">Savings {money(snapshot.savingsBalance)}</span>
                <span className="tag">Debt {money(snapshot.debt)}</span>
                <span className="tag">Passive {money(snapshot.passiveIncome)}</span>
                <span className="tag">Tax {money(snapshot.taxesAccrued)}</span>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  )
}
