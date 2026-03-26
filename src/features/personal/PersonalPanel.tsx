import { CardMedia } from '../../components/CardMedia'
import { SectionTabs } from '../../components/SectionTabs'
import { SectionToolbar, type ToolbarFilter } from '../../components/SectionToolbar'
import { useStoredUiState } from '../../components/useStoredUiState'
import { money } from '../../game/core/format'
import type { GameAction, GameState, PersonalAction } from '../../game/core/types'
import { WELLNESS_OPTION_MAP } from '../lifestyle/data'
import { SECTION_THEMES } from '../../ui/sectionThemes'
import { PERSONAL_ACTIONS } from './data'

type Props = {
  state: GameState
  dispatch: React.Dispatch<GameAction>
}

type PersonalTab = 'recovery' | 'leisure' | 'social'

type PersonalUiState = {
  tab: PersonalTab
  search: string
  availability: 'all' | 'available' | 'unused' | 'used'
  sort: 'relief' | 'cost-low' | 'cost-high'
}

const PERSONAL_DEFAULT: PersonalUiState = {
  tab: 'recovery',
  search: '',
  availability: 'all',
  sort: 'relief',
}

const PERSONAL_TABS = [
  { id: 'recovery', label: 'Recovery', kicker: 'Reset' },
  { id: 'leisure', label: 'Leisure', kicker: 'Off-clock' },
  { id: 'social', label: 'Social', kicker: 'Community' },
] as const

function getSearchMatch(action: PersonalAction, search: string) {
  if (!search.trim()) return true
  const haystack = `${action.title} ${action.description} ${action.category}`.toLowerCase()
  return haystack.includes(search.trim().toLowerCase())
}

function getActionReason(state: GameState, action: PersonalAction) {
  if (action.oncePerWeek && state.personalActionsUsedThisWeek.includes(action.id)) return 'Already used this week'
  if (state.actionPoints < action.actionCost) return 'No open days left this week'
  if (state.cash < action.cashCost) return `Need ${money(action.cashCost)} cash`
  return undefined
}

function getReliefScore(action: PersonalAction) {
  return Math.abs(action.effects.stress ?? 0) * 2 + (action.effects.energy ?? 0) + (action.effects.health ?? 0)
}

