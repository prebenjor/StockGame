import { useEffect, useState } from 'react'
import { CardMedia } from '../../components/CardMedia'
import { SectionTabs } from '../../components/SectionTabs'
import { SectionToolbar, type ToolbarFilter } from '../../components/SectionToolbar'
import { useStoredUiState } from '../../components/useStoredUiState'
import { money, price } from '../../game/core/format'
import type { GameAction, GameState, MarketHistoryPoint } from '../../game/core/types'
import { getTradingFee, hasStableHousing } from '../../game/core/utils'
import { SECTION_THEMES } from '../../ui/sectionThemes'
import {
  MARKET_CHART_RANGES,
  describeMarketTrend,
  getMarketRangeChange,
  toMarketChartPoints,
  type MarketChartRange,
} from './chartRanges'
import { MarketHeroChart, MarketSparkline } from './MarketCharts'

type Props = {
  state: GameState
  dispatch: React.Dispatch<GameAction>
}

type MarketTab = 'overview' | 'watchlist' | 'news' | 'exchange'
type TradeMode = 'buy' | 'sell' | null

type MarketUiState = {
  tab: MarketTab
  chartRange: MarketChartRange
  search: string
  overviewType: 'all' | 'stock' | 'etf'
  exchangeType: 'all' | 'stock' | 'etf'
  watchlistType: 'all' | 'stock' | 'etf'
  sector: 'all' | string
  newsTone: 'all' | 'good' | 'bad' | 'neutral'
  newsType: 'all' | 'earnings' | 'watchlist'
  watchlistOnlyNews: boolean
  affordableOnly: boolean
  watchedOnly: boolean
  heldOnly: boolean
  sort: 'move-desc' | 'move-asc' | 'price-desc' | 'price-asc' | 'symbol'
  selectedSymbol: string
  tradeMode: TradeMode
  tradeShares: number
}

const MARKET_TABS = [
  { id: 'overview', label: 'Overview', kicker: 'Desk' },
  { id: 'watchlist', label: 'Watchlist', kicker: 'Tracked names' },
  { id: 'news', label: 'News', kicker: 'Tape' },
  { id: 'exchange', label: 'Exchange', kicker: 'Trade' },
] as const

const MARKET_UI_DEFAULT: MarketUiState = {
  tab: 'overview',
  chartRange: '1y',
  search: '',
  overviewType: 'all',
  exchangeType: 'all',
  watchlistType: 'all',
  sector: 'all',
  newsTone: 'all',
  newsType: 'all',
  watchlistOnlyNews: false,
  affordableOnly: false,
  watchedOnly: false,
  heldOnly: false,
  sort: 'move-desc',
  selectedSymbol: 'CITY',
  tradeMode: null,
  tradeShares: 1,
}

function getSearchMatch(text: string, search: string) {
  if (!search.trim()) return true
  return text.toLowerCase().includes(search.trim().toLowerCase())
}

function formatPercent(value: number) {
  const rounded = Math.round(value * 10) / 10
  return `${rounded >= 0 ? '+' : ''}${rounded.toFixed(1)}%`
}

function sortMarketRows(
  rows: GameState['market'],
  sort: MarketUiState['sort'],
  holdings: GameState['holdings'],
) {
  return rows.slice().sort((left, right) => {
    if (sort === 'move-desc') return right.change - left.change
    if (sort === 'move-asc') return left.change - right.change
    if (sort === 'price-desc') return right.price - left.price
    if (sort === 'price-asc') return left.price - right.price
    if (sort === 'symbol') return left.symbol.localeCompare(right.symbol)

    const leftShares = holdings[left.symbol]?.shares ?? 0
    const rightShares = holdings[right.symbol]?.shares ?? 0
    return rightShares - leftShares
  })
}

function getRangeLabel(range: MarketChartRange) {
  return MARKET_CHART_RANGES.find((option) => option.value === range)?.label ?? 'All'
}

function getChartPoints(history: MarketHistoryPoint[], range: MarketChartRange, currentWeek: number) {
  return toMarketChartPoints(history, range, currentWeek)
}

function getRelativeNewsAge(currentWeek: number, newsWeek: number) {
  const delta = Math.max(0, currentWeek - newsWeek)
  if (delta === 0) return 'This week'
  if (delta === 1) return '1 week ago'
  return `${delta} weeks ago`
}

