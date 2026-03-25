import { money } from '../../game/core/format'
import { getContactSummaries, getRivalSummaries } from '../../game/core/selectors'
import type { GameAction, GameState } from '../../game/core/types'
import { CONTACT_MAP, DISTRICT_MAP } from '../world/data'

type Props = {
  state: GameState
  dispatch: React.Dispatch<GameAction>
}

export function NetworkPanel({ state, dispatch }: Props) {
  const contacts = getContactSummaries(state)
  const rivals = getRivalSummaries(state)

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <span className="panel-kicker">Network</span>
          <h2>Contacts and opportunities</h2>
        </div>
        <p>Relationships now unlock off-market deals, better financing, and early-survival story arcs that can pull you out of the hole faster.</p>
      </div>

      <div className="card-grid">
        {contacts.map((contact) => (
          <article className="card" key={contact.contactId}>
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

      <div className="panel-header subhead">
        <div>
          <span className="panel-kicker">Rivals</span>
          <h2>Competitive pressure</h2>
        </div>
        <p>These rivals contest districts, deals, and margins as your empire gets more visible.</p>
      </div>

      <div className="card-grid">
        {rivals.map((rival) => (
          <article className="card" key={rival.id}>
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

      <div className="panel-header subhead">
        <div>
          <span className="panel-kicker">Openings</span>
          <h2>Current opportunities</h2>
        </div>
        <p>Claim them before the current month rolls over at the end of week four.</p>
      </div>

      <div className="card-grid">
        {state.opportunities.length === 0 ? (
          <article className="card empty-state">
            <h3>No live opportunities</h3>
            <p>Build relationships and keep progressing. The better your network, the more asymmetrical deals show up.</p>
          </article>
        ) : (
          state.opportunities.map((opportunity) => (
            <article className="card" key={opportunity.id}>
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
    </section>
  )
}
