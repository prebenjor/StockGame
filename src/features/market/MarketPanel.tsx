import { money, price } from '../../game/core/format'
import { getTradingFee, hasStableHousing } from '../../game/core/utils'
import type { GameAction, GameState } from '../../game/core/types'

type Props = {
  state: GameState
  dispatch: React.Dispatch<GameAction>
}

export function MarketPanel({ state, dispatch }: Props) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <span className="panel-kicker">Market</span>
          <h2>Stocks</h2>
        </div>
        <p>{state.bankAccount && hasStableHousing(state) ? 'Buy stable dividend names for support or chase volatile movers for bigger swings.' : 'The tape is open even when you are broke, but bad banking and bad living conditions mean every trade leaks more edge in fees.'}</p>
      </div>

      <div className="card-grid">
        {state.market.map((stock) => {
          const holding = state.holdings[stock.symbol]
          const fee = getTradingFee(state)
          return (
            <article className="card stock-card" key={stock.symbol}>
              <div className="card-topline">
                <h3>{stock.symbol}</h3>
                <span className={stock.change >= 0 ? 'positive' : 'negative'}>
                  {stock.change >= 0 ? '+' : ''}
                  {stock.change}%
                </span>
              </div>
              <p>{stock.name}</p>
              <div className="stock-meta">
                <strong>{price(stock.price)}</strong>
                <span>{stock.sector}</span>
                <span>Dividend {price(stock.dividend)}/share</span>
              </div>
              <div className="tag-row">
                <span className="tag">Holding {holding ? `${holding.shares} sh` : 'none'}</span>
                {holding ? <span className="tag">Avg {price(holding.averageCost)}</span> : null}
                <span className="tag">Fee {money(fee)}</span>
              </div>
              <div className="action-row">
                <button className="mini-button" disabled={state.cash < stock.price + fee} onClick={() => dispatch({ type: 'BUY_STOCK', symbol: stock.symbol, shares: 1 })}>Buy 1</button>
                <button className="mini-button" disabled={state.cash < stock.price * 5 + fee} onClick={() => dispatch({ type: 'BUY_STOCK', symbol: stock.symbol, shares: 5 })}>Buy 5</button>
                <button className="mini-button ghost" disabled={!holding} onClick={() => dispatch({ type: 'SELL_STOCK', symbol: stock.symbol, shares: 1 })}>Sell 1</button>
                <button className="mini-button ghost" disabled={!holding} onClick={() => dispatch({ type: 'SELL_STOCK', symbol: stock.symbol, shares: holding?.shares ?? 0 })}>Sell All</button>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
