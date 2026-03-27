import { CardMedia } from '../../components/CardMedia'
import { SectionTabs } from '../../components/SectionTabs'
import { SectionToolbar, type ToolbarFilter } from '../../components/SectionToolbar'
import { useStoredUiState } from '../../components/useStoredUiState'
import { money } from '../../game/core/format'
import type { GameAction, GameState } from '../../game/core/types'
import { canBuyProperty, getAvailableEquity, getPropertyRent, getPropertyUpkeep, getPropertyValue, getRenovationCost } from '../../game/core/utils'
import { SECTION_THEMES } from '../../ui/sectionThemes'
import { DISTRICT_MAP } from '../world/data'
import { PROPERTIES, TENANT_PROFILE_MAP } from './data'

type Props = {
  state: GameState
  dispatch: React.Dispatch<GameAction>
}

type PropertyTab = 'districts' | 'listings' | 'owned'

type PropertyUiState = {
  tab: PropertyTab
  search: string
  district: 'all' | string
  ownedMode: 'all' | 'rented' | 'vacant'
}

const PROPERTY_DEFAULT: PropertyUiState = {
  tab: 'listings',
  search: '',
  district: 'all',
  ownedMode: 'all',
}

const PROPERTY_TABS = [
  { id: 'districts', label: 'Districts', kicker: 'Map' },
  { id: 'listings', label: 'Listings', kicker: 'Deal flow' },
  { id: 'owned', label: 'Owned', kicker: 'Portfolio' },
] as const

function getSearchMatch(text: string, search: string) {
  if (!search.trim()) return true
  return text.toLowerCase().includes(search.trim().toLowerCase())
}