export function MarketPanel({ state, dispatch }: Props) {
  const theme = SECTION_THEMES.market
  const fee = getTradingFee(state)
  const sectors = ['all', ...Array.from(new Set(state.market.map((stock) => stock.sector))).sort()]
  const [ui, setUi] = useStoredUiState<MarketUiState>('street-to-stock-market-ui-v3', MARKET_UI_DEFAULT)
  const [flashMessage, setFlashMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!flashMessage) return undefined
    const timeout = window.setTimeout(() => setFlashMessage(null), 2200)
    return () => window.clearTimeout(timeout)
  }, [flashMessage])

  const heldSymbols = Object.keys(state.holdings).filter((symbol) => (state.holdings[symbol]?.shares ?? 0) > 0)
  const fallbackSelectedSymbol = state.watchlist[0] ?? heldSymbols[0] ?? state.market[0]?.symbol ?? 'CITY'

  const overviewRows = sortMarketRows(
    state.market.filter((stock) => {
      if (!getSearchMatch(`${stock.symbol} ${stock.name} ${stock.sector} ${stock.thesis}`, ui.search)) return false
      if (ui.overviewType !== 'all' && stock.assetType !== ui.overviewType) return false
      return true
    }),
    ui.sort,
    state.holdings,
  )

  const watchlistRows = sortMarketRows(
    state.market
      .filter((stock) => state.watchlist.includes(stock.symbol))
      .filter((stock) => {
        if (!getSearchMatch(`${stock.symbol} ${stock.name} ${stock.sector}`, ui.search)) return false
        if (ui.watchlistType !== 'all' && stock.assetType !== ui.watchlistType) return false
        if (ui.heldOnly && !state.holdings[stock.symbol]) return false
        return true
      }),
    ui.sort,
    state.holdings,
  )

  const newsRows = state.marketNews.filter((item) => {
    if (!getSearchMatch(`${item.symbol} ${item.title} ${item.detail}`, ui.search)) return false
    if (ui.newsTone !== 'all' && item.tone !== ui.newsTone) return false
    if (ui.newsType === 'earnings' && !item.title.toLowerCase().includes('earnings')) return false
    if (ui.newsType === 'watchlist' && !item.title.toLowerCase().includes('watchlist')) return false
    if (ui.watchlistOnlyNews && !state.watchlist.includes(item.symbol)) return false
    return true
  })

  const exchangeRows = sortMarketRows(
    state.market.filter((stock) => {
      if (!getSearchMatch(`${stock.symbol} ${stock.name} ${stock.sector} ${stock.thesis}`, ui.search)) return false
      if (ui.exchangeType !== 'all' && stock.assetType !== ui.exchangeType) return false
      if (ui.sector !== 'all' && stock.sector !== ui.sector) return false
      if (ui.affordableOnly && state.cash < stock.price + fee) return false
      if (ui.watchedOnly && !state.watchlist.includes(stock.symbol)) return false
      if (ui.heldOnly && !state.holdings[stock.symbol]) return false
      return true
    }),
    ui.sort,
    state.holdings,
  )

  const selectedSymbolExists = state.market.some((stock) => stock.symbol === ui.selectedSymbol)
  const storedSelectedSymbol = selectedSymbolExists ? ui.selectedSymbol : fallbackSelectedSymbol
  const selectedSymbol =
    ui.tab === 'overview'
      ? (overviewRows.find((stock) => stock.symbol === storedSelectedSymbol)?.symbol ?? overviewRows[0]?.symbol ?? fallbackSelectedSymbol)
      : storedSelectedSymbol
  const selectedStock = state.market.find((stock) => stock.symbol === selectedSymbol) ?? state.market[0]
  const selectedHolding = state.holdings[selectedSymbol]
  const selectedPoints = getChartPoints(state.marketHistory[selectedSymbol] ?? [], ui.chartRange, state.week)
  const selectedRangeChange = getMarketRangeChange(state.marketHistory[selectedSymbol] ?? [], ui.chartRange, state.week)
  const rangeLabel = getRangeLabel(ui.chartRange)
  const selectedTrend = describeMarketTrend(selectedRangeChange)
  const latestNews = state.marketNews.slice(0, 3)
  const latestMoverRows = state.market.slice().sort((left, right) => right.change - left.change)

  const holdingsValue = state.market.reduce((total, stock) => {
    const holding = state.holdings[stock.symbol]
    return total + (holding ? holding.shares * stock.price : 0)
  }, 0)
  const holdingsCostBasis = state.market.reduce((total, stock) => {
    const holding = state.holdings[stock.symbol]
    return total + (holding ? holding.shares * holding.averageCost : 0)
  }, 0)
  const portfolioDelta = holdingsValue - holdingsCostBasis
  const monthlyDividendRunRate = state.market.reduce((total, stock) => {
    const holding = state.holdings[stock.symbol]
    return total + (holding ? holding.shares * stock.dividend : 0)
  }, 0)

  const tradeShares = Math.max(1, Math.floor(ui.tradeShares || 1))
  const buyTotal = selectedStock ? selectedStock.price * tradeShares + fee : 0
  const sellGross = selectedStock ? selectedStock.price * tradeShares : 0
  const sellNet = Math.max(0, sellGross - fee)
  const buyRemaining = state.cash - buyTotal
  const sellRemainingShares = Math.max(0, (selectedHolding?.shares ?? 0) - tradeShares)
  const canBuy = selectedStock && buyRemaining >= 0
  const canSell = selectedStock && selectedHolding && tradeShares <= selectedHolding.shares

  const selectSymbol = (symbol: string) => {
    setUi((current) => ({
      ...current,
      selectedSymbol: symbol,
      tradeMode: null,
      tradeShares: 1,
    }))
  }

  const updateTradeShares = (nextShares: number) => {
    setUi((current) => ({
      ...current,
      tradeShares: Math.max(1, Math.floor(nextShares || 1)),
    }))
  }

  const toolbarFilters: ToolbarFilter[] =
    ui.tab === 'overview'
      ? [
          {
            id: 'overview-type',
            label: 'Type',
            type: 'select',
            value: ui.overviewType,
            options: [
              { value: 'all', label: 'All assets' },
              { value: 'stock', label: 'Stocks' },
              { value: 'etf', label: 'ETFs' },
            ],
            onChange: (value) => setUi((current) => ({ ...current, overviewType: value as MarketUiState['overviewType'] })),
          },
        ]
      : ui.tab === 'watchlist'
        ? [
            {
              id: 'watchlist-type',
              label: 'Type',
              type: 'select',
              value: ui.watchlistType,
              options: [
                { value: 'all', label: 'All assets' },
                { value: 'stock', label: 'Stocks' },
                { value: 'etf', label: 'ETFs' },
              ],
              onChange: (value) => setUi((current) => ({ ...current, watchlistType: value as MarketUiState['watchlistType'] })),
            },
            {
              id: 'watchlist-held',
              label: 'Held only',
              type: 'toggle',
              checked: ui.heldOnly,
              onChange: (checked) => setUi((current) => ({ ...current, heldOnly: checked })),
            },
          ]
        : ui.tab === 'news'
          ? [
              {
                id: 'news-type',
                label: 'Event',
                type: 'select',
                value: ui.newsType,
                options: [
                  { value: 'all', label: 'All events' },
                  { value: 'earnings', label: 'Earnings' },
                  { value: 'watchlist', label: 'Watchlist alerts' },
                ],
                onChange: (value) => setUi((current) => ({ ...current, newsType: value as MarketUiState['newsType'] })),
              },
              {
                id: 'news-tone',
                label: 'Tone',
                type: 'select',
                value: ui.newsTone,
                options: [
                  { value: 'all', label: 'All tones' },
                  { value: 'good', label: 'Positive' },
                  { value: 'bad', label: 'Negative' },
                  { value: 'neutral', label: 'Neutral' },
                ],
                onChange: (value) => setUi((current) => ({ ...current, newsTone: value as MarketUiState['newsTone'] })),
              },
              {
                id: 'news-watchlist',
                label: 'Watchlist only',
                type: 'toggle',
                checked: ui.watchlistOnlyNews,
                onChange: (checked) => setUi((current) => ({ ...current, watchlistOnlyNews: checked })),
              },
            ]
          : [
              {
                id: 'exchange-type',
                label: 'Type',
                type: 'select',
                value: ui.exchangeType,
                options: [
                  { value: 'all', label: 'All assets' },
                  { value: 'stock', label: 'Stocks' },
                  { value: 'etf', label: 'ETFs' },
                ],
                onChange: (value) => setUi((current) => ({ ...current, exchangeType: value as MarketUiState['exchangeType'] })),
              },
              {
                id: 'exchange-sector',
                label: 'Sector',
                type: 'select',
                value: ui.sector,
                options: sectors.map((sector) => ({
                  value: sector,
                  label: sector === 'all' ? 'All sectors' : sector,
                })),
                onChange: (value) => setUi((current) => ({ ...current, sector: value })),
              },
              {
                id: 'exchange-affordable',
                label: 'Affordable now',
                type: 'toggle',
                checked: ui.affordableOnly,
                onChange: (checked) => setUi((current) => ({ ...current, affordableOnly: checked })),
              },
              {
                id: 'exchange-watched',
                label: 'Watched only',
                type: 'toggle',
                checked: ui.watchedOnly,
                onChange: (checked) => setUi((current) => ({ ...current, watchedOnly: checked })),
              },
              {
                id: 'exchange-held',
                label: 'Held only',
                type: 'toggle',
                checked: ui.heldOnly,
                onChange: (checked) => setUi((current) => ({ ...current, heldOnly: checked })),
              },
            ]
  const sortOptions =
    ui.tab === 'news'
      ? []
      : [
          { value: 'move-desc', label: 'Move high to low' },
          { value: 'move-asc', label: 'Move low to high' },
          { value: 'price-desc', label: 'Price high to low' },
          { value: 'price-asc', label: 'Price low to high' },
          { value: 'symbol', label: 'Symbol A-Z' },
        ]

  const searchPlaceholder =
    ui.tab === 'news'
      ? 'Search tape by symbol or headline'
      : 'Search symbols, names, and sectors'

  const toolbarSummary =
    ui.tab === 'overview'
      ? `${overviewRows.length} symbols | ${state.watchlist.length} watchlist | ${selectedStock.symbol} | ${ui.tradeMode ?? 'read'}`
      : ui.tab === 'watchlist'
        ? `${watchlistRows.length} tracked names | ${rangeLabel} view | sorted ${ui.sort.replace('-', ' ')}`
        : ui.tab === 'news'
          ? `${newsRows.length} tape items | ${ui.newsType === 'all' ? 'all events' : ui.newsType} | ${ui.newsTone === 'all' ? 'all tones' : ui.newsTone}`
          : `${exchangeRows.length} tradable names | ${rangeLabel} view | sorted ${ui.sort.replace('-', ' ')}`

  return (
    <section
      className="panel section-panel market-panel"
      data-ui-section="market"
      data-active-subtab={ui.tab}
      data-toolbar-summary={toolbarSummary}
      data-selected-symbol={selectedSymbol}
      data-chart-range={ui.chartRange}
      data-trade-mode={ui.tradeMode ?? ''}
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
          <span className="panel-kicker">Market</span>
          <h2>Exchange, tape, and watchlist flow</h2>
        </div>
        <p>
          {state.bankAccount && hasStableHousing(state)
            ? 'Read the board, pick a time window, and avoid forcing trades.'
            : 'The market gets easier once life is steadier, but you can still start small. Read the board, pick a time window, and avoid forcing trades.'}
        </p>
      </div>

      <SectionTabs
        sectionId="market"
        activeTab={ui.tab}
        onChange={(tabId) =>
          setUi((current) => ({
            ...current,
            tab: tabId as MarketTab,
            tradeMode: null,
            tradeShares: 1,
          }))
        }
        tabs={MARKET_TABS as unknown as Array<{ id: string; label: string; kicker?: string }>}
        theme={theme}
      />

      {ui.tab !== 'overview' ? (
        <SectionToolbar
          sectionId="market"
          searchValue={ui.search}
          searchPlaceholder={searchPlaceholder}
          onSearchChange={(value) => setUi((current) => ({ ...current, search: value }))}
          filters={toolbarFilters}
          sortOptions={sortOptions}
          sortValue={sortOptions.length > 0 ? ui.sort : undefined}
          onSortChange={sortOptions.length > 0 ? (value) => setUi((current) => ({ ...current, sort: value as MarketUiState['sort'] })) : undefined}
          summary={toolbarSummary}
        />
      ) : null}

      {ui.tab === 'overview' ? (
        <div className="section-stack market-overview-stack">
          <article className="market-portfolio-bar">
            <div className="market-portfolio-stat">
              <span>Portfolio Value</span>
              <strong className={portfolioDelta > 0 ? 'positive' : portfolioDelta < 0 ? 'negative' : ''}>{money(holdingsValue)}</strong>
            </div>
            <div className="market-portfolio-stat">
              <span>Cash Available</span>
              <strong>{money(state.cash)}</strong>
            </div>
            <div className="market-portfolio-stat">
              <span>Positions</span>
              <strong>{heldSymbols.length}</strong>
            </div>
            <div className="market-portfolio-stat">
              <span>Watchlist</span>
              <strong>{state.watchlist.length}</strong>
            </div>
            <div className="market-portfolio-stat">
              <span>Dividend Income / mo</span>
              <strong>{money(monthlyDividendRunRate)}</strong>
            </div>
          </article>

          <div className="market-ticker-strip" aria-label="Weekly market movers">
            {latestMoverRows.map((stock) => (
              <button
                key={stock.symbol}
                className={`market-ticker-chip ${selectedSymbol === stock.symbol ? 'selected' : ''} ${stock.change >= 0 ? 'positive' : 'negative'}`}
                type="button"
                onClick={() => selectSymbol(stock.symbol)}
              >
                <strong>{stock.symbol}</strong>
                <span>{formatPercent(stock.change)}</span>
              </button>
            ))}
          </div>

          <article className="market-quote-card">
            <div className="market-quote-main">
              <div className="market-quote-header">
                <div className="market-quote-line">
                  <strong>{selectedStock.symbol}</strong>
                  <span>{selectedStock.name}</span>
                  <strong>{price(selectedStock.price)}</strong>
                  <span className={`market-change-pill ${selectedRangeChange >= 0 ? 'positive' : 'negative'}`}>{formatPercent(selectedRangeChange)}</span>
                </div>
              </div>

              <MarketHeroChart
                points={selectedPoints}
                range={ui.chartRange}
                change={selectedRangeChange}
                label={`${selectedStock.symbol} chart`}
              />

              <div className="market-range-row" role="group" aria-label="Select market chart range">
                {MARKET_CHART_RANGES.map((option) => (
                  <button
                    key={option.value}
                    className={`market-range-button ${ui.chartRange === option.value ? 'active' : ''}`}
                    type="button"
                    onClick={() => setUi((current) => ({ ...current, chartRange: option.value }))}
                    aria-pressed={ui.chartRange === option.value}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <aside className="market-quote-side">
              <div className="card-topline">
                <h3>Symbol details</h3>
                <span>{rangeLabel}</span>
              </div>
              <dl className="market-detail-list">
                <div><dt>Price</dt><dd>{price(selectedStock.price)}</dd></div>
                <div><dt>Week Δ</dt><dd className={selectedStock.change >= 0 ? 'positive' : 'negative'}>{formatPercent(selectedStock.change)}</dd></div>
                <div><dt>Type</dt><dd>{selectedStock.assetType.toUpperCase()}</dd></div>
                <div><dt>Sector</dt><dd>{selectedStock.sector}</dd></div>
                <div><dt>Fee</dt><dd>{money(fee)}</dd></div>
                <div><dt>Trend</dt><dd className={selectedRangeChange >= 0 ? 'positive' : selectedRangeChange < 0 ? 'negative' : ''}>{selectedTrend.replace(' trend', '')}</dd></div>
              </dl>

              <div className="market-quote-actions">
                <button
                  className="mini-button"
                  type="button"
                  onClick={() => setUi((current) => ({ ...current, tradeMode: 'buy', tradeShares: Math.max(1, current.tradeShares || 1) }))}
                >
                  Buy
                </button>
                <button
                  className={`mini-button ghost ${state.watchlist.includes(selectedStock.symbol) ? 'active' : ''}`}
                  type="button"
                  onClick={() => dispatch({ type: 'TOGGLE_WATCHLIST', symbol: selectedStock.symbol })}
                >
                  {state.watchlist.includes(selectedStock.symbol) ? '★ Watching' : '+ Watchlist'}
                </button>
                {selectedHolding ? (
                  <button
                    className="mini-button ghost"
                    type="button"
                    onClick={() => setUi((current) => ({ ...current, tradeMode: 'sell', tradeShares: Math.min(selectedHolding.shares, Math.max(1, current.tradeShares || 1)) }))}
                  >
                    Sell
                  </button>
                ) : null}
              </div>

              {ui.tradeMode ? (
                <div className="market-trade-panel">
                  <div className="market-trade-header">
                    <strong>{ui.tradeMode === 'buy' ? 'Buy' : 'Sell'} {selectedStock.symbol}</strong>
                    <span>{price(selectedStock.price)}/share</span>
                  </div>

                  <div className="market-trade-quantity">
                    <label htmlFor="market-trade-shares">Shares</label>
                    <div className="market-trade-stepper">
                      <button type="button" className="mini-button ghost" onClick={() => updateTradeShares(tradeShares - 1)} disabled={tradeShares <= 1}>
                        -
                      </button>
                      <input
                        id="market-trade-shares"
                        type="number"
                        min={1}
                        max={ui.tradeMode === 'sell' ? selectedHolding?.shares ?? 1 : undefined}
                        value={tradeShares}
                        onChange={(event) => updateTradeShares(Number(event.target.value))}
                      />
                      <button
                        type="button"
                        className="mini-button ghost"
                        onClick={() => updateTradeShares(tradeShares + 1)}
                        disabled={ui.tradeMode === 'sell' && !!selectedHolding && tradeShares >= selectedHolding.shares}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <dl className="market-trade-summary">
                    {ui.tradeMode === 'buy' ? (
                      <>
                        <div><dt>Total cost</dt><dd>{money(buyTotal)}</dd></div>
                        <div><dt>Your cash</dt><dd>{money(state.cash)}</dd></div>
                        <div><dt>Remaining</dt><dd className={buyRemaining >= 0 ? '' : 'negative'}>{money(buyRemaining)}</dd></div>
                        <div><dt>Fee</dt><dd>{money(fee)}</dd></div>
                      </>
                    ) : (
                      <>
                        <div><dt>Total proceeds</dt><dd>{money(sellNet)}</dd></div>
                        <div><dt>Your cash</dt><dd>{money(state.cash)}</dd></div>
                        <div><dt>After sale</dt><dd>{money(state.cash + sellNet)}</dd></div>
                        <div><dt>Fee</dt><dd>{money(fee)}</dd></div>
                        <div><dt>Shares left</dt><dd>{sellRemainingShares}</dd></div>
                      </>
                    )}
                  </dl>

                  <div className="market-trade-actions">
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => setUi((current) => ({ ...current, tradeMode: null, tradeShares: 1 }))}
                    >
                      Cancel
                    </button>
                    <button
                      className="primary-button"
                      type="button"
                      disabled={ui.tradeMode === 'buy' ? !canBuy : !canSell}
                      onClick={() => {
                        if (ui.tradeMode === 'buy') {
                          dispatch({ type: 'BUY_STOCK', symbol: selectedStock.symbol, shares: tradeShares })
                          setFlashMessage(`Bought ${tradeShares} share${tradeShares === 1 ? '' : 's'} of ${selectedStock.symbol} for ${price(selectedStock.price)} + ${money(fee)} fee`)
                        } else {
                          dispatch({ type: 'SELL_STOCK', symbol: selectedStock.symbol, shares: tradeShares })
                          setFlashMessage(`Sold ${tradeShares} share${tradeShares === 1 ? '' : 's'} of ${selectedStock.symbol} for ${price(selectedStock.price)} less ${money(fee)} fee`)
                        }
                        setUi((current) => ({ ...current, tradeMode: null, tradeShares: 1 }))
                      }}
                    >
                      {ui.tradeMode === 'buy' ? 'Confirm Purchase' : 'Confirm Sale'}
                    </button>
                  </div>
                </div>
              ) : null}

              {flashMessage ? <div className="market-trade-toast">{flashMessage}</div> : null}

              <p className="market-quote-thesis">{selectedStock.thesis}</p>
            </aside>
          </article>

          <section className="market-board-section">
            <div className="card-topline market-board-topline">
              <h3>Market board</h3>
              <span>{overviewRows.length} symbols</span>
            </div>

            <SectionToolbar
              sectionId="market-overview-board"
              searchValue={ui.search}
              searchPlaceholder={searchPlaceholder}
              onSearchChange={(value) => setUi((current) => ({ ...current, search: value }))}
              filters={toolbarFilters}
              sortOptions={sortOptions}
              sortValue={ui.sort}
              onSortChange={(value) => setUi((current) => ({ ...current, sort: value as MarketUiState['sort'] }))}
            />

            <div className="market-board-grid">
              {overviewRows.length === 0 ? (
                <article className="card empty-state">
                  <h3>No symbols match the board</h3>
                  <p>Broaden the search or reset the asset-type filter. The board should narrow attention, not disappear.</p>
                </article>
              ) : (
                overviewRows.map((stock) => {
                  const rangeChange = getMarketRangeChange(state.marketHistory[stock.symbol] ?? [], ui.chartRange, state.week)
                  const isSelected = stock.symbol === selectedSymbol
                  return (
                    <button
                      key={stock.symbol}
                      className={`market-board-card ${isSelected ? 'selected' : ''}`}
                      type="button"
                      onClick={() => selectSymbol(stock.symbol)}
                    >
                      <div className="market-board-card-top">
                        <strong>{stock.symbol}</strong>
                        <span className={rangeChange >= 0 ? 'positive' : 'negative'}>{formatPercent(rangeChange)}</span>
                      </div>
                      <p>{stock.name}</p>
                      <strong className="market-board-price">{price(stock.price)}</strong>
                      <MarketSparkline
                        points={getChartPoints(state.marketHistory[stock.symbol] ?? [], ui.chartRange, state.week)}
                        label={`${stock.symbol} sparkline`}
                        change={rangeChange}
                      />
                      <div className="market-board-meta">
                        <span>{stock.assetType.toUpperCase()} · {describeMarketTrend(rangeChange).replace(' trend', '')}</span>
                        <span>Wk {formatPercent(stock.change)}</span>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </section>

          <section className="market-news-preview">
            <div className="card-topline">
              <h3>Latest market news</h3>
              <button
                className="mini-button ghost"
                type="button"
                onClick={() => setUi((current) => ({ ...current, tab: 'news' }))}
              >
                Open News
              </button>
            </div>
            <div className="market-news-preview-list">
              {latestNews.length === 0 ? (
                <p className="compact-note">No fresh tape yet. Advance a few weeks and the board will start telling stories.</p>
              ) : (
                latestNews.map((item) => (
                  <button
                    key={item.id}
                    className="market-news-preview-item"
                    type="button"
                    onClick={() => setUi((current) => ({ ...current, tab: 'news', selectedSymbol: item.symbol, tradeMode: null, tradeShares: 1 }))}
                  >
                    <span className="market-news-icon" aria-hidden="true">N</span>
                    <span className="market-news-copy">
                      <strong>{item.title}</strong>
                      <small>{item.symbol} · {getRelativeNewsAge(state.week, item.week)}</small>
                    </span>
                  </button>
                ))
              )}
            </div>
          </section>
        </div>
      ) : null}
      
      {ui.tab === 'watchlist' ? (
        <div className="card-grid market-card-grid">
          {watchlistRows.length === 0 ? (
            <article className="card empty-state">
              <h3>No watchlist names match</h3>
              <p>Broaden the search or loosen the held/type filters. The watchlist should narrow your attention, not disappear entirely.</p>
            </article>
          ) : (
            watchlistRows.map((stock) => {
              const holding = state.holdings[stock.symbol]
              const chartChange = getMarketRangeChange(state.marketHistory[stock.symbol] ?? [], ui.chartRange, state.week)

              return (
                <article className="card market-watch-card" key={stock.symbol}>
                  <div className="card-topline">
                    <h3>{stock.symbol}</h3>
                    <span className={chartChange >= 0 ? 'positive' : 'negative'}>{formatPercent(chartChange)}</span>
                  </div>
                  <p>{stock.name}</p>
                  <MarketSparkline
                    points={getChartPoints(state.marketHistory[stock.symbol] ?? [], ui.chartRange, state.week)}
                    label={`${stock.symbol} watchlist chart`}
                    change={chartChange}
                  />
                  <div className="tag-row">
                    <span className="tag">{price(stock.price)}</span>
                    <span className="tag">{stock.assetType}</span>
                    <span className="tag">{stock.sector}</span>
                    <span className="tag">Week {formatPercent(stock.change)}</span>
                    {holding ? <span className="tag accent">Held {holding.shares}</span> : null}
                  </div>
                  <div className="action-row">
                    <button className="mini-button ghost" type="button" onClick={() => setUi((current) => ({ ...current, selectedSymbol: stock.symbol, tab: 'overview', tradeMode: null, tradeShares: 1 }))}>
                      Open Chart
                    </button>
                    <button id={`watch-stock-${stock.symbol}`} className="mini-button ghost" onClick={() => dispatch({ type: 'TOGGLE_WATCHLIST', symbol: stock.symbol })}>
                      Unwatch
                    </button>
                  </div>
                </article>
              )
            })
          )}
        </div>
      ) : null}

      {ui.tab === 'news' ? (
        <div className="card-grid compact">
          {newsRows.length === 0 ? (
            <article className="card empty-state">
              <h3>No tape items match</h3>
              <p>Tight filters can blank the feed. Loosen them or advance a few more weeks to let the tape build up.</p>
            </article>
          ) : (
            newsRows.map((item) => (
              <article className={`card ${item.tone === 'bad' ? 'log-entry bad' : item.tone === 'good' ? 'log-entry good' : ''}`} key={item.id}>
                <div className="card-topline">
                  <h3>{item.symbol}</h3>
                  <span>Week {item.week}</span>
                </div>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
                <div className="action-row">
                  <button className="mini-button ghost" type="button" onClick={() => setUi((current) => ({ ...current, selectedSymbol: item.symbol, tab: 'overview', tradeMode: null, tradeShares: 1 }))}>
                    Focus {item.symbol}
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      ) : null}

      {ui.tab === 'exchange' ? (
        <div className="card-grid market-card-grid">
          {exchangeRows.length === 0 ? (
            <article className="card empty-state">
              <h3>No names match</h3>
              <p>That filter stack is too tight for the current board. Relax it or come back when your cash, watchlist, or holdings change.</p>
            </article>
          ) : (
            exchangeRows.map((stock) => {
              const holding = state.holdings[stock.symbol]
              const isWatching = state.watchlist.includes(stock.symbol)
              const buyOneReason = state.cash < stock.price + fee ? `Need ${money(Math.ceil(stock.price + fee))} cash` : undefined
              const buyFiveReason = state.cash < stock.price * 5 + fee ? `Need ${money(Math.ceil(stock.price * 5 + fee))} cash` : undefined
              const sellReason = !holding ? 'No shares owned' : undefined
              const chartChange = getMarketRangeChange(state.marketHistory[stock.symbol] ?? [], ui.chartRange, state.week)

              return (
                <article className="card stock-card market-stock-card" key={stock.symbol}>
                  <CardMedia imageUrl={stock.imageUrl} imageAlt={stock.imageAlt} fallbackLabel={stock.symbol} size="compact" />
                  <div className="card-topline">
                    <h3>{stock.symbol}</h3>
                    <span className={chartChange >= 0 ? 'positive' : 'negative'}>{formatPercent(chartChange)}</span>
                  </div>
                  <p>{stock.name}</p>
                  <MarketSparkline
                    points={getChartPoints(state.marketHistory[stock.symbol] ?? [], ui.chartRange, state.week)}
                    label={`${stock.symbol} exchange chart`}
                    change={chartChange}
                  />
                  <p>{stock.thesis}</p>
                  <div className="stock-meta">
                    <strong>{price(stock.price)}</strong>
                    <span>{stock.assetType === 'etf' ? `ETF | ${stock.sector}` : `Stock | ${stock.sector}`}</span>
                    <span>Week {formatPercent(stock.change)}</span>
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
                        <button
                          id={`buy-stock-${stock.symbol}-1`}
                          className="mini-button"
                          disabled={!!buyOneReason}
                          onClick={() => dispatch({ type: 'BUY_STOCK', symbol: stock.symbol, shares: 1 })}
                          title={buyOneReason}
                        >
                          Buy 1
                        </button>
                        <button
                          id={`buy-stock-${stock.symbol}-5`}
                          className="mini-button"
                          disabled={!!buyFiveReason}
                          onClick={() => dispatch({ type: 'BUY_STOCK', symbol: stock.symbol, shares: 5 })}
                          title={buyFiveReason}
                        >
                          Buy 5
                        </button>
                        <button id={`watch-stock-${stock.symbol}`} className="mini-button ghost" onClick={() => dispatch({ type: 'TOGGLE_WATCHLIST', symbol: stock.symbol })}>
                          {isWatching ? 'Unwatch' : 'Watch'}
                        </button>
                      </div>
                      <p className="action-hint">
                        {buyOneReason ? `Blocked: ${buyOneReason}.` : 'If you want in, start small unless you already know why this name belongs in your week.'}
                      </p>
                    </div>
                    <div className="action-section">
                      <span className="action-label">Secondary Actions</span>
                      <div className="action-row">
                        <button className="mini-button ghost" type="button" onClick={() => setUi((current) => ({ ...current, selectedSymbol: stock.symbol, tab: 'overview', tradeMode: null, tradeShares: 1 }))}>
                          Open Chart
                        </button>
                        <button
                          id={`sell-stock-${stock.symbol}-1`}
                          className="mini-button ghost"
                          disabled={!!sellReason}
                          onClick={() => dispatch({ type: 'SELL_STOCK', symbol: stock.symbol, shares: 1 })}
                          title={sellReason}
                        >
                          Sell 1
                        </button>
                        <button
                          id={`sell-stock-${stock.symbol}-all`}
                          className="mini-button ghost"
                          disabled={!!sellReason}
                          onClick={() => dispatch({ type: 'SELL_STOCK', symbol: stock.symbol, shares: holding?.shares ?? 0 })}
                          title={sellReason}
                        >
                          Sell All
                        </button>
                      </div>
                      <p className="action-hint">
                        {sellReason ? `Sell blocked: ${sellReason}.` : 'Trim when the reason for holding weakens, or when you need the cash more than the position.'}
                      </p>
                    </div>
                  </div>
                </article>
              )
            })
          )}
        </div>
      ) : null}
    </section>
  )
}
