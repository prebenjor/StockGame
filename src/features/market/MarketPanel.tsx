import { CardMedia } from '../../components/CardMedia'
import { SectionTabs } from '../../components/SectionTabs'
import { SectionToolbar, type ToolbarFilter } from '../../components/SectionToolbar'
import { SparklineChart } from '../../components/SparklineChart'
import { useStoredUiState } from '../../components/useStoredUiState'
import { money, price } from '../../game/core/format'
import type { GameAction, GameState, MarketHistoryPoint } from '../../game/core/types'
import { getTradingFee, hasStableHousing } from '../../game/core/utils'
import { SECTION_THEMES } from '../../ui/sectionThemes'
import { MARKET_CHART_RANGES, type MarketChartRange, getMarketRangeChange, toMarketChartPoints } from './chartRanges'

type Props = {
  state: GameState
  dispatch: React.Dispatch<GameAction>
}

type MarketTab = 'overview' | 'watchlist' | 'news' | 'exchange'

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

export function MarketPanel({ state, dispatch }: Props) {
  const theme = SECTION_THEMES.market
  const fee = getTradingFee(state)
  const sectors = ['all', ...Array.from(new Set(state.market.map((stock) => stock.sector))).sort()]
  const [ui, setUi] = useStoredUiState<MarketUiState>('street-to-stock-market-ui-v2', MARKET_UI_DEFAULT)

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

  const storedSelectedSymbol = state.market.some((stock) => stock.symbol === ui.selectedSymbol) ? ui.selectedSymbol : fallbackSelectedSymbol
  const selectedSymbol =
    ui.tab === 'overview'
      ? (overviewRows.find((stock) => stock.symbol === storedSelectedSymbol)?.symbol ?? overviewRows[0]?.symbol ?? fallbackSelectedSymbol)
      : storedSelectedSymbol
  const selectedStock = state.market.find((stock) => stock.symbol === selectedSymbol) ?? state.market[0]
  const selectedHolding = state.holdings[selectedSymbol]
  const selectedPoints = getChartPoints(state.marketHistory[selectedSymbol] ?? [], ui.chartRange, state.week)
  const selectedRangeChange = getMarketRangeChange(state.marketHistory[selectedSymbol] ?? [], ui.chartRange, state.week)
  const rangeLabel = getRangeLabel(ui.chartRange)

  const focusRows = overviewRows.slice(0, 6)
  const topMover = state.market.slice().sort((left, right) => Math.abs(right.change) - Math.abs(left.change))[0]
  const holdingsValue = state.market.reduce((total, stock) => {
    const holding = state.holdings[stock.symbol]
    return total + (holding ? holding.shares * stock.price : 0)
  }, 0)
  const monthlyDividendRunRate = state.market.reduce((total, stock) => {
    const holding = state.holdings[stock.symbol]
    return total + (holding ? holding.shares * stock.dividend : 0)
  }, 0)

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

  const toolbarSummary =
    ui.tab === 'overview'
      ? `${overviewRows.length} symbols in board | ${rangeLabel} view | ${selectedStock.symbol} focused`
      : ui.tab === 'watchlist'
        ? `${watchlistRows.length} tracked names | ${rangeLabel} view | sorted ${ui.sort.replace('-', ' ')}`
        : ui.tab === 'news'
          ? `${newsRows.length} tape items | ${ui.newsType === 'all' ? 'all events' : ui.newsType} | ${ui.newsTone === 'all' ? 'all tones' : ui.newsTone}`
          : `${exchangeRows.length} tradable names | ${rangeLabel} view | sorted ${ui.sort.replace('-', ' ')}`

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
    ui.tab === 'overview'
      ? 'Search the market board by symbol, name, or sector'
      : ui.tab === 'news'
        ? 'Search tape by symbol or headline'
        : 'Search symbols, names, and sectors'

  return (
    <section
      className="panel section-panel market-panel"
      data-ui-section="market"
      data-active-subtab={ui.tab}
      data-toolbar-summary={toolbarSummary}
      data-selected-symbol={selectedSymbol}
      data-chart-range={ui.chartRange}
      style={
        {
          '--section-accent': theme.accent,
          '--section-accent-soft': theme.accentSoft,
          '--section-glow': theme.glow,
          '--section-panel': theme.panelTint,
          '--section-border': theme.borderTone,
          '--section-chart-line': theme.chartLine,
          '--section-chart-fill': theme.chartFill,
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
            ? 'This side should read like a real desk now: pick a time window, screen the board, then move into watchlist, news, or exchange for the actual trade decisions.'
            : 'The market still leaks edge when your real life is messy, but the desk is cleaner now. Screen the board, set the chart range you trust, and only then decide whether to watch, buy, or wait.'}
        </p>
      </div>

      <SectionTabs
        sectionId="market"
        activeTab={ui.tab}
        onChange={(tabId) => setUi((current) => ({ ...current, tab: tabId as MarketTab }))}
        tabs={MARKET_TABS as unknown as Array<{ id: string; label: string; kicker?: string }>}
        theme={theme}
      />

      <div className="market-range-bar" aria-label="Chart range selector">
        <span className="panel-kicker">Chart Range</span>
        <div className="market-range-row" role="group" aria-label="Select market chart range">
          {MARKET_CHART_RANGES.map((option) => (
            <button
              key={option.value}
              className={`mini-button market-range-chip ${ui.chartRange === option.value ? '' : 'ghost'}`}
              type="button"
              onClick={() => setUi((current) => ({ ...current, chartRange: option.value }))}
              aria-pressed={ui.chartRange === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="market-range-summary">All visible charts are locked to the {rangeLabel} window.</p>
      </div>

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

      {ui.tab === 'overview' ? (
        <div className="section-stack">
          <div className="dual-grid market-overview-grid">
            <article className="card current market-hero-card">
              <div className="card-topline">
                <div>
                  <span className="panel-kicker">Selected symbol</span>
                  <h3>{selectedStock.symbol}</h3>
                </div>
                <span className={selectedRangeChange >= 0 ? 'positive' : 'negative'}>{formatPercent(selectedRangeChange)}</span>
              </div>
              <p>{selectedStock.name}. {selectedStock.thesis}</p>
              <SparklineChart
                points={selectedPoints}
                label={`${selectedStock.symbol} price history`}
                lineColor={theme.chartLine}
                fillColor={theme.chartFill}
                className="hero-market-chart"
                variant="hero"
                footerLabel={`${rangeLabel} window`}
              />
              <div className="tag-row">
                <span className="tag">{selectedStock.assetType === 'etf' ? 'ETF' : 'Stock'}</span>
                <span className="tag">{selectedStock.sector}</span>
                <span className="tag">{price(selectedStock.price)}</span>
                <span className="tag">Week {formatPercent(selectedStock.change)}</span>
                <span className="tag">Fee {money(fee)}</span>
                {selectedHolding ? <span className="tag accent">Held {selectedHolding.shares} sh</span> : null}
                {state.watchlist.includes(selectedStock.symbol) ? <span className="tag accent">Watching</span> : null}
              </div>
              <div className="market-selector-row">
                {focusRows.length === 0 ? (
                  <span className="tag">No symbols match the board screen.</span>
                ) : (
                  focusRows.map((stock) => (
                    <button
                      key={stock.symbol}
                      className={`mini-button ${selectedSymbol === stock.symbol ? '' : 'ghost'}`}
                      type="button"
                      onClick={() => setUi((current) => ({ ...current, selectedSymbol: stock.symbol }))}
                    >
                      {stock.symbol}
                    </button>
                  ))
                )}
              </div>
            </article>

            <article className="card market-overview-summary">
              <div className="card-topline">
                <h3>Desk snapshot</h3>
                <span>{rangeLabel}</span>
              </div>
              <div className="ledger-grid">
                <div><span>Portfolio value</span><strong>{money(holdingsValue)}</strong></div>
                <div><span>Positions</span><strong>{Object.keys(state.holdings).length}</strong></div>
                <div><span>Watchlist</span><strong>{state.watchlist.length}</strong></div>
                <div><span>Monthly dividend run rate</span><strong>{money(monthlyDividendRunRate)}</strong></div>
              </div>
              <p>Use this as the read layer: search the board, lock the chart window, compare symbols on equal-size cards, then move into Watchlist, News, or Exchange for the actual decision.</p>
              {topMover ? (
                <div className="market-summary-note">
                  <strong>Top weekly mover</strong>
                  <span>{topMover.symbol} {formatPercent(topMover.change)} this week.</span>
                </div>
              ) : null}
            </article>
          </div>

          <div className="card-grid compact market-card-grid">
            {focusRows.length === 0 ? (
              <article className="card empty-state">
                <h3>No symbols match the board</h3>
                <p>Broaden the search or reset the asset-type screen. The board is supposed to narrow your attention, not blank the market entirely.</p>
              </article>
            ) : (
              focusRows.map((stock) => (
                <article className="card market-mini-card" key={stock.symbol}>
                  <div className="card-topline">
                    <h3>{stock.symbol}</h3>
                    <span className={getMarketRangeChange(state.marketHistory[stock.symbol] ?? [], ui.chartRange, state.week) >= 0 ? 'positive' : 'negative'}>
                      {formatPercent(getMarketRangeChange(state.marketHistory[stock.symbol] ?? [], ui.chartRange, state.week))}
                    </span>
                  </div>
                  <p>{stock.name}</p>
                  <SparklineChart
                    variant="card"
                    points={getChartPoints(state.marketHistory[stock.symbol] ?? [], ui.chartRange, state.week)}
                    label={`${stock.symbol} ${rangeLabel} chart`}
                    lineColor={theme.chartLine}
                    fillColor={theme.chartFill}
                    footerLabel={`${rangeLabel} chart`}
                  />
                  <div className="tag-row">
                    <span className="tag">{price(stock.price)}</span>
                    <span className="tag">{stock.assetType}</span>
                    <span className="tag">Week {formatPercent(stock.change)}</span>
                  </div>
                  <button className="mini-button ghost" type="button" onClick={() => setUi((current) => ({ ...current, selectedSymbol: stock.symbol }))}>
                    Focus
                  </button>
                </article>
              ))
            )}
          </div>
        </div>
      ) : null}

      {ui.tab === 'watchlist' ? (
        <div className="card-grid market-card-grid">
          {watchlistRows.length === 0 ? (
            <article className="card empty-state">
              <h3>No watchlist names match</h3>
              <p>Broaden the search or loosen the held/type filters. The watchlist is supposed to be your clean reading layer, not another full-market dump.</p>
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
                  <SparklineChart
                    variant="card"
                    points={getChartPoints(state.marketHistory[stock.symbol] ?? [], ui.chartRange, state.week)}
                    label={`${stock.symbol} watchlist chart`}
                    lineColor={theme.chartLine}
                    fillColor={theme.chartFill}
                    footerLabel={`${rangeLabel} chart`}
                  />
                  <div className="tag-row">
                    <span className="tag">{price(stock.price)}</span>
                    <span className="tag">{stock.assetType}</span>
                    <span className="tag">{stock.sector}</span>
                    <span className="tag">Week {formatPercent(stock.change)}</span>
                    {holding ? <span className="tag accent">Held {holding.shares}</span> : null}
                  </div>
                  <div className="action-row">
                    <button className="mini-button ghost" type="button" onClick={() => setUi((current) => ({ ...current, selectedSymbol: stock.symbol, tab: 'overview' }))}>
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
              <p>Tight filters can blank the feed. Loosen them or advance more weeks to get a broader mix of earnings and alert traffic.</p>
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
                  <button className="mini-button ghost" type="button" onClick={() => setUi((current) => ({ ...current, selectedSymbol: item.symbol, tab: 'overview' }))}>
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
              <p>That filter stack is too tight for the current tape. Relax it or wait until your cash, watchlist, or holdings profile changes.</p>
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
                  <SparklineChart
                    variant="card"
                    points={getChartPoints(state.marketHistory[stock.symbol] ?? [], ui.chartRange, state.week)}
                    label={`${stock.symbol} exchange chart`}
                    lineColor={theme.chartLine}
                    fillColor={theme.chartFill}
                    footerLabel={`${rangeLabel} chart`}
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
                        {buyOneReason ? `Blocked: ${buyOneReason}.` : 'Primary move: size small first unless the name is already on your board and the range view still supports the setup.'}
                      </p>
                    </div>
                    <div className="action-section">
                      <span className="action-label">Secondary Actions</span>
                      <div className="action-row">
                        <button className="mini-button ghost" type="button" onClick={() => setUi((current) => ({ ...current, selectedSymbol: stock.symbol, tab: 'overview' }))}>
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
                        {sellReason ? `Sell blocked: ${sellReason}.` : 'Secondary move: trim when conviction breaks, liquidity matters more, or the tape is getting ahead of your process.'}
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
