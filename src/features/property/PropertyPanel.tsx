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
          const accessReason = !canBuyProperty(state, property) ? 'Property access unavailable' : undefined
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
            <div className="action-stack">
              <div className="action-section">
                <span className="action-label">Primary Action</span>
                <div className="action-row">
                  <button className="mini-button" disabled={!!cashBuyReason} onClick={() => dispatch({ type: 'BUY_PROPERTY', listingId: listing.id, financing: 'cash' })} title={cashBuyReason}>
                    Buy Cash
                  </button>
                  <button className="mini-button ghost" disabled={!!mortgageReason} onClick={() => dispatch({ type: 'BUY_PROPERTY', listingId: listing.id, financing: 'mortgage' })} title={mortgageReason}>
                    {state.bankAccount ? 'Mortgage' : 'Hard Money'}
                  </button>
                </div>
                <p className="action-hint">
                  {cashBuyReason ? `Cash path blocked: ${cashBuyReason}.` : 'Primary move: cash is cleaner if it will not wipe out your liquidity.'}
                </p>
              </div>
              <div className="action-section">
                <span className="action-label">Secondary Path</span>
                <p className="action-hint">
                  {mortgageReason
                    ? `${state.bankAccount ? 'Mortgage' : 'Hard money'} blocked: ${mortgageReason}.`
                    : `${state.bankAccount ? 'Mortgage' : 'Hard money'} keeps cash free, but weak terms can make an early property deal punishing.`}
                </p>
              </div>
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
            const rentReason = !property.rented && property.condition < 45 ? 'Raise condition above 45 before renting' : undefined
            const evictReason = !property.rented ? 'No active tenant to evict' : undefined
            const renovateReason = property.rented ? 'Pause rent before renovating' : state.actionPoints <= 0 ? 'No actions left this week' : state.cash < getRenovationCost(state) ? `Need ${money(getRenovationCost(state))} cash` : state.energy < 12 ? 'Need at least 12 energy' : undefined
            const refiReason = state.creditScore < 640 ? 'Need 640 credit score' : state.bankTrust < 30 ? 'Need 30 bank trust' : getAvailableEquity(property, state) < 500 ? 'Need at least $500 equity' : undefined
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
                <div className="action-stack">
                  <div className="action-section">
                    <span className="action-label">Primary Actions</span>
                    <div className="action-row">
                      <button className="mini-button" disabled={!!rentReason} onClick={() => dispatch({ type: 'TOGGLE_RENTAL', propertyUid: property.uid })} title={rentReason}>
                        {property.rented ? 'Pause Rent' : 'Rent Out'}
                      </button>
                      <button className="mini-button" disabled={!!renovateReason} onClick={() => dispatch({ type: 'RENOVATE_PROPERTY', propertyUid: property.uid })} title={renovateReason}>
                        Renovate
                      </button>
                      <button className="mini-button ghost" onClick={() => dispatch({ type: 'SELL_PROPERTY', propertyUid: property.uid })}>
                        Sell
                      </button>
                    </div>
                    <p className="action-hint">
                      {rentReason
                        ? `Rental blocked: ${rentReason}.`
                        : property.rented
                          ? 'Primary move: keep rent flowing unless you need a reset or full exit.'
                          : 'Primary move: either raise condition and rent it out, or sell if the cash is more useful elsewhere.'}
                    </p>
                  </div>
                  <div className="action-section">
                    <span className="action-label">Secondary Actions</span>
                    <div className="action-row">
                      <button className="mini-button ghost" disabled={!!evictReason} onClick={() => dispatch({ type: 'EVICT_TENANT', propertyUid: property.uid })} title={evictReason}>
                        Evict
                      </button>
                      <button className="mini-button ghost" disabled={!!refiReason} onClick={() => dispatch({ type: 'REFINANCE_PROPERTY', propertyUid: property.uid })} title={refiReason}>
                        Refinance
                      </button>
                    </div>
                    <p className="action-hint">
                      {refiReason ? `Refinance blocked: ${refiReason}.` : 'Secondary move: refinance once equity and bank profile are strong enough to improve terms.'}
                    </p>
                  </div>
                </div>
              </article>
            )
          })
        )}
      </div>
    </section>
  )
}
