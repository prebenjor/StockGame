import { CardMedia } from '../../components/CardMedia'
import { SectionTabs } from '../../components/SectionTabs'
import { SectionToolbar, type ToolbarFilter } from '../../components/SectionToolbar'
import { useStoredUiState } from '../../components/useStoredUiState'
import { money } from '../../game/core/format'
import type { GameAction, GameState } from '../../game/core/types'
import { canBuyBusiness, canTakeBusinessLoan, getBusinessDebtBalance, getBusinessMonthlyProfit, getBusinessValue } from '../../game/core/utils'
import { SECTION_THEMES } from '../../ui/sectionThemes'
import { DISTRICT_MAP } from '../world/data'
import { BUSINESSES } from './data'

type Props = {
  state: GameState
  dispatch: React.Dispatch<GameAction>
}

type BusinessTab = 'opportunities' | 'owned' | 'financing'

type BusinessUiState = {
  tab: BusinessTab
  search: string
  district: 'all' | string
}

const BUSINESS_DEFAULT: BusinessUiState = {
  tab: 'opportunities',
  search: '',
  district: 'all',
}

const BUSINESS_TABS = [
  { id: 'opportunities', label: 'Opportunities', kicker: 'Acquisitions' },
  { id: 'owned', label: 'Owned', kicker: 'Operators' },
  { id: 'financing', label: 'Financing', kicker: 'Debt posture' },
] as const

function getSearchMatch(text: string, search: string) {
  if (!search.trim()) return true
  return text.toLowerCase().includes(search.trim().toLowerCase())
}

