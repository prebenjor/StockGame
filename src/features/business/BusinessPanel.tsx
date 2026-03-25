import { DISTRICT_MAP } from '../world/data'
import { money } from '../../game/core/format'
import type { GameAction, GameState } from '../../game/core/types'
import { BUSINESSES } from './data'
import { canBuyBusiness, canTakeBusinessLoan, getBusinessDebtBalance, getBusinessMonthlyProfit, getBusinessValue } from '../../game/core/utils'

type Props = {
  state: GameState
  dispatch: React.Dispatch<GameAction>
}

export function BusinessPanel({ state, dispatch }: Props) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <span className="panel-kicker">Business</span>
          <h2>Operating companies</h2>
        </div>
        <p>You can buy businesses before you look ready on paper, but low reputation means the early versions start with more drag and less polish.</p>
      </div>

      <div className="card-grid">
        {BUSINESSES.map((business) => (
          <article className="card" key={business.id}>
            {business.imageUrl ? (
              <div className="card-media">
                <img src={business.imageUrl} alt={business.imageAlt ?? business.title} loading="lazy" />
              </div>
            ) : null}
            <div className="card-topline">
              <h3>{business.title}</h3>
              <span>{money(business.cost)}</span>
            </div>
            <p>{business.description}</p>
            {business.imageCreditUrl && business.imageCreditLabel ? (
              <a className="credit-link" href={business.imageCreditUrl} target="_blank" rel="noreferrer">
                {business.imageCreditLabel}
              </a>
            ) : null}
            <div className="tag-row">
              <span className="tag">Revenue {money(business.baseRevenue)}</span>
              <span className="tag">Expense {money(business.baseExpense)}</span>
              <span className="tag">Rep {business.reputationRequired}+</span>
            </div>
            <div className="action-row">
              {(business.preferredDistricts ?? Object.keys(DISTRICT_MAP)).map((districtId) => {
                const district = DISTRICT_MAP[districtId]
                return (
                  <button
                    className="mini-button ghost"
                    key={`${business.id}-${districtId}`}
                    disabled={!canBuyBusiness(state, business) || state.cash < business.cost}
                    onClick={() => dispatch({ type: 'BUY_BUSINESS', templateId: business.id, districtId })}
                  >
                    {district.name}
                  </button>
                )
              })}
            </div>
          </article>
        ))}
      </div>

      <div className="panel-header subhead">
        <div>
          <span className="panel-kicker">Owned Operators</span>
          <h2>Your businesses</h2>
        </div>
        <p>Marketing, staffing, and maintenance determine whether a business compounds or drags on cash.</p>
      </div>

      <div className="card-grid">
        {state.businesses.length === 0 ? (
          <article className="card empty-state">
            <h3>No businesses yet</h3>
            <p>Businesses should come after you can survive a bad month without selling everything else.</p>
          </article>
        ) : (
          state.businesses.map((business) => {
            const template = BUSINESSES.find((item) => item.id === business.templateId) ?? BUSINESSES[0]
            const district = DISTRICT_MAP[business.districtId]
            const businessDebt = getBusinessDebtBalance(state, business.uid)
            return (
              <article className="card owned-card" key={business.uid}>
                {template.imageUrl ? (
                  <div className="card-media">
                    <img src={template.imageUrl} alt={template.imageAlt ?? template.title} loading="lazy" />
                  </div>
                ) : null}
                <div className="card-topline">
                  <h3>{template.title}</h3>
                  <span>{money(getBusinessValue(business, state))}</span>
                </div>
                <p>{business.active ? 'Operating' : 'Paused'} in {district.name}</p>
                {template.imageCreditUrl && template.imageCreditLabel ? (
                  <a className="credit-link" href={template.imageCreditUrl} target="_blank" rel="noreferrer">
                    {template.imageCreditLabel}
                  </a>
                ) : null}
                <div className="tag-row">
                  <span className="tag">{district.theme}</span>
                  <span className="tag">Profit {money(getBusinessMonthlyProfit(business, state))}/mo</span>
                  <span className="tag">Condition {business.condition}%</span>
                  <span className="tag">Marketing {business.marketing}</span>
                  <span className="tag">Staffing {business.staffing}</span>
                  <span className="tag">Age {business.monthsOperating} mo</span>
                  {businessDebt > 0 ? <span className="tag accent">Debt {money(businessDebt)}</span> : null}
                </div>
                <div className="action-row">
                  <button className="mini-button" onClick={() => dispatch({ type: 'TOGGLE_BUSINESS', businessUid: business.uid })}>
                    {business.active ? 'Pause Ops' : 'Resume Ops'}
                  </button>
                  <button className="mini-button ghost" disabled={!canTakeBusinessLoan(state, business)} onClick={() => dispatch({ type: 'TAKE_BUSINESS_LOAN', businessUid: business.uid })}>
                    Business Loan
                  </button>
                  <button className="mini-button ghost" disabled={state.actionPoints <= 0 || state.cash < 320 || business.marketing >= 5} onClick={() => dispatch({ type: 'INVEST_IN_BUSINESS', businessUid: business.uid, focus: 'marketing' })}>
                    Marketing
                  </button>
                  <button className="mini-button ghost" disabled={state.actionPoints <= 0 || state.cash < 420 || business.staffing >= 5} onClick={() => dispatch({ type: 'INVEST_IN_BUSINESS', businessUid: business.uid, focus: 'staffing' })}>
                    Staffing
                  </button>
                  <button className="mini-button ghost" disabled={state.actionPoints <= 0 || state.cash < 260 || business.condition >= 95} onClick={() => dispatch({ type: 'INVEST_IN_BUSINESS', businessUid: business.uid, focus: 'maintenance' })}>
                    Maintenance
                  </button>
                  <button className="mini-button ghost" onClick={() => dispatch({ type: 'SELL_BUSINESS', businessUid: business.uid })}>
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
