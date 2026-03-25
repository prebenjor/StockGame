import { money } from '../../game/core/format'
import { canBuyProperty, getAvailableEquity, getPropertyRent, getPropertyUpkeep, getPropertyValue, getRenovationCost } from '../../game/core/utils'
import type { GameAction, GameState } from '../../game/core/types'
import { PROPERTIES, TENANT_PROFILE_MAP } from './data'
import { DISTRICT_MAP } from '../world/data'

type Props = {
  state: GameState
  dispatch: React.Dispatch<GameAction>
}

export function PropertyPanel({ state, dispatch }: Props) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <span className="panel-kicker">Real Estate</span>
          <h2>Properties</h2>
        </div>
        <p>Property is always in play, but weak credit, no banking, and low reputation make the early versions of these deals much rougher.</p>
      </div>

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

      <div className="card-grid">
        {state.propertyListings.map((listing) => {
          const property = PROPERTIES.find((item) => item.id === listing.templateId) ?? PROPERTIES[0]
          const district = DISTRICT_MAP[listing.districtId]
          const hardMoneyLoan = !state.bankAccount
          const mortgageCashNeed = Math.round(listing.askingPrice * (hardMoneyLoan ? 0.35 : 0.28)) + (hardMoneyLoan ? 380 : 120)
          return (
          <article className="card" key={listing.id}>
            {property.imageUrl ? (
              <div className="card-media">
                <img src={property.imageUrl} alt={property.imageAlt ?? property.title} loading="lazy" />
              </div>
            ) : null}
            <div className="card-topline">
              <h3>{property.title}</h3>
              <span>{money(listing.askingPrice)}</span>
            </div>
            <p>{property.description}</p>
            {property.imageCreditUrl && property.imageCreditLabel ? (
              <a className="credit-link" href={property.imageCreditUrl} target="_blank" rel="noreferrer">
                {property.imageCreditLabel}
              </a>
            ) : null}
            <div className="tag-row">
              <span className="tag">{district.name}</span>
              <span className="tag">Rent {money(property.baseRent)}/mo</span>
              <span className="tag">Upkeep {money(property.upkeep)}</span>
              <span className="tag">Rep {property.reputationRequired}+</span>
            </div>
            <div className="action-row">
              <button className="mini-button" disabled={!canBuyProperty(state, property) || state.cash < listing.askingPrice} onClick={() => dispatch({ type: 'BUY_PROPERTY', listingId: listing.id, financing: 'cash' })}>
                Buy Cash
              </button>
              <button className="mini-button ghost" disabled={!canBuyProperty(state, property) || state.creditScore < (state.bankAccount ? 560 : 420) || state.bankTrust < (state.bankAccount ? 16 : 0) || state.cash < mortgageCashNeed} onClick={() => dispatch({ type: 'BUY_PROPERTY', listingId: listing.id, financing: 'mortgage' })}>
                {state.bankAccount ? 'Mortgage' : 'Hard Money'}
              </button>
            </div>
          </article>
        )})}
      </div>

      <div className="panel-header subhead">
        <div>
          <span className="panel-kicker">Owned Assets</span>
          <h2>Your buildings</h2>
        </div>
        <p>The moment you own a unit, maintenance becomes part of the game.</p>
      </div>

      <div className="card-grid">
        {state.properties.length === 0 ? (
          <article className="card empty-state">
            <h3>No property yet</h3>
            <p>Keep stacking cash. The first rental changes the whole pacing of the run.</p>
          </article>
        ) : (
          state.properties.map((property) => {
            const template = PROPERTIES.find((item) => item.id === property.templateId) ?? PROPERTIES[0]
            const district = DISTRICT_MAP[property.districtId]
            const tenant = property.tenantProfileId ? TENANT_PROFILE_MAP[property.tenantProfileId] : null
            return (
              <article className="card owned-card" key={property.uid}>
                {template.imageUrl ? (
                  <div className="card-media">
                    <img src={template.imageUrl} alt={template.imageAlt ?? template.title} loading="lazy" />
                  </div>
                ) : null}
                <div className="card-topline">
                  <h3>{template.title}</h3>
                  <span>{money(getPropertyValue(property, state))}</span>
                </div>
                <p>{property.rented ? 'Currently rented' : 'Currently vacant'} in {district.name}</p>
                {template.imageCreditUrl && template.imageCreditLabel ? (
                  <a className="credit-link" href={template.imageCreditUrl} target="_blank" rel="noreferrer">
                    {template.imageCreditLabel}
                  </a>
                ) : null}
                <div className="tag-row">
                  <span className="tag">{district.theme}</span>
                  <span className="tag">Condition {property.condition}%</span>
                  <span className="tag">Rent {money(getPropertyRent(property, state))}/mo</span>
                  <span className="tag">Upkeep {money(getPropertyUpkeep(property, state))}</span>
                  <span className="tag">Mortgage {money(property.mortgageBalance)}</span>
                  <span className="tag">Equity {money(getAvailableEquity(property, state))}</span>
                  {tenant ? <span className="tag">{tenant.label}</span> : null}
                  {property.rented ? <span className="tag">Lease {property.leaseMonthsRemaining} mo</span> : null}
                  {property.rented && property.missedPayments > 0 ? <span className="tag">Missed {property.missedPayments}</span> : null}
                </div>
                {tenant ? <p>{tenant.description}</p> : null}
                <div className="action-row">
                  <button className="mini-button" disabled={!property.rented && property.condition < 45} onClick={() => dispatch({ type: 'TOGGLE_RENTAL', propertyUid: property.uid })}>
                    {property.rented ? 'Pause Rent' : 'Rent Out'}
                  </button>
                  <button className="mini-button ghost" disabled={!property.rented} onClick={() => dispatch({ type: 'EVICT_TENANT', propertyUid: property.uid })}>
                    Evict
                  </button>
                  <button className="mini-button" disabled={property.rented || state.actionPoints <= 0 || state.cash < getRenovationCost(state) || state.energy < 12} onClick={() => dispatch({ type: 'RENOVATE_PROPERTY', propertyUid: property.uid })}>
                    Renovate
                  </button>
                  <button className="mini-button ghost" disabled={state.creditScore < 640 || state.bankTrust < 30 || getAvailableEquity(property, state) < 500} onClick={() => dispatch({ type: 'REFINANCE_PROPERTY', propertyUid: property.uid })}>
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
    </section>
  )
}
