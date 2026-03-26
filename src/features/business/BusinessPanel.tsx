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
        {BUSINESSES.map((business) => {
          const buyReason = !canBuyBusiness(state, business) ? 'Business not available' : state.cash < business.cost ? `Need ${money(business.cost)} cash` : undefined
          return (
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
            <div className="action-stack">
              <div className="action-section">
                <span className="action-label">Primary Action</span>
                <div className="action-row">
                  {(business.preferredDistricts ?? Object.keys(DISTRICT_MAP)).map((districtId) => {
                    const district = DISTRICT_MAP[districtId]
                    return (
                      <button
                        className="mini-button ghost"
                        key={`${business.id}-${districtId}`}
                        disabled={!!buyReason}
                        onClick={() => dispatch({ type: 'BUY_BUSINESS', templateId: business.id, districtId })}
                        title={buyReason}
                      >
                        {district.name}
                      </button>
                    )
                  })}
                </div>
                <p className="action-hint">
                  {buyReason ? `Blocked: ${buyReason}.` : 'Primary move: pick the district that best matches the business and current local momentum.'}
                </p>
              </div>
            </div>
          </article>
        )})}
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
            const loanReason = !canTakeBusinessLoan(state, business)
              ? !state.bankAccount
                ? 'Open a bank account first'
                : state.actionPoints <= 0
                  ? 'No actions left this week'
                  : state.creditScore < 520
                    ? 'Need 520 credit score'
                    : state.bankTrust < 12
                      ? 'Need 12 bank trust'
                      : businessDebt > 0
                        ? 'Business already has debt'
                        : business.condition < 45
                          ? 'Raise condition above 45'
                          : business.monthsOperating < 1
                            ? 'Operate at least 1 month first'
                            : 'Loan unavailable'
              : undefined
            const marketingReason = state.actionPoints <= 0 ? 'No actions left this week' : state.cash < 320 ? 'Need $320 cash' : business.marketing >= 5 ? 'Marketing already maxed' : undefined
            const staffingReason = state.actionPoints <= 0 ? 'No actions left this week' : state.cash < 420 ? 'Need $420 cash' : business.staffing >= 5 ? 'Staffing already maxed' : undefined
            const maintenanceReason = state.actionPoints <= 0 ? 'No actions left this week' : state.cash < 260 ? 'Need $260 cash' : business.condition >= 95 ? 'Condition already high' : undefined
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
                <div className="action-stack">
                  <div className="action-section">
                    <span className="action-label">Primary Actions</span>
                    <div className="action-row">
                      <button className="mini-button" onClick={() => dispatch({ type: 'TOGGLE_BUSINESS', businessUid: business.uid })}>
                        {business.active ? 'Pause Ops' : 'Resume Ops'}
                      </button>
                      <button className="mini-button ghost" disabled={!!marketingReason} onClick={() => dispatch({ type: 'INVEST_IN_BUSINESS', businessUid: business.uid, focus: 'marketing' })} title={marketingReason}>
                        Marketing
                      </button>
                      <button className="mini-button ghost" disabled={!!staffingReason} onClick={() => dispatch({ type: 'INVEST_IN_BUSINESS', businessUid: business.uid, focus: 'staffing' })} title={staffingReason}>
                        Staffing
                      </button>
                      <button className="mini-button ghost" disabled={!!maintenanceReason} onClick={() => dispatch({ type: 'INVEST_IN_BUSINESS', businessUid: business.uid, focus: 'maintenance' })} title={maintenanceReason}>
                        Maintenance
                      </button>
                    </div>
                    <p className="action-hint">
                      {maintenanceReason && !business.active
                        ? 'Primary move: resume operations only when you actually want the business generating again.'
                        : 'Primary move: operate the business, then invest in whichever weak point is currently holding profit back.'}
                    </p>
                  </div>
                  <div className="action-section">
                    <span className="action-label">Secondary Actions</span>
                    <div className="action-row">
                      <button className="mini-button ghost" disabled={!!loanReason} onClick={() => dispatch({ type: 'TAKE_BUSINESS_LOAN', businessUid: business.uid })} title={loanReason}>
                        Business Loan
                      </button>
                      <button className="mini-button ghost" onClick={() => dispatch({ type: 'SELL_BUSINESS', businessUid: business.uid })}>
                        Sell
                      </button>
                    </div>
                    <p className="action-hint">
                      {loanReason ? `Loan blocked: ${loanReason}.` : 'Secondary move: use a business loan only after the company has some operating history behind it.'}
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
