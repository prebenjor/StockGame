import { CardMedia } from '../../components/CardMedia'
import { SectionTabs } from '../../components/SectionTabs'
import { SectionToolbar, type ToolbarFilter } from '../../components/SectionToolbar'
import { useStoredUiState } from '../../components/useStoredUiState'
import { money } from '../../game/core/format'
import { getLifestyleSwitchCost, getLivingCost } from '../../game/core/utils'
import type { FoodTier, GameAction, GameState, HousingTier, TransportTier, WellnessTier } from '../../game/core/types'
import { SECTION_THEMES } from '../../ui/sectionThemes'
import { FOOD_OPTIONS, HOUSING_OPTIONS, TRANSPORT_OPTIONS, WELLNESS_OPTIONS } from './data'

type Props = {
  state: GameState
  dispatch: React.Dispatch<GameAction>
}

type LifestyleTab = 'housing' | 'transport' | 'food' | 'recovery' | 'banking'

type LifestyleUiState = {
  tab: LifestyleTab
  affordableOnly: boolean
}

const LIFESTYLE_DEFAULT: LifestyleUiState = {
  tab: 'housing',
  affordableOnly: false,
}

const LIFESTYLE_TABS = [
  { id: 'housing', label: 'Housing', kicker: 'Shelter' },
  { id: 'transport', label: 'Transport', kicker: 'Commute' },
  { id: 'food', label: 'Food', kicker: 'Nutrition' },
  { id: 'recovery', label: 'Recovery', kicker: 'Reset' },
  { id: 'banking', label: 'Banking', kicker: 'Access' },
] as const

type LifestyleOption = {
  id: HousingTier | TransportTier | FoodTier | WellnessTier
  title: string
  monthlyCost: number
  description: string
  imageUrl?: string
  imageAlt?: string
}

type LifestyleCardProps = {
  title: string
  currentId: LifestyleOption['id']
  options: LifestyleOption[]
  category: 'housing' | 'transport' | 'food' | 'wellness'
  state: GameState
  dispatch: React.Dispatch<GameAction>
  affordableOnly: boolean
}

function LifestyleCard({
  title,
  currentId,
  options,
  category,
  state,
  dispatch,
  affordableOnly,
}: LifestyleCardProps) {
  const visibleOptions = options.filter((option) => !affordableOnly || option.id === currentId || state.cash >= getLifestyleSwitchCost(state, category, option.id))

  return (
    <article className="card">
      <div className="card-topline">
        <h3>{title}</h3>
        <span>{money(options.find((option) => option.id === currentId)?.monthlyCost ?? 0)}/mo</span>
      </div>
      <div className="card-grid compact">
        {visibleOptions.map((option) => {
          const switchCost = getLifestyleSwitchCost(state, category, option.id)
          const isCurrent = option.id === currentId
          const switchReason = isCurrent ? 'Already active' : state.cash < switchCost ? `Need ${money(switchCost)} cash` : undefined
          return (
            <div className="lifestyle-option" key={option.id}>
              <CardMedia imageUrl={option.imageUrl} imageAlt={option.imageAlt} fallbackLabel={option.title} size="compact" />
              <div className="card-topline">
                <strong>{option.title}</strong>
                <span>{money(option.monthlyCost)}/mo</span>
              </div>
              <p>{option.description}</p>
              <div className="tag-row">
                <span className="tag">{switchCost === 0 ? 'Current' : `Switch ${money(switchCost)}`}</span>
              </div>
              <button
                className="mini-button"
                disabled={!!switchReason}
                onClick={() => dispatch({ type: 'SET_LIFESTYLE', category, tier: option.id })}
                title={switchReason}
              >
                {isCurrent ? 'Current' : 'Switch'}
              </button>
            </div>
          )
        })}
      </div>
    </article>
  )
}

