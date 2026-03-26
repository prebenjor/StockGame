import { CardMedia } from '../../components/CardMedia'
import { SectionTabs } from '../../components/SectionTabs'
import { SectionToolbar, type ToolbarFilter } from '../../components/SectionToolbar'
import { useStoredUiState } from '../../components/useStoredUiState'
import { money } from '../../game/core/format'
import type { GameAction, GameState } from '../../game/core/types'
import { getBondValue, getBondYield, getCreditCardAccount, getCreditUtilization, getDebtService, getSavingsRate, STARTER_CARD_MIN_CREDIT_SCORE } from '../../game/core/utils'
import { SECTION_THEMES } from '../../ui/sectionThemes'
import { BONDS, BOND_MAP } from './data'

type Props = {
  state: GameState
  dispatch: React.Dispatch<GameAction>
}

type BankingTab = 'accounts' | 'debt' | 'credit' | 'bonds'

type BankingUiState = {
  tab: BankingTab
  debtFilter: 'all' | 'delinquent' | 'credit-card' | 'secured'
  bondMode: 'desk' | 'holdings'
}

const BANKING_DEFAULT: BankingUiState = {
  tab: 'accounts',
  debtFilter: 'all',
  bondMode: 'desk',
}

const BANKING_TABS = [
  { id: 'accounts', label: 'Accounts', kicker: 'Checking and savings' },
  { id: 'debt', label: 'Debt', kicker: 'Stack' },
  { id: 'credit', label: 'Credit', kicker: 'Starter card' },
  { id: 'bonds', label: 'Bonds', kicker: 'Fixed income' },
] as const

