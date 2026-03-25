import { BONDS, BOND_MAP } from './data'
import { money } from '../../game/core/format'
import { getBondValue, getBondYield, getDebtService, getSavingsRate } from '../../game/core/utils'
import type { GameAction, GameState } from '../../game/core/types'

type Props = {
  state: GameState
  dispatch: React.Dispatch<GameAction>
}

export function BankingPanel({ state, dispatch }: Props) {
  const debtService = getDebtService(state)

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
          </div>
          <div className="action-row">
            <button className="mini-button" disabled={!state.bankAccount || state.cash < 250} onClick={() => dispatch({ type: 'DEPOSIT_SAVINGS', amount: 250 })}>
              Save $250
            </button>
            <button className="mini-button" disabled={!state.bankAccount || state.cash < 1000} onClick={() => dispatch({ type: 'DEPOSIT_SAVINGS', amount: 1000 })}>
              Save $1,000
            </button>
            <button className="mini-button ghost" disabled={!state.bankAccount || state.savingsBalance < 250} onClick={() => dispatch({ type: 'WITHDRAW_SAVINGS', amount: 250 })}>
              Withdraw $250
            </button>
            <button className="mini-button ghost" disabled={!state.bankAccount || state.savingsBalance < 1000} onClick={() => dispatch({ type: 'WITHDRAW_SAVINGS', amount: 1000 })}>
              Withdraw $1,000
            </button>
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
                    {(account.deferMonthsRemaining ?? 0) > 0 ? <span className="tag">Deferred {account.deferMonthsRemaining} mo</span> : null}
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
              <div className="action-row">
                <button className="mini-button" disabled={!state.bankAccount || state.cash < bond.minPurchase} onClick={() => dispatch({ type: 'BUY_BOND', bondId: bond.id, amount: bond.minPurchase })}>
                  Buy Min
                </button>
                <button className="mini-button ghost" disabled={!state.bankAccount || state.cash < bond.minPurchase * 2} onClick={() => dispatch({ type: 'BUY_BOND', bondId: bond.id, amount: bond.minPurchase * 2 })}>
                  Buy 2x
                </button>
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