export function LifestylePanel({ state, dispatch }: Props) {
  const theme = SECTION_THEMES.lifestyle
  const [ui, setUi] = useStoredUiState<LifestyleUiState>('street-to-stock-lifestyle-ui-v1', LIFESTYLE_DEFAULT)
  const bankReason = state.bankAccount ? 'Account already open' : state.actionPoints <= 0 ? 'No actions left this week' : state.cash < 25 ? 'Need $25 cash' : undefined

  const filters: ToolbarFilter[] =
    ui.tab === 'banking'
      ? []
      : [
          {
            id: 'affordable',
            label: 'Affordable now',
            type: 'toggle',
            checked: ui.affordableOnly,
            onChange: (checked) => setUi((current) => ({ ...current, affordableOnly: checked })),
          },
        ]

  const summary =
    ui.tab === 'banking'
      ? `${state.bankAccount ? 'banked' : 'unbanked'} | living cost ${money(getLivingCost(state))}/mo`
      : `${ui.affordableOnly ? 'affordable options only' : 'full ladder'} | living cost ${money(getLivingCost(state))}/mo`

  return (
    <section
      className="panel section-panel lifestyle-panel"
      data-ui-section="lifestyle"
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
          <span className="panel-kicker">Lifestyle</span>
          <h2>Survival setup</h2>
        </div>
        <p>The feel here should be domestic and practical. Each subtab isolates one survival layer so the player can tune housing, transport, food, recovery, and basic banking without wading through everything at once.</p>
      </div>

      <SectionTabs
        sectionId="lifestyle"
        activeTab={ui.tab}
        onChange={(tabId) => setUi((current) => ({ ...current, tab: tabId as LifestyleTab }))}
        tabs={LIFESTYLE_TABS as unknown as Array<{ id: string; label: string; kicker?: string }>}
        theme={theme}
      />

      <SectionToolbar sectionId="lifestyle" filters={filters} summary={summary} />

      {ui.tab === 'banking' ? (
        <div className="card-grid">
          <article className="card current">
            <div className="card-topline">
              <h3>Banking</h3>
              <span>{state.bankAccount ? 'Active' : 'Unbanked'}</span>
            </div>
            <p>
              {state.bankAccount
                ? 'You have a basic account, which keeps trading fees and financing friction under control.'
                : 'You can still trade and hustle, but fees are worse and financing is more predatory until you open an account.'}
            </p>
            <div className="tag-row">
              <span className="tag">Living Cost {money(getLivingCost(state))}/mo</span>
              <span className="tag">Bank Trust {state.bankTrust}</span>
            </div>
            <button id="lifestyle-open-account-button" className="mini-button" disabled={!!bankReason} onClick={() => dispatch({ type: 'OPEN_BANK_ACCOUNT' })} title={bankReason}>
              {state.bankAccount ? 'Opened' : 'Open Account'}
            </button>
          </article>
        </div>
      ) : null}

      {ui.tab === 'housing' ? (
        <LifestyleCard title="Housing" currentId={state.housingTier} options={HOUSING_OPTIONS} category="housing" state={state} dispatch={dispatch} affordableOnly={ui.affordableOnly} />
      ) : null}
      {ui.tab === 'transport' ? (
        <LifestyleCard title="Transport" currentId={state.transportTier} options={TRANSPORT_OPTIONS} category="transport" state={state} dispatch={dispatch} affordableOnly={ui.affordableOnly} />
      ) : null}
      {ui.tab === 'food' ? (
        <LifestyleCard title="Food" currentId={state.foodTier} options={FOOD_OPTIONS} category="food" state={state} dispatch={dispatch} affordableOnly={ui.affordableOnly} />
      ) : null}
      {ui.tab === 'recovery' ? (
        <LifestyleCard title="Recovery" currentId={state.wellnessTier} options={WELLNESS_OPTIONS} category="wellness" state={state} dispatch={dispatch} affordableOnly={ui.affordableOnly} />
      ) : null}
    </section>
  )
}