export function BusinessPanel({ state, dispatch }: Props) {
  const theme = SECTION_THEMES.business
  const [ui, setUi] = useStoredUiState<BusinessUiState>('street-to-stock-business-ui-v1', BUSINESS_DEFAULT)
  const districts = [{ value: 'all', label: 'All districts' }, ...Object.keys(DISTRICT_MAP).map((districtId) => ({ value: districtId, label: DISTRICT_MAP[districtId].name }))]

  const buyableBusinesses = BUSINESSES.filter((business) => {
    if (!getSearchMatch(`${business.title} ${business.description}`, ui.search)) return false
    if (ui.district !== 'all' && !(business.preferredDistricts ?? Object.keys(DISTRICT_MAP)).includes(ui.district)) return false
    return true
  })

  const ownedBusinesses = state.businesses.filter((business) => {
    const template = BUSINESSES.find((item) => item.id === business.templateId) ?? BUSINESSES[0]
    return getSearchMatch(`${template.title} ${DISTRICT_MAP[business.districtId].name}`, ui.search)
  })

  const filters: ToolbarFilter[] = [
    {
      id: 'district',
      label: 'District',
      type: 'select',
      value: ui.district,
      options: districts,
      onChange: (value) => setUi((current) => ({ ...current, district: value })),
    },
  ]

  const summary =
    ui.tab === 'opportunities'
      ? `${buyableBusinesses.length} operating targets`
      : ui.tab === 'owned'
        ? `${ownedBusinesses.length} owned operators`
        : `${state.businesses.filter((business) => getBusinessDebtBalance(state, business.uid) > 0).length} businesses with loans`

  return (
    <section
      className="panel section-panel business-panel"
      data-ui-section="business"
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
          <span className="panel-kicker">Business</span>
          <h2>Operator board</h2>
        </div>
        <p>This is where you move from working for pay to running something yourself. Start small if you want to; the first little operation still counts.</p>
      </div>

      <SectionTabs
        sectionId="business"
        activeTab={ui.tab}
        onChange={(tabId) => setUi((current) => ({ ...current, tab: tabId as BusinessTab }))}
        tabs={BUSINESS_TABS as unknown as Array<{ id: string; label: string; kicker?: string }>}
        theme={theme}
      />

      <SectionToolbar
        sectionId="business"
        searchValue={ui.search}
        searchPlaceholder={ui.tab === 'opportunities' ? 'Search business types' : 'Search operators'}
        onSearchChange={(value) => setUi((current) => ({ ...current, search: value }))}
        filters={ui.tab === 'opportunities' ? filters : []}
        summary={summary}
      />

      {ui.tab === 'opportunities' ? (
        <div className="card-grid">
          {buyableBusinesses.map((business) => {
            const buyReason = !canBuyBusiness(state, business) ? `Reach reputation ${business.reputationRequired}` : state.cash < business.cost ? `Need ${money(business.cost)} cash` : undefined
            return (
              <article className="card" key={business.id}>
                <CardMedia imageUrl={business.imageUrl} imageAlt={business.imageAlt ?? business.title} fallbackLabel={business.title} />
                <div className="card-topline">
                  <h3>{business.title}</h3>
                  <span>{money(business.cost)}</span>
                </div>
                <p>{business.description}</p>
                <div className="tag-row">
                  <span className="tag">Revenue {money(business.baseRevenue)}</span>
                  <span className="tag">Expense {money(business.baseExpense)}</span>
                  <span className="tag">Rep {business.reputationRequired}+</span>
                  {business.cost <= 3000 ? <span className="tag accent">Starter step</span> : null}
                </div>
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
              </article>
            )
          })}
        </div>
      ) : null}

      {ui.tab === 'owned' ? (
        <div className="card-grid">
          {ownedBusinesses.length === 0 ? (
            <article className="card empty-state">
              <h3>No businesses yet</h3>
              <p>You can wait for a bigger move, or start with one of the tiny owner-run options first. Both are valid.</p>
            </article>
          ) : (
            ownedBusinesses.map((business) => {
              const template = BUSINESSES.find((item) => item.id === business.templateId) ?? BUSINESSES[0]
              const district = DISTRICT_MAP[business.districtId]
              const businessDebt = getBusinessDebtBalance(state, business.uid)
              const marketingReason = state.actionPoints <= 0 ? 'No actions left this week' : state.cash < 320 ? 'Need $320 cash' : business.marketing >= 5 ? 'Marketing already maxed' : undefined
              const staffingReason = state.actionPoints <= 0 ? 'No actions left this week' : state.cash < 420 ? 'Need $420 cash' : business.staffing >= 5 ? 'Staffing already maxed' : undefined
              const maintenanceReason = state.actionPoints <= 0 ? 'No actions left this week' : state.cash < 260 ? 'Need $260 cash' : business.condition >= 95 ? 'Condition already high' : undefined
              return (
                <article className="card owned-card" key={business.uid}>
                  <CardMedia imageUrl={template.imageUrl} imageAlt={template.imageAlt ?? template.title} fallbackLabel={template.title} />
                  <div className="card-topline">
                    <h3>{template.title}</h3>
                    <span>{money(getBusinessValue(business, state))}</span>
                  </div>
                  <p>{business.active ? 'Operating' : 'Paused'} in {district.name}</p>
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
                    <button className="mini-button ghost" disabled={!!marketingReason} onClick={() => dispatch({ type: 'INVEST_IN_BUSINESS', businessUid: business.uid, focus: 'marketing' })} title={marketingReason}>
                      Marketing
                    </button>
                    <button className="mini-button ghost" disabled={!!staffingReason} onClick={() => dispatch({ type: 'INVEST_IN_BUSINESS', businessUid: business.uid, focus: 'staffing' })} title={staffingReason}>
                      Staffing
                    </button>
                    <button className="mini-button ghost" disabled={!!maintenanceReason} onClick={() => dispatch({ type: 'INVEST_IN_BUSINESS', businessUid: business.uid, focus: 'maintenance' })} title={maintenanceReason}>
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
      ) : null}

      {ui.tab === 'financing' ? (
        <div className="card-grid">
          {state.businesses.length === 0 ? (
            <article className="card empty-state">
              <h3>No businesses to finance</h3>
              <p>Get something running first. Financing only becomes interesting once there is an actual business to support.</p>
            </article>
          ) : (
            state.businesses.map((business) => {
              const template = BUSINESSES.find((item) => item.id === business.templateId) ?? BUSINESSES[0]
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
              return (
                <article className="card" key={business.uid}>
                  <div className="card-topline">
                    <h3>{template.title}</h3>
                    <span>{businessDebt > 0 ? money(businessDebt) : 'No debt'}</span>
                  </div>
                  <div className="tag-row">
                    <span className="tag">Condition {business.condition}%</span>
                    <span className="tag">Age {business.monthsOperating} mo</span>
                    <span className="tag">Credit {state.creditScore}</span>
                    <span className="tag">Trust {state.bankTrust}</span>
                  </div>
                  <button className="mini-button ghost" disabled={!!loanReason} onClick={() => dispatch({ type: 'TAKE_BUSINESS_LOAN', businessUid: business.uid })} title={loanReason}>
                    Business Loan
                  </button>
                </article>
              )
            })
          )}
        </div>
      ) : null}
    </section>
  )
}
