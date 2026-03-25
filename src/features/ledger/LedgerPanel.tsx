import { money } from '../../game/core/format'
import { getLatestSnapshot, getRecentHistory } from '../../game/core/selectors'
import type { GameState } from '../../game/core/types'

type Props = {
  state: GameState
}

export function LedgerPanel({ state }: Props) {
  const latest = getLatestSnapshot(state)
  const history = getRecentHistory(state)
  const maxNetWorth = Math.max(...history.map((item) => item.netWorth), 1)

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <span className="panel-kicker">Ledger</span>
          <h2>Monthly reports</h2>
        </div>
        <p>Track what is actually driving the run: earned income, asset income, carrying costs, taxes, and balance sheet trend.</p>
      </div>

      {!latest ? (
        <article className="card empty-state">
          <h3>No reporting history yet</h3>
          <p>End the first month to generate a ledger snapshot and start building trend history.</p>
        </article>
      ) : (
        <>
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

          <div className="panel-header subhead">
            <div>
              <span className="panel-kicker">Trend</span>
              <h2>History</h2>
            </div>
            <p>The recent run history makes it easier to see whether growth is real or just one good month.</p>
          </div>

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
        </>
      )}
    </section>
  )
}