export function PersonalPanel({ state, dispatch }: Props) {
  const theme = SECTION_THEMES.personal
  const [ui, setUi] = useStoredUiState<PersonalUiState>('street-to-stock-personal-ui-v1', PERSONAL_DEFAULT)

  const filteredActions = PERSONAL_ACTIONS
    .filter((action) => action.category === ui.tab)
    .filter((action) => getSearchMatch(action, ui.search))
    .filter((action) => {
      const used = state.personalActionsUsedThisWeek.includes(action.id)
      const available = !getActionReason(state, action)
      if (ui.availability === 'available' && !available) return false
      if (ui.availability === 'unused' && used) return false
      if (ui.availability === 'used' && !used) return false
      return true
    })
    .sort((left, right) => {
      if (ui.sort === 'cost-low') return left.cashCost - right.cashCost
      if (ui.sort === 'cost-high') return right.cashCost - left.cashCost
      return getReliefScore(right) - getReliefScore(left)
    })

  const filters: ToolbarFilter[] = [
    {
      id: 'availability',
      label: 'Show',
      type: 'select',
      value: ui.availability,
      options: [
        { value: 'all', label: 'All actions' },
        { value: 'available', label: 'Available now' },
        { value: 'unused', label: 'Unused this week' },
        { value: 'used', label: 'Used this week' },
      ],
      onChange: (value) => setUi((current) => ({ ...current, availability: value as PersonalUiState['availability'] })),
    },
  ]

  const summary = `${filteredActions.length} options | ${state.actionPoints} open days | ${state.personalActionsUsedThisWeek.length} used this week`

  const wellnessModifier =
    state.wellnessTier === 'stretch' || state.wellnessTier === 'gym'
      ? '+1 energy, +1 health'
      : state.wellnessTier === 'therapy'
        ? 'extra stress relief'
        : 'no baseline boost'

  return (
    <section
      className="panel section-panel personal-panel"
      data-ui-section="personal"
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
          <span className="panel-kicker">Personal</span>
          <h2>Recovery, leisure, and social breathing room</h2>
        </div>
        <p>This section is for active downtime. Lifestyle is your passive baseline, Personal is how you spend a week block to stabilize before the grind gets more expensive.</p>
      </div>

      <SectionTabs
        sectionId="personal"
        activeTab={ui.tab}
        onChange={(tabId) => setUi((current) => ({ ...current, tab: tabId as PersonalTab }))}
        tabs={PERSONAL_TABS as unknown as Array<{ id: string; label: string; kicker?: string }>}
        theme={theme}
      />

      <SectionToolbar
        sectionId="personal"
        searchValue={ui.search}
        searchPlaceholder={ui.tab === 'recovery' ? 'Search recovery options' : ui.tab === 'leisure' ? 'Search leisure options' : 'Search social options'}
        onSearchChange={(value) => setUi((current) => ({ ...current, search: value }))}
        filters={filters}
        sortOptions={[
          { value: 'relief', label: 'Best relief first' },
          { value: 'cost-low', label: 'Lowest cost first' },
          { value: 'cost-high', label: 'Highest cost first' },
        ]}
        sortValue={ui.sort}
        onSortChange={(value) => setUi((current) => ({ ...current, sort: value as PersonalUiState['sort'] }))}
        summary={summary}
      />

      <div className="dual-grid">
        <article className="card current">
          <div className="card-topline">
            <h3>Week blocks</h3>
            <span>{state.actionPoints} open days</span>
          </div>
          <p>Your active downtime is intentionally limited. These actions help you stop a rough week from compounding, but they do not replace a better housing, food, or wellness baseline.</p>
          <div className="tag-row">
            <span className="tag">Stress {state.stress}</span>
            <span className="tag">Energy {state.energy}</span>
            <span className="tag">Health {state.health}</span>
            <span className="tag">{WELLNESS_OPTION_MAP[state.wellnessTier].title}</span>
          </div>
          <div className="tag-row">
            <span className="tag">Wellness modifier {wellnessModifier}</span>
            {state.housingTier === 'shelter' ? <span className="tag accent">Shelter cuts stress relief</span> : null}
            {state.foodTier === 'skip-meals' ? <span className="tag accent">Skipped meals cut energy gain</span> : null}
          </div>
        </article>

        <article className="card">
          <div className="card-topline">
            <h3>Used this week</h3>
            <span>{state.personalActionsUsedThisWeek.length} logged</span>
          </div>
          {state.personalActionsUsedThisWeek.length === 0 ? (
            <p>No personal actions used yet this week. You can keep pushing, or spend one open day to stop stress from rolling forward.</p>
          ) : (
            <div className="tag-row">
              {state.personalActionsUsedThisWeek.map((actionId) => {
                const action = PERSONAL_ACTIONS.find((item) => item.id === actionId)
                return (
                  <span className="tag" key={actionId}>
                    {action?.title ?? actionId}
                  </span>
                )
              })}
            </div>
          )}
        </article>
      </div>

      <div className="card-grid">
        {filteredActions.map((action) => {
          const reason = getActionReason(state, action)
          const used = state.personalActionsUsedThisWeek.includes(action.id)
          return (
            <article className={`card ${used ? 'current' : ''}`} key={action.id} id={`personal-action-card-${action.id}`}>
              <CardMedia imageUrl={action.imageUrl} imageAlt={action.imageAlt} fallbackLabel={action.title} size="compact" />
              <div className="card-topline">
                <h3>{action.title}</h3>
                <span>{money(action.cashCost)}</span>
              </div>
              <p>{action.description}</p>
              <div className="tag-row">
                <span className="tag">{action.actionCost} open day</span>
                {action.effects.stress ? <span className="tag">Stress {action.effects.stress}</span> : null}
                {action.effects.energy ? <span className="tag">Energy +{action.effects.energy}</span> : null}
                {action.effects.health ? <span className="tag">Health +{action.effects.health}</span> : null}
                {action.effects.reputation ? <span className="tag">Rep +{action.effects.reputation}</span> : null}
                {action.storyFlag ? <span className="tag accent">Story hook</span> : null}
              </div>
              <button
                id={`run-personal-action-${action.id}`}
                className="mini-button"
                disabled={!!reason}
                onClick={() => dispatch({ type: 'RUN_PERSONAL_ACTION', personalActionId: action.id })}
                title={reason}
              >
                {used ? 'Used This Week' : 'Take This Block'}
              </button>
            </article>
          )
        })}
      </div>
    </section>
  )
}
