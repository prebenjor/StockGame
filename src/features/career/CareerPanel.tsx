import { money } from '../../game/core/format'
import { canRunGig, canTakeJob, getLockedReason, hasUpgrade } from '../../game/core/utils'
import type { GameAction, GameState } from '../../game/core/types'
import { COURSES, COURSE_MAP, GIGS, JOBS, UPGRADES } from './data'

type Props = {
  state: GameState
  dispatch: React.Dispatch<GameAction>
}

export function CareerPanel({ state, dispatch }: Props) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <span className="panel-kicker">Career</span>
          <h2>Jobs and side hustles</h2>
        </div>
        <p>You start at the very bottom. The early jobs are ugly, but they are how you claw enough stability to exploit bigger systems later.</p>
      </div>

      <div className="card-grid">
        {JOBS.map((job) => {
          const lockedReason = getLockedReason(job.reputationRequired, job.certifications, state)
          const isCurrent = state.jobId === job.id
          return (
            <article className={`card ${isCurrent ? 'current' : ''}`} key={job.id}>
              <div className="card-topline">
                <h3>{job.title}</h3>
                <span>{money(job.salary)}/mo</span>
              </div>
              <p>{job.description}</p>
              <div className="tag-row">
                <span className="tag">Rep {job.reputationRequired}+</span>
                {job.certifications.map((certificationId) => (
                  <span className="tag" key={certificationId}>
                    {COURSE_MAP[certificationId].title}
                  </span>
                ))}
              </div>
              <button className="mini-button" disabled={!canTakeJob(state, job)} onClick={() => dispatch({ type: 'TAKE_JOB', jobId: job.id })} title={lockedReason ?? undefined}>
                {isCurrent ? 'Current Job' : 'Take Job'}
              </button>
            </article>
          )
        })}
      </div>

      <div className="panel-header subhead">
        <div>
          <span className="panel-kicker">Cashflow</span>
          <h2>Side gigs</h2>
        </div>
        <p>Each gig costs 1 action point and now drains real energy, so overworking has consequences.</p>
      </div>

      <div className="card-grid">
        {GIGS.map((gig) => {
          const lockedReason = getLockedReason(gig.reputationRequired, gig.certifications, state, gig.needsProperty)
          const bonus = gig.id === 'delivery' && hasUpgrade(state, 'scooter') ? ' + Scooter bonus' : gig.id === 'repair-callout' && hasUpgrade(state, 'toolkit') ? ' + Tool kit bonus' : ''
          return (
            <article className="card" key={gig.id}>
              <div className="card-topline">
                <h3>{gig.title}</h3>
                <span>{money(gig.payout)}</span>
              </div>
              <p>{gig.description}</p>
              <div className="tag-row">
                <span className="tag">Rep {gig.reputationRequired}+</span>
                {bonus ? <span className="tag accent">{bonus.trim()}</span> : null}
              </div>
              <button className="mini-button" disabled={!canRunGig(state, gig)} onClick={() => dispatch({ type: 'RUN_GIG', gigId: gig.id })} title={lockedReason ?? undefined}>
                Run Gig
              </button>
            </article>
          )
        })}
      </div>

      <div className="panel-header subhead">
        <div>
          <span className="panel-kicker">Progression</span>
          <h2>Courses and upgrades</h2>
        </div>
        <p>Courses also cost stamina now, so qualification runs compete with hustle time.</p>
      </div>

      <div className="dual-grid">
        <div className="card-grid compact">
          {COURSES.map((course) => (
            <article className="card" key={course.id}>
              <div className="card-topline">
                <h3>{course.title}</h3>
                <span>{money(course.cost)}</span>
              </div>
              <p>{course.description}</p>
              <button className="mini-button" disabled={state.certifications.includes(course.id) || state.cash < course.cost || state.actionPoints <= 0 || state.reputation < course.reputationRequired || state.energy < 12} onClick={() => dispatch({ type: 'BUY_COURSE', courseId: course.id })}>
                {state.certifications.includes(course.id) ? 'Owned' : 'Study'}
              </button>
            </article>
          ))}
        </div>

        <div className="card-grid compact">
          {UPGRADES.map((upgrade) => (
            <article className="card" key={upgrade.id}>
              <div className="card-topline">
                <h3>{upgrade.title}</h3>
                <span>{money(upgrade.cost)}</span>
              </div>
              <p>{upgrade.description}</p>
              <button className="mini-button" disabled={state.upgrades.includes(upgrade.id) || state.cash < upgrade.cost} onClick={() => dispatch({ type: 'BUY_UPGRADE', upgradeId: upgrade.id })}>
                {state.upgrades.includes(upgrade.id) ? 'Owned' : 'Buy Upgrade'}
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
