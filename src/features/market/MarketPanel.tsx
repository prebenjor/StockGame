import { money, price } from '../../game/core/format'
import { getTradingFee, hasStableHousing } from '../../game/core/utils'
import type { GameAction, GameState } from '../../game/core/types'

type Props = {
  state: GameState
  dispatch: React.Dispatch<GameAction>
}

function CardMedia({ imageUrl, imageAlt }: { imageUrl?: string; imageAlt?: string }) {
  if (!imageUrl) return null

  return (
    <div className="card-media">
      <img src={imageUrl} alt={imageAlt ?? ''} loading="lazy" />
    </div>
  )
}

export function MarketPanel({ state, dispatch }: Props) {
  const fee = getTradingFee(state)
  const watchlistStocks = state.market.filter((stock) => state.watchlist.includes(stock.symbol))
  const holdingsValue = state.market.reduce((total, stock) => {
    const holding = state.holdings[stock.symbol]
    return total + (holding ? holding.shares * stock.price : 0)
  }, 0)
  const monthlyDividendRunRate = state.market.reduce((total, stock) => {
    const holding = state.holdings[stock.symbol]
    return total + (holding ? holding.shares * stock.dividend : 0)
  }, 0)
  const recentNews = state.marketNews.slice(0, 6)

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <span className="panel-kicker">Market</span>
          <h2>Stocks, ETFs, and news</h2>
        </div>
        <p>
          {state.bankAccount && hasStableHousing(state)
            ? 'The stock side now supports steadier ETF accumulation, watchlists, and weekly movement with bigger month-end earnings and news reactions.'
            : 'The tape is open even when you are broke, but bad banking and bad living conditions mean every trade leaks more edge in fees.'}
        </p>
      </div>

      <div className="dual-grid">
        <article className="card current">
          <div className="card-topline">
            <h3>Portfolio view</h3>
            <span>{money(holdingsValue)}</span>
          </div>
          <div className="ledger-grid">
            <div><span>Positions</span><strong>{Object.keys(state.holdings).length}</strong></div>
            <div><span>Watchlist names</span><strong>{state.watchlist.length}</strong></div>
            <div><span>Trade fee</span><strong>{money(fee)}</strong></div>
            <div><span>Dividend run rate</span><strong>{money(monthlyDividendRunRate)}/mo</strong></div>
          </div>
          <p>Use ETFs when you want exposure with less single-name drama. Use stocks when you want earnings upside and sharper downside.</p>
        </article>

        <article className="card">
          <div className="card-topline">
            <h3>Watchlist</h3>
            <span>{watchlistStocks.length === 0 ? 'Empty' : 'Live'}</span>
          </div>
          {watchlistStocks.length === 0 ? (
            <p>No names on the watchlist yet. Tag a few tickers so the market feed becomes easier to read.</p>
          ) : (
            <div className="card-grid compact">
              {watchlistStocks.map((stock) => (
                <div className="banking-row" key={stock.symbol}>
                  <div className="card-topline">
                    <strong>{stock.symbol}</strong>
                    <span className={stock.change >= 0 ? 'positive' : 'negative'}>
                      {stock.change >= 0 ? '+' : ''}
                      {stock.change}%
                    </span>
                  </div>
                  <div className="tag-row">
                    <span className="tag">{stock.assetType.toUpperCase()}</span>
                    <span className="tag">{stock.sector}</span>
                    <span className="tag">{price(stock.price)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      </div>

      <div className="panel-header subhead">
        <div>
          <span className="panel-kicker">News</span>
          <h2>Recent market tape</h2>
        </div>
        <p>Quarterly earnings and watchlist alerts now surface here instead of being buried in the general event log.</p>
      </div>

      <div className="card-grid compact">
        {recentNews.length === 0 ? (
          <article className="card empty-state">
            <h3>No market news yet</h3>
            <p>End a few months and the tape will start printing earnings beats, misses, and watchlist alerts.</p>
          </article>
        ) : (
          recentNews.map((item) => (
            <article className={`card ${item.tone === 'bad' ? 'log-entry bad' : item.tone === 'good' ? 'log-entry good' : ''}`} key={item.id}>
              <div className="card-topline">
                <h3>{item.symbol}</h3>
                <span>Week {item.week}</span>
              </div>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </article>
          ))
        )}
      </div>

      <div className="panel-header subhead">
        <div>
          <span className="panel-kicker">Exchange</span>
          <h2>Tradeable universe</h2>
        </div>
        <p>Single stocks bring earnings risk. ETFs smooth the ride and make the market system matter earlier in the run.</p>
      </div>

      <div className="card-grid">
        {state.market.map((stock) => {
          const holding = state.holdings[stock.symbol]
          const isWatching = state.watchlist.includes(stock.symbol)
          const buyOneReason = state.cash < stock.price + fee ? `Need ${money(Math.ceil(stock.price + fee))} cash` : undefined
          const buyFiveReason = state.cash < stock.price * 5 + fee ? `Need ${money(Math.ceil(stock.price * 5 + fee))} cash` : undefined
          const sellReason = !holding ? 'No shares owned' : undefined

          return (
            <article className="card stock-card" key={stock.symbol}>
              <CardMedia imageUrl={stock.imageUrl} imageAlt={stock.imageAlt} />
              <div className="card-topline">
                <h3>{stock.symbol}</h3>
                <span className={stock.change >= 0 ? 'positive' : 'negative'}>
                  {stock.change >= 0 ? '+' : ''}
                  {stock.change}%
                </span>
              </div>
              <p>{stock.name}</p>
              <p>{stock.thesis}</p>
              <div className="stock-meta">
                <strong>{price(stock.price)}</strong>
                <span>{stock.assetType === 'etf' ? `ETF | ${stock.sector}` : `Stock | ${stock.sector}`}</span>
                <span>Dividend {price(stock.dividend)}/share</span>
              </div>
              <div className="tag-row">
                <span className="tag">Holding {holding ? `${holding.shares} sh` : 'none'}</span>
                {holding ? <span className="tag">Avg {price(holding.averageCost)}</span> : null}
                <span className="tag">Fee {money(fee)}</span>
                {stock.assetType === 'etf'
                  ? <span className="tag">ER {((stock.expenseRatio ?? 0) * 100).toFixed(2)}%</span>
                  : <span className="tag">Earnings q{(((stock.earningsMonth ?? 1) - 1) % 4) + 1}</span>}
                {isWatching ? <span className="tag accent">Watching</span> : null}
              </div>
              <div className="action-stack">
                <div className="action-section">
                  <span className="action-label">Primary Action</span>
                  <div className="action-row">
                    <button className="mini-button" disabled={!!buyOneReason} onClick={() => dispatch({ type: 'BUY_STOCK', symbol: stock.symbol, shares: 1 })} title={buyOneReason}>
                      Buy 1
                    </button>
                    <button className="mini-button" disabled={!!buyFiveReason} onClick={() => dispatch({ type: 'BUY_STOCK', symbol: stock.symbol, shares: 5 })} title={buyFiveReason}>
                      Buy 5
                    </button>
                    <button className="mini-button ghost" onClick={() => dispatch({ type: 'TOGGLE_WATCHLIST', symbol: stock.symbol })}>
                      {isWatching ? 'Unwatch' : 'Watch'}
                    </button>
                  </div>
                  <p className="action-hint">
                    {buyOneReason ? `Blocked: ${buyOneReason}.` : 'Primary move: buy small unless you already know why you want size.'}
                  </p>
                </div>
                <div className="action-section">
                  <span className="action-label">Secondary Actions</span>
                  <div className="action-row">
                    <button className="mini-button ghost" disabled={!!sellReason} onClick={() => dispatch({ type: 'SELL_STOCK', symbol: stock.symbol, shares: 1 })} title={sellReason}>
                      Sell 1
                    </button>
                    <button className="mini-button ghost" disabled={!!sellReason} onClick={() => dispatch({ type: 'SELL_STOCK', symbol: stock.symbol, shares: holding?.shares ?? 0 })} title={sellReason}>
                      Sell All
                    </button>
                  </div>
                  <p className="action-hint">
                    {sellReason ? `Sell blocked: ${sellReason}.` : 'Secondary move: trim positions when you need liquidity or conviction has changed.'}
                  </p>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
