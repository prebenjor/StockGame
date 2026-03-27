import { CardMedia } from '../../components/CardMedia'
import { SectionTabs } from '../../components/SectionTabs'
import { SectionToolbar, type ToolbarFilter } from '../../components/SectionToolbar'
import { useStoredUiState } from '../../components/useStoredUiState'
import { money } from '../../game/core/format'
import { getContactSummaries, getRivalSummaries } from '../../game/core/selectors'
import type { GameAction, GameState } from '../../game/core/types'
import { SECTION_THEMES } from '../../ui/sectionThemes'
import { CONTACT_MAP, DISTRICT_MAP } from '../world/data'

type Props = {
  state: GameState
  dispatch: React.Dispatch<GameAction>
}

type NetworkTab = 'contacts' | 'rivals' | 'opportunities'

type NetworkUiState = {
  tab: NetworkTab
  search: string
  opportunityMode: 'all' | 'affordable'
}

const NETWORK_DEFAULT: NetworkUiState = {
  tab: 'opportunities',
  search: '',
  opportunityMode: 'all',
}

const NETWORK_TABS = [
  { id: 'contacts', label: 'Contacts', kicker: 'Relationships' },
  { id: 'rivals', label: 'Rivals', kicker: 'Pressure' },
  { id: 'opportunities', label: 'Opportunities', kicker: 'Openings' },
] as const

function getSearchMatch(text: string, search: string) {
  if (!search.trim()) return true
  return text.toLowerCase().includes(search.trim().toLowerCase())
}

export function NetworkPanel({ state, dispatch }: Props) {
  const theme = SECTION_THEMES.network
  const [ui, setUi] = useStoredUiState<NetworkUiState>('street-to-stock-network-ui-v1', NETWORK_DEFAULT)
  const contacts = getContactSummaries(state).filter((contact) => getSearchMatch(`${contact.name} ${contact.role} ${contact.description}`, ui.search))
  const rivals = getRivalSummaries(state).filter((rival) => getSearchMatch(`${rival.name} ${rival.archetype} ${rival.description}`, ui.search))
  const opportunities = state.opportunities.filter((opportunity) => {
    if (!getSearchMatch(`${opportunity.title} ${opportunity.detail} ${CONTACT_MAP[opportunity.contactId].name}`, ui.search)) return false
    if (ui.opportunityMode === 'affordable' && (opportunity.cashCost ?? 0) > state.cash) return false
    return true
  })

  const filters: ToolbarFilter[] =
    ui.tab === 'opportunities'
      ? [
          {
            id: 'opportunity-mode',
            label: 'Filter',
            type: 'select',
            value: ui.opportunityMode,
            options: [
              { value: 'all', label: 'All openings' },
              { value: 'affordable', label: 'Affordable now' },
            ],
            onChange: (value) => setUi((current) => ({ ...current, opportunityMode: value as NetworkUiState['opportunityMode'] })),
          },
        ]
      : []

  const summary =
    ui.tab === 'contacts'
      ? `${contacts.length} contacts`
      : ui.tab === 'rivals'
        ? `${rivals.length} rivals`
        : `${opportunities.length} live opportunities`

  return (
    <section
      className="panel section-panel network-panel"
      data-ui-section="network"
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
          <span className="panel-kicker">Network</span>
          <h2>Contacts, pressure, and openings</h2>
        </div>
        <p>People matter here. Some help, some compete with you, and some quietly open doors if you stay in touch long enough.</p>
      </div>

      <SectionTabs
        sectionId="network"
        activeTab={ui.tab}
        onChange={(tabId) => setUi((current) => ({ ...current, tab: tabId as NetworkTab }))}
        tabs={NETWORK_TABS as unknown as Array<{ id: string; label: string; kicker?: string }>}
        theme={theme}
      />

      <SectionToolbar
        sectionId="network"
        searchValue={ui.search}
        searchPlaceholder="Search people and openings"
        onSearchChange={(value) => setUi((current) => ({ ...current, search: value }))}
        filters={filters}
        summary={summary}
      />

      {ui.tab === 'contacts' ? (
        <div className="card-grid">
          {contacts.map((contact) => (
            <article className="card" key={contact.contactId}>
              <CardMedia imageUrl={contact.imageUrl} imageAlt={contact.imageAlt} fallbackLabel={contact.name} size="compact" />
              <div className="card-topline">
                <h3>{contact.name}</h3>
                <span>{contact.relationship}</span>
              </div>
              <p>{contact.role}: {contact.description}</p>
              <div className="tag-row">
                <span className="tag">{contact.perk}</span>
                <span className="tag">Trust {contact.relationship}/100</span>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {ui.tab === 'rivals' ? (
        <div className="card-grid">
          {rivals.map((rival) => (
            <article className="card" key={rival.id}>
              <CardMedia imageUrl={rival.imageUrl} imageAlt={rival.imageAlt} fallbackLabel={rival.name} size="compact" />
              <div className="card-topline">
                <h3>{rival.name}</h3>
                <span>{rival.rivalry}</span>
              </div>
              <p>{rival.archetype}: {rival.description}</p>
              <div className="tag-row">
                <span className="tag">{rival.specialty}</span>
                <span className="tag">{DISTRICT_MAP[rival.focusDistrictId].name}</span>
                <span className="tag">Pressure {rival.pressure}</span>
                <span className="tag">Rivalry {rival.rivalry}</span>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {ui.tab === 'opportunities' ? (
        <div className="card-grid">
          {opportunities.length === 0 ? (
            <article className="card empty-state">
              <h3>No live opportunities</h3>
              <p>Nothing is live right now. Keep building trust and showing up, and better openings will start to appear.</p>
            </article>
          ) : (
            opportunities.map((opportunity) => (
              <article className="card" key={opportunity.id}>
                <CardMedia
                  imageUrl={CONTACT_MAP[opportunity.contactId].imageUrl}
                  imageAlt={CONTACT_MAP[opportunity.contactId].imageAlt}
                  fallbackLabel={CONTACT_MAP[opportunity.contactId].name}
                  size="compact"
                />
                <div className="card-topline">
                  <h3>{opportunity.title}</h3>
                  <span>{CONTACT_MAP[opportunity.contactId].role}</span>
                </div>
                <p>{opportunity.detail}</p>
                <div className="tag-row">
                  <span className="tag">{CONTACT_MAP[opportunity.contactId].name}</span>
                  <span className="tag">{opportunity.type}</span>
                  {opportunity.districtId ? <span className="tag">{DISTRICT_MAP[opportunity.districtId].name}</span> : null}
                  {opportunity.cashCost ? <span className="tag">Cost {money(opportunity.cashCost)}</span> : null}
                </div>
                <button className="mini-button" onClick={() => dispatch({ type: 'CLAIM_OPPORTUNITY', opportunityId: opportunity.id })}>
                  Claim
                </button>
              </article>
            ))
          )}
        </div>
      ) : null}
    </section>
  )
}