export function PropertyPanel({ state, dispatch }: Props) {
  const theme = SECTION_THEMES.property
  const [ui, setUi] = useStoredUiState<PropertyUiState>('street-to-stock-property-ui-v1', PROPERTY_DEFAULT)
  const districtOptions = [{ value: 'all', label: 'All districts' }, ...state.districtStates.map((item) => ({ value: item.districtId, label: DISTRICT_MAP[item.districtId].name }))]

  const listings = state.propertyListings.filter((listing) => {
    const property = PROPERTIES.find((item) => item.id === listing.templateId) ?? PROPERTIES[0]
    const district = DISTRICT_MAP[listing.districtId]
    if (!getSearchMatch(`${property.title} ${property.description} ${district.name}`, ui.search)) return false
    if (ui.district !== 'all' && listing.districtId !== ui.district) return false
    return true
  })

  const owned = state.properties.filter((property) => {
    const template = PROPERTIES.find((item) => item.id === property.templateId) ?? PROPERTIES[0]
    const district = DISTRICT_MAP[property.districtId]
    if (!getSearchMatch(`${template.title} ${district.name} ${district.theme}`, ui.search)) return false
    if (ui.ownedMode === 'rented' && !property.rented) return false
    if (ui.ownedMode === 'vacant' && property.rented) return false
    return true
  })

  const filters: ToolbarFilter[] =
    ui.tab === 'listings'
      ? [
          {
            id: 'district',
            label: 'District',
            type: 'select',
            value: ui.district,
            options: districtOptions,
            onChange: (value) => setUi((current) => ({ ...current, district: value })),
          },
        ]
      : ui.tab === 'owned'
        ? [
            {
              id: 'owned-mode',
              label: 'Mode',
              type: 'select',
              value: ui.ownedMode,
              options: [
                { value: 'all', label: 'All owned' },
                { value: 'rented', label: 'Rented only' },
                { value: 'vacant', label: 'Vacant only' },
              ],
              onChange: (value) => setUi((current) => ({ ...current, ownedMode: value as PropertyUiState['ownedMode'] })),
            },
          ]
        : []

  const summary =
    ui.tab === 'districts'
      ? `${state.districtStates.length} districts`
      : ui.tab === 'listings'
        ? `${listings.length} listings in view`
        : `${owned.length} owned properties`

  return (
    <section
      className="panel section-panel property-panel"
      data-ui-section="property"
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
          <span className="panel-kicker">Real Estate</span>
          <h2>District map and asset book</h2>
        </div>
        <p>Start with the neighborhoods, then the listings, then the places you already own. You do not need a big building to start here anymore.</p>
      </div>

      <SectionTabs
        sectionId="property"
        activeTab={ui.tab}
        onChange={(tabId) => setUi((current) => ({ ...current, tab: tabId as PropertyTab }))}
        tabs={PROPERTY_TABS as unknown as Array<{ id: string; label: string; kicker?: string }>}
        theme={theme}
      />

      <SectionToolbar
        sectionId="property"
        searchValue={ui.tab === 'districts' ? '' : ui.search}
        searchPlaceholder={ui.tab === 'owned' ? 'Search owned assets' : 'Search listings'}
        onSearchChange={ui.tab === 'districts' ? undefined : (value) => setUi((current) => ({ ...current, search: value }))}
        filters={filters}
        summary={summary}
      />

      {ui.tab === 'districts' ? (
        <div className="district-grid">
          {state.districtStates.map((districtState) => {
            const district = DISTRICT_MAP[districtState.districtId]
            return (
              <article className="card district-card" key={district.id} style={{ '--district-accent': district.accent, '--district-glow': district.glow } as React.CSSProperties}>
                <div className="district-banner">
                  <span>{district.theme}</span>
                  <strong>{district.vibe}</strong>
                </div>
                <div className="card-topline">
                  <h3>{district.name}</h3>
                  <span className={districtState.momentum >= 0 ? 'positive' : 'negative'}>
                    {districtState.momentum >= 0 ? '+' : ''}
                    {districtState.momentum}%
                  </span>
                </div>
                <p>{district.description}</p>
                <div className="tag-row">
                  <span className="tag">{district.theme}</span>
                  <span className="tag">Risk {Math.round(district.risk * 100)}%</span>
                </div>
              </article>
            )
          })}
        </div>
      ) : null}

      {ui.tab === 'listings' ? (
        <div className="card-grid">
          {listings.map((listing) => {
            const property = PROPERTIES.find((item) => item.id === listing.templateId) ?? PROPERTIES[0]
            const district = DISTRICT_MAP[listing.districtId]
            const hardMoneyLoan = !state.bankAccount
            const mortgageCashNeed = Math.round(listing.askingPrice * (hardMoneyLoan ? 0.35 : 0.28)) + (hardMoneyLoan ? 380 : 120)
            const accessReason = !canBuyProperty(state, property) ? `Reach reputation ${property.reputationRequired}` : undefined
            const cashBuyReason = accessReason ?? (state.cash < listing.askingPrice ? `Need ${money(listing.askingPrice)} cash` : undefined)
            const mortgageReason =
              accessReason ??
              (state.creditScore < (state.bankAccount ? 560 : 420)
                ? `Need credit score ${state.bankAccount ? 560 : 420}`
                : state.bankTrust < (state.bankAccount ? 16 : 0)
                  ? `Need bank trust ${state.bankAccount ? 16 : 0}`
                  : state.cash < mortgageCashNeed
                    ? `Need ${money(mortgageCashNeed)} for down payment and fees`
                    : undefined)
            return (
              <article className="card" key={listing.id}>
                <CardMedia imageUrl={property.imageUrl} imageAlt={property.imageAlt ?? property.title} fallbackLabel={property.title} />
                <div className="card-topline">
                  <h3>{property.title}</h3>
                  <span>{money(listing.askingPrice)}</span>
                </div>
                <p>{property.description}</p>
                <div className="tag-row">
                  <span className="tag">{district.name}</span>
                  <span className="tag">Rent {money(property.baseRent)}/mo</span>
                  <span className="tag">Upkeep {money(property.upkeep)}</span>
                  <span className="tag">Rep {property.reputationRequired}+</span>
                  {property.cost <= 2500 ? <span className="tag accent">Starter step</span> : null}
                </div>
                <div className="action-row">
                  <button className="mini-button" disabled={!!cashBuyReason} onClick={() => dispatch({ type: 'BUY_PROPERTY', listingId: listing.id, financing: 'cash' })} title={cashBuyReason}>
                    Buy Cash
                  </button>
                  <button className="mini-button ghost" disabled={!!mortgageReason} onClick={() => dispatch({ type: 'BUY_PROPERTY', listingId: listing.id, financing: 'mortgage' })} title={mortgageReason}>
                    {state.bankAccount ? 'Mortgage' : 'Hard Money'}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      ) : null}

      {ui.tab === 'owned' ? (
        <div className="card-grid">
          {owned.length === 0 ? (
            <article className="card empty-state">
              <h3>No property yet</h3>
              <p>You do not need to jump straight to a full apartment rental. Smaller assets can still get you into the property game.</p>
            </article>
          ) : (
            owned.map((property) => {
              const template = PROPERTIES.find((item) => item.id === property.templateId) ?? PROPERTIES[0]
              const district = DISTRICT_MAP[property.districtId]
              const tenant = property.tenantProfileId ? TENANT_PROFILE_MAP[property.tenantProfileId] : null
              const rentReason = !property.rented && property.condition < 45 ? 'Raise condition above 45 before renting' : undefined
              const evictReason = !property.rented ? 'No active tenant to evict' : undefined
              const renovateReason = property.rented ? 'Pause rent before renovating' : state.actionPoints <= 0 ? 'No actions left this week' : state.cash < getRenovationCost(state) ? `Need ${money(getRenovationCost(state))} cash` : state.energy < 12 ? 'Need at least 12 energy' : undefined
              const refiReason = state.creditScore < 640 ? 'Need 640 credit score' : state.bankTrust < 30 ? 'Need 30 bank trust' : getAvailableEquity(property, state) < 500 ? 'Need at least $500 equity' : undefined
              return (
                <article className="card owned-card" key={property.uid}>
                  <CardMedia imageUrl={template.imageUrl} imageAlt={template.imageAlt ?? template.title} fallbackLabel={template.title} />
                  <div className="card-topline">
                    <h3>{template.title}</h3>
                    <span>{money(getPropertyValue(property, state))}</span>
                  </div>
                  <p>{property.rented ? 'Currently rented' : 'Currently vacant'} in {district.name}</p>
                  <div className="tag-row">
                    <span className="tag">{district.theme}</span>
                    <span className="tag">Condition {property.condition}%</span>
                    <span className="tag">Rent {money(getPropertyRent(property, state))}/mo</span>
                    <span className="tag">Upkeep {money(getPropertyUpkeep(property, state))}</span>
                    <span className="tag">Mortgage {money(property.mortgageBalance)}</span>
                    <span className="tag">Equity {money(getAvailableEquity(property, state))}</span>
                    {tenant ? <span className="tag">{tenant.label}</span> : null}
                  </div>
                  <div className="action-row">
                    <button className="mini-button" disabled={!!rentReason} onClick={() => dispatch({ type: 'TOGGLE_RENTAL', propertyUid: property.uid })} title={rentReason}>
                      {property.rented ? 'Pause Rent' : 'Rent Out'}
                    </button>
                    <button className="mini-button" disabled={!!renovateReason} onClick={() => dispatch({ type: 'RENOVATE_PROPERTY', propertyUid: property.uid })} title={renovateReason}>
                      Renovate
                    </button>
                    <button className="mini-button ghost" disabled={!!evictReason} onClick={() => dispatch({ type: 'EVICT_TENANT', propertyUid: property.uid })} title={evictReason}>
                      Evict
                    </button>
                    <button className="mini-button ghost" disabled={!!refiReason} onClick={() => dispatch({ type: 'REFINANCE_PROPERTY', propertyUid: property.uid })} title={refiReason}>
                      Refinance
                    </button>
                    <button className="mini-button ghost" onClick={() => dispatch({ type: 'SELL_PROPERTY', propertyUid: property.uid })}>
                      Sell
                    </button>
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