export function BankingPanel({ state, dispatch }: Props) {
  const theme = SECTION_THEMES.banking
  const [ui, setUi] = useStoredUiState<BankingUiState>('street-to-stock-banking-ui-v1', BANKING_DEFAULT)

  const debtService = getDebtService(state)
  const creditCard = getCreditCardAccount(state)
  const creditUtilization = getCreditUtilization(state)
  const availableCredit = creditCard?.creditLimit ? Math.max(0, creditCard.creditLimit - creditCard.principal) : 0
  const save250Reason = !state.bankAccount ? 'Open a bank account first' : state.cash < 250 ? 'Need $250 in checking' : undefined
  const save1000Reason = !state.bankAccount ? 'Open a bank account first' : state.cash < 1000 ? 'Need $1,000 in checking' : undefined
  const withdraw250Reason = !state.bankAccount ? 'Open a bank account first' : state.savingsBalance < 250 ? 'Need $250 in savings' : undefined
  const withdraw1000Reason = !state.bankAccount ? 'Open a bank account first' : state.savingsBalance < 1000 ? 'Need $1,000 in savings' : undefined
  const openAccountReason = state.bankAccount ? 'Account already open' : state.actionPoints <= 0 ? 'No open days left this week' : state.cash < 25 ? 'Need $25 cash' : undefined
  const cardOpenReason = creditCard ? 'Starter card already open' : !state.bankAccount ? 'Open a bank account first' : state.creditScore < STARTER_CARD_MIN_CREDIT_SCORE ? `Reach ${STARTER_CARD_MIN_CREDIT_SCORE} credit score` : state.bankTrust < 14 ? 'Raise bank trust to 14' : undefined
  const charge250Reason = !creditCard ? 'Open a starter card first' : availableCredit < 250 ? 'Need $250 available credit' : undefined
  const charge750Reason = !creditCard ? 'Open a starter card first' : availableCredit < 750 ? 'Need $750 available credit' : undefined
  const repay250Reason = state.cash < 250 || state.debt <= 0 ? 'Need $250 cash and active debt' : undefined
  const repay1000Reason = state.cash < 1000 || state.debt <= 0 ? 'Need $1,000 cash and active debt' : undefined

  const filteredDebt = state.debtAccounts.filter((account) => {
    if (ui.debtFilter === 'delinquent' && account.delinquentMonths <= 0) return false
    if (ui.debtFilter === 'credit-card' && account.kind !== 'credit-card') return false
    if (ui.debtFilter === 'secured' && !account.securedPropertyUid) return false
    return true
  })

  const filters: ToolbarFilter[] =
    ui.tab === 'debt'
      ? [
          {
            id: 'debt-filter',
            label: 'Filter',
            type: 'select',
            value: ui.debtFilter,
            options: [
              { value: 'all', label: 'All debt' },
              { value: 'delinquent', label: 'Delinquent only' },
              { value: 'credit-card', label: 'Credit only' },
              { value: 'secured', label: 'Secured only' },
            ],
            onChange: (value) => setUi((current) => ({ ...current, debtFilter: value as BankingUiState['debtFilter'] })),
          },
        ]
      : ui.tab === 'bonds'
        ? [
            {
              id: 'bond-mode',
              label: 'View',
              type: 'select',
              value: ui.bondMode,
              options: [
                { value: 'desk', label: 'Bond desk' },
                { value: 'holdings', label: 'Your bond book' },
              ],
              onChange: (value) => setUi((current) => ({ ...current, bondMode: value as BankingUiState['bondMode'] })),
            },
          ]
        : []

  const summary =
    ui.tab === 'accounts'
      ? `${state.bankAccount ? 'banked' : 'unbanked'} | checking ${money(state.cash)} | savings ${money(state.savingsBalance)}`
      : ui.tab === 'debt'
        ? `${filteredDebt.length} accounts | service ${money(debtService)}`
        : ui.tab === 'credit'
          ? `${creditCard ? `${money(creditCard.principal)} / ${money(creditCard.creditLimit ?? 0)}` : 'no starter card'}`
          : `${ui.bondMode === 'desk' ? BONDS.length : state.bondHoldings.length} bond entries`

  return (
    <section
      className="panel section-panel banking-panel"
      data-ui-section="banking"
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
          <span className="panel-kicker">Banking</span>
          <h2>Institution stack</h2>
        </div>
        <p>This area should feel crisp and transactional: accounts, debt, credit, and fixed income separated into modes instead of one long financial dump.</p>
      </div>

      <SectionTabs
        sectionId="banking"
        activeTab={ui.tab}
        onChange={(tabId) => setUi((current) => ({ ...current, tab: tabId as BankingTab }))}
        tabs={BANKING_TABS as unknown as Array<{ id: string; label: string; kicker?: string }>}
        theme={theme}
      />

      <SectionToolbar sectionId="banking" filters={filters} summary={summary} />

      {ui.tab === 'accounts' ? (
        <div className="dual-grid">
          <article className="card current">
            <div className="card-topline">
              <h3>Accounts</h3>
              <span>{state.bankAccount ? 'Open' : 'Unbanked'}</span>
            </div>
            <div className="ledger-grid">
              <div><span>Checking</span><strong>{money(state.cash)}</strong></div>
              <div><span>Savings</span><strong>{money(state.savingsBalance)}</strong></div>
              <div><span>Savings yield</span><strong>{(getSavingsRate(state) * 100).toFixed(1)}%</strong></div>
              <div><span>Debt service</span><strong>{money(debtService)}</strong></div>
            </div>
            <div className="action-row">
              <button className="mini-button" disabled={!!save250Reason} onClick={() => dispatch({ type: 'DEPOSIT_SAVINGS', amount: 250 })} title={save250Reason}>Save $250</button>
              <button className="mini-button" disabled={!!save1000Reason} onClick={() => dispatch({ type: 'DEPOSIT_SAVINGS', amount: 1000 })} title={save1000Reason}>Save $1,000</button>
              <button
                id="open-bank-account-button"
                className="mini-button ghost"
                disabled={!!openAccountReason}
                onClick={() => dispatch({ type: 'OPEN_BANK_ACCOUNT' })}
                title={openAccountReason}
              >
                {state.bankAccount ? 'Account Open' : 'Open Account'}
              </button>
              <button className="mini-button ghost" disabled={!!withdraw250Reason} onClick={() => dispatch({ type: 'WITHDRAW_SAVINGS', amount: 250 })} title={withdraw250Reason}>Withdraw $250</button>
              <button className="mini-button ghost" disabled={!!withdraw1000Reason} onClick={() => dispatch({ type: 'WITHDRAW_SAVINGS', amount: 1000 })} title={withdraw1000Reason}>Withdraw $1,000</button>
            </div>
          </article>

          <article className="card">
            <div className="card-topline">
              <h3>Account posture</h3>
              <span>Trust {state.bankTrust}</span>
            </div>
            <p>Use this tab for cash management first. The rest of the financing layer gets cleaner once you stop treating checking like a permanent zero-balance relay point.</p>
            <div className="tag-row">
              <span className="tag">Credit score {state.creditScore}</span>
              <span className="tag">Debt {money(state.debt)}</span>
              <span className="tag">Open days {state.actionPoints}</span>
            </div>
          </article>
        </div>
      ) : null}

      {ui.tab === 'debt' ? (
        <div className="card-grid compact">
          {filteredDebt.length === 0 ? (
            <article className="card empty-state">
              <h3>No debt yet</h3>
              <p>You start poor but clean. Debt shows up later through credit use, overdrafts, tax rollovers, loans, missed payments, or expansion moves.</p>
            </article>
          ) : (
            filteredDebt.map((account) => (
              <div className="banking-row" key={account.uid}>
                <div className="card-topline">
                  <strong>{account.label}</strong>
                  <span>{money(account.principal)}</span>
                </div>
                <div className="tag-row">
                  <span className="tag">{account.kind}</span>
                  <span className="tag">{(account.monthlyRate * 100).toFixed(1)}%</span>
                  <span className="tag">Min {money(account.minimumPayment)}</span>
                  {account.creditLimit ? <span className="tag">Limit {money(account.creditLimit)}</span> : null}
                  {(account.deferMonthsRemaining ?? 0) > 0 ? <span className="tag">{account.kind === 'student' ? 'Grace' : 'Deferred'} {account.deferMonthsRemaining} mo</span> : null}
                  {account.linkedBusinessUid ? <span className="tag">Business note</span> : null}
                  {account.delinquentMonths > 0 ? <span className="tag accent">Late {account.delinquentMonths}</span> : null}
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}

      {ui.tab === 'credit' ? (
        <div className="dual-grid">
          <article className="card current">
            <div className="card-topline">
              <h3>Starter card</h3>
              <span>{creditCard ? `${(creditUtilization * 100).toFixed(0)}% util` : 'Not open'}</span>
            </div>
            <div className="ledger-grid">
              <div><span>Balance</span><strong>{creditCard ? money(creditCard.principal) : 'N/A'}</strong></div>
              <div><span>Limit</span><strong>{creditCard?.creditLimit ? money(creditCard.creditLimit) : 'N/A'}</strong></div>
              <div><span>Available credit</span><strong>{creditCard ? money(availableCredit) : 'N/A'}</strong></div>
              <div><span>Approval line</span><strong>{STARTER_CARD_MIN_CREDIT_SCORE}+ / trust 14</strong></div>
            </div>
            <div className="action-row">
              <button id="open-starter-card-button" className="mini-button" disabled={!!cardOpenReason} onClick={() => dispatch({ type: 'OPEN_CREDIT_CARD' })} title={cardOpenReason}>
                {creditCard ? 'Card Open' : 'Open Starter Card'}
              </button>
              <button id="charge-credit-card-250-button" className="mini-button ghost" disabled={!!charge250Reason} onClick={() => dispatch({ type: 'CHARGE_CREDIT_CARD', amount: 250 })} title={charge250Reason}>Charge $250</button>
              <button id="charge-credit-card-750-button" className="mini-button ghost" disabled={!!charge750Reason} onClick={() => dispatch({ type: 'CHARGE_CREDIT_CARD', amount: 750 })} title={charge750Reason}>Charge $750</button>
              <button id="repay-debt-250-button" className="mini-button ghost" disabled={!!repay250Reason} onClick={() => dispatch({ type: 'REPAY_DEBT', amount: 250 })} title={repay250Reason}>Repay $250</button>
              <button id="repay-debt-1000-button" className="mini-button ghost" disabled={!!repay1000Reason} onClick={() => dispatch({ type: 'REPAY_DEBT', amount: 1000 })} title={repay1000Reason}>Repay $1,000</button>
            </div>
          </article>

          <article className="card">
            <div className="card-topline">
              <h3>Use pattern</h3>
              <span>{creditCard ? 'Live line' : 'Pre-approval'}</span>
            </div>
            <p>Keep this area narrow on purpose. The card is a bridge and stress valve, not a replacement for stable cashflow. The key feedback loop is approval, utilization, repayment, then score recovery.</p>
            <div className="tag-row">
              <span className="tag">Credit score {state.creditScore}</span>
              <span className="tag">Bank trust {state.bankTrust}</span>
            </div>
          </article>
        </div>
      ) : null}

      {ui.tab === 'bonds' && ui.bondMode === 'desk' ? (
        <div className="card-grid">
          {BONDS.map((bond) => {
            const yieldRate = getBondYield(bond, state)
            const buyMinReason = !state.bankAccount ? 'Open a bank account first' : state.cash < bond.minPurchase ? `Need ${money(bond.minPurchase)} cash` : undefined
            const buy2Reason = !state.bankAccount ? 'Open a bank account first' : state.cash < bond.minPurchase * 2 ? `Need ${money(bond.minPurchase * 2)} cash` : undefined
            return (
              <article className="card" key={bond.id}>
                <CardMedia imageUrl={bond.imageUrl} imageAlt={bond.imageAlt} fallbackLabel={bond.title} size="compact" />
                <div className="card-topline">
                  <h3>{bond.title}</h3>
                  <span>{(yieldRate * 100).toFixed(1)}%</span>
                </div>
                <p>{bond.description}</p>
                <div className="tag-row">
                  <span className="tag">{bond.risk}</span>
                  <span className="tag">{bond.termMonths} mo</span>
                  <span className="tag">Min {money(bond.minPurchase)}</span>
                </div>
                <div className="action-row">
                  <button className="mini-button" disabled={!!buyMinReason} onClick={() => dispatch({ type: 'BUY_BOND', bondId: bond.id, amount: bond.minPurchase })} title={buyMinReason}>Buy Min</button>
                  <button className="mini-button ghost" disabled={!!buy2Reason} onClick={() => dispatch({ type: 'BUY_BOND', bondId: bond.id, amount: bond.minPurchase * 2 })} title={buy2Reason}>Buy 2x</button>
                </div>
              </article>
            )
          })}
        </div>
      ) : null}

      {ui.tab === 'bonds' && ui.bondMode === 'holdings' ? (
        <div className="card-grid">
          {state.bondHoldings.length === 0 ? (
            <article className="card empty-state">
              <h3>No bonds yet</h3>
              <p>Once cash flow stabilizes, bonds and savings can smooth the run between hustle mode and full risk-taking.</p>
            </article>
          ) : (
            state.bondHoldings.map((holding) => (
              <article className="card" key={holding.uid}>
                <CardMedia
                  imageUrl={BOND_MAP[holding.templateId].imageUrl}
                  imageAlt={BOND_MAP[holding.templateId].imageAlt}
                  fallbackLabel={BOND_MAP[holding.templateId].title}
                  size="compact"
                />
                <div className="card-topline">
                  <h3>{BOND_MAP[holding.templateId].title}</h3>
                  <span>{money(getBondValue(holding, state))}</span>
                </div>
                <div className="tag-row">
                  <span className="tag">Principal {money(holding.principal)}</span>
                  <span className="tag">Coupon {(holding.couponRate * 100).toFixed(1)}%</span>
                  <span className="tag">{holding.monthsRemaining} mo left</span>
                </div>
                <button className="mini-button ghost" onClick={() => dispatch({ type: 'SELL_BOND', bondUid: holding.uid })}>Sell Bond</button>
              </article>
            ))
          )}
        </div>
      ) : null}
    </section>
  )
}
