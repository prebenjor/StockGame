import { BONDS, BOND_MAP } from './data'
import { money } from '../../game/core/format'
import { getBondValue, getBondYield, getCreditCardAccount, getCreditUtilization, getDebtService, getSavingsRate } from '../../game/core/utils'
import type { GameAction, GameState } from '../../game/core/types'

type Props = {
  state: GameState
  dispatch: React.Dispatch<GameAction>
}

export function BankingPanel({ state, dispatch }: Props) {
  const debtService = getDebtService(state)
  const creditCard = getCreditCardAccount(state)
  const creditUtilization = getCreditUtilization(state)
  const availableCredit = creditCard?.creditLimit ? Math.max(0, creditCard.creditLimit - creditCard.principal) : 0
  const save250Reason = !state.bankAccount ? 'Open a bank account first' : state.cash < 250 ? 'Need $250 in checking' : undefined
  const save1000Reason = !state.bankAccount ? 'Open a bank account first' : state.cash < 1000 ? 'Need $1,000 in checking' : undefined
  const withdraw250Reason = !state.bankAccount ? 'Open a bank account first' : state.savingsBalance < 250 ? 'Need $250 in savings' : undefined
  const withdraw1000Reason = !state.bankAccount ? 'Open a bank account first' : state.savingsBalance < 1000 ? 'Need $1,000 in savings' : undefined
  const cardOpenReason = creditCard ? 'Starter card already open' : !state.bankAccount ? 'Open a bank account first' : state.creditScore < 560 ? 'Reach 560 credit score' : state.bankTrust < 14 ? 'Raise bank trust to 14' : undefined
  const charge250Reason = !creditCard ? 'Open a starter card first' : availableCredit < 250 ? 'Need $250 available credit' : undefined
  const charge750Reason = !creditCard ? 'Open a starter card first' : availableCredit < 750 ? 'Need $750 available credit' : undefined

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <span className="panel-kicker">Banking</span>
          <h2>Cash, loans, and fixed income</h2>
        </div>
        <p>Checking, savings, debt service, and bonds now sit in one place instead of being implied by the rest of the sim.</p>
      </div>

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
            <div><span>Credit line</span><strong>{creditCard?.creditLimit ? money(creditCard.creditLimit) : 'None'}</strong></div>
            <div><span>Utilization</span><strong>{creditCard ? `${(creditUtilization * 100).toFixed(0)}%` : 'N/A'}</strong></div>
          </div>
          <div className="action-stack">
            <div className="action-section">
              <span className="action-label">Primary Action</span>
              <div className="action-row">
                <button className="mini-button" disabled={!!save250Reason} onClick={() => dispatch({ type: 'DEPOSIT_SAVINGS', amount: 250 })} title={save250Reason}>
                  Save $250
                </button>
                <button className="mini-button" disabled={!!save1000Reason} onClick={() => dispatch({ type: 'DEPOSIT_SAVINGS', amount: 1000 })} title={save1000Reason}>
                  Save $1,000
                </button>
              </div>
              <p className="action-hint">
                {save250Reason ? `Blocked: ${save250Reason}.` : 'Primary move: move excess cash into savings once this week is covered.'}
              </p>
            </div>
            <div className="action-section">
              <span className="action-label">Secondary Actions</span>
              <div className="action-row">
                <button className="mini-button ghost" disabled={!!withdraw250Reason} onClick={() => dispatch({ type: 'WITHDRAW_SAVINGS', amount: 250 })} title={withdraw250Reason}>
                  Withdraw $250
                </button>
                <button className="mini-button ghost" disabled={!!withdraw1000Reason} onClick={() => dispatch({ type: 'WITHDRAW_SAVINGS', amount: 1000 })} title={withdraw1000Reason}>
                  Withdraw $1,000
                </button>
                <button className="mini-button" disabled={!!cardOpenReason} onClick={() => dispatch({ type: 'OPEN_CREDIT_CARD' })} title={cardOpenReason}>
                  {creditCard ? 'Card Open' : 'Open Starter Card'}
                </button>
                <button className="mini-button ghost" disabled={!!charge250Reason} onClick={() => dispatch({ type: 'CHARGE_CREDIT_CARD', amount: 250 })} title={charge250Reason}>
                  Charge $250
                </button>
                <button className="mini-button ghost" disabled={!!charge750Reason} onClick={() => dispatch({ type: 'CHARGE_CREDIT_CARD', amount: 750 })} title={charge750Reason}>
                  Charge $750
                </button>
              </div>
              <p className="action-hint">
                {cardOpenReason && !creditCard
                  ? `Card path blocked: ${cardOpenReason}.`
                  : 'Secondary actions: withdraw if you need liquidity, and use credit only as short-term buffer.'}
              </p>
            </div>
          </div>
        </article>

        <article className="card">
          <div className="card-topline">
            <h3>Debt stack</h3>
            <span>{money(state.debt)}</span>
          </div>
          {state.debtAccounts.length === 0 ? (
            <p>No active debt accounts.</p>
          ) : (
            <div className="card-grid compact">
              {state.debtAccounts.map((account) => (
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
              ))}
            </div>
          )}
        </article>
      </div>

      <div className="panel-header subhead">
        <div>
          <span className="panel-kicker">Fixed Income</span>
          <h2>Bond desk</h2>
        </div>
        <p>Bonds now provide a slower, rate-sensitive path between pure cash and full equity risk.</p>
      </div>

      <div className="card-grid">
        {BONDS.map((bond) => {
          const yieldRate = getBondYield(bond, state)
          const buyMinReason = !state.bankAccount ? 'Open a bank account first' : state.cash < bond.minPurchase ? `Need ${money(bond.minPurchase)} cash` : undefined
          const buy2Reason = !state.bankAccount ? 'Open a bank account first' : state.cash < bond.minPurchase * 2 ? `Need ${money(bond.minPurchase * 2)} cash` : undefined
          return (
            <article className="card" key={bond.id}>
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
              <div className="action-stack">
                <div className="action-section">
                  <span className="action-label">Primary Action</span>
                  <div className="action-row">
                    <button className="mini-button" disabled={!!buyMinReason} onClick={() => dispatch({ type: 'BUY_BOND', bondId: bond.id, amount: bond.minPurchase })} title={buyMinReason}>
                      Buy Min
                    </button>
                    <button className="mini-button ghost" disabled={!!buy2Reason} onClick={() => dispatch({ type: 'BUY_BOND', bondId: bond.id, amount: bond.minPurchase * 2 })} title={buy2Reason}>
                      Buy 2x
                    </button>
                  </div>
                  <p className="action-hint">
                    {buyMinReason ? `Blocked: ${buyMinReason}.` : 'Primary move: use bonds when you want slower, steadier deployment than stocks.'}
                  </p>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      <div className="panel-header subhead">
        <div>
          <span className="panel-kicker">Holdings</span>
          <h2>Your bond book</h2>
        </div>
        <p>Maturing paper returns principal automatically, while early sales now reflect rate moves.</p>
      </div>

      <div className="card-grid">
        {state.bondHoldings.length === 0 ? (
          <article className="card empty-state">
            <h3>No bonds yet</h3>
            <p>Once cash flow stabilizes, bonds and savings can smooth the run between hustle mode and full risk-taking.</p>
          </article>
        ) : (
          state.bondHoldings.map((holding) => (
            <article className="card" key={holding.uid}>
              <div className="card-topline">
                <h3>{BOND_MAP[holding.templateId].title}</h3>
                <span>{money(getBondValue(holding, state))}</span>
              </div>
              <div className="tag-row">
                <span className="tag">Principal {money(holding.principal)}</span>
                <span className="tag">Coupon {(holding.couponRate * 100).toFixed(1)}%</span>
                <span className="tag">{holding.monthsRemaining} mo left</span>
              </div>
              <button className="mini-button ghost" onClick={() => dispatch({ type: 'SELL_BOND', bondUid: holding.uid })}>
                Sell Bond
              </button>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
