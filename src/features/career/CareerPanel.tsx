import { money } from '../../game/core/format'
import { canRunGig, canTakeJob, canTakeSideJob, getLockedReason, hasUpgrade, toWeeklyAmount } from '../../game/core/utils'
import type { GameAction, GameState } from '../../game/core/types'
import { COURSES, COURSE_MAP, GIGS, JOBS, SIDE_JOBS, UPGRADES } from './data'

type Props = {
  state: GameState
  dispatch: React.Dispatch<GameAction>
}

function CardMedia({ imageUrl, imageAlt }: { imageUrl?: string; imageAlt?: string }) {
  if (!imageUrl) return null

  return (
    <div className="card-media">
      <img src={imageUrl} alt={imageAlt ?? ''} loading="lazy" />
    </div>
  )
}

function getSideJobReason(state: GameState, sideJob: typeof SIDE_JOBS[number]) {
  const baseReason = getLockedReason(sideJob.reputationRequired, sideJob.certifications, state)
  if (baseReason) return baseReason
  if (sideJob.bankAccountRequired && !state.bankAccount) return 'Need a bank account'
  if (sideJob.seasonMonths && !sideJob.seasonMonths.includes(((state.month - 1) % 12) + 1)) return 'Out of season'
  const conflicting = state.sideJobIds
    .map((id) => SIDE_JOBS.find((job) => job.id === id))
    .find((job) => job && job.schedule === sideJob.schedule)
  if (conflicting) return `Conflicts with ${conflicting.title}`
  return undefined
}

export function CareerPanel({ state, dispatch }: Props) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <span className="panel-kicker">Career</span>
          <h2>Jobs, commitments, and study</h2>
        </div>
        <p>Your main job is only one lane. Weekly commitments now have schedules, seasonality, and internships, so two runs can diverge even with similar money.</p>
      </div>

      <div className="card-grid">
        {JOBS.map((job) => {
          const lockedReason = getLockedReason(job.reputationRequired, job.certifications, state)
          const isCurrent = state.jobId === job.id
          return (
            <article className={`card ${isCurrent ? 'current' : ''}`} key={job.id}>
              <CardMedia imageUrl={job.imageUrl} imageAlt={job.imageAlt} />
              <div className="card-topline">
                <h3>{job.title}</h3>
                <span>{money(toWeeklyAmount(job.salary))}/wk</span>
              </div>
              <p>{job.description}</p>
              <div className="tag-row">
                <span className="tag">Base {money(job.salary)}/mo</span>
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
          <span className="panel-kicker">Weekly Commitments</span>
          <h2>Side jobs, internships, and seasonal work</h2>
        </div>
        <p>You can stack compatible commitments, but schedule conflicts and workload still matter. Daytime internships and weekend seasonals should not feel interchangeable.</p>
      </div>

      <div className="card-grid">
        {SIDE_JOBS.map((sideJob) => {
          const lockedReason = getSideJobReason(state, sideJob)
          const isCurrent = state.sideJobIds.includes(sideJob.id)
          const seasonLabel = sideJob.seasonMonths?.join(', ')
          return (
            <article className={`card ${isCurrent ? 'current' : ''}`} key={sideJob.id}>
              <CardMedia imageUrl={sideJob.imageUrl} imageAlt={sideJob.imageAlt} />
              <div className="card-topline">
                <h3>{sideJob.title}</h3>
                <span>{money(sideJob.weeklyPay)}/wk</span>
              </div>
              <p>{sideJob.description}</p>
              <div className="tag-row">
                <span className="tag">{sideJob.category}</span>
                <span className="tag">{sideJob.schedule}</span>
                <span className="tag">{sideJob.commitment}</span>
                <span className="tag">Stress +{sideJob.weeklyStress}</span>
                <span className="tag">Energy -{sideJob.weeklyEnergy}</span>
                {sideJob.knowledgeGain ? <span className="tag">Knowledge +{sideJob.knowledgeGain}</span> : null}
                {seasonLabel ? <span className="tag">Season {seasonLabel}</span> : null}
                {sideJob.certifications.map((certificationId) => (
                  <span className="tag" key={certificationId}>
                    {COURSE_MAP[certificationId].title}
                  </span>
                ))}
              </div>
              <div className="action-row">
                <button className="mini-button" disabled={!canTakeSideJob(state, sideJob)} onClick={() => dispatch({ type: 'TAKE_SIDE_JOB', sideJobId: sideJob.id })} title={lockedReason}>
                  {isCurrent ? 'Active' : 'Add Commitment'}
                </button>
                <button className="mini-button ghost" disabled={!isCurrent} onClick={() => dispatch({ type: 'DROP_SIDE_JOB', sideJobId: sideJob.id })}>
                  Drop
                </button>
              </div>
            </article>
          )
        })}
      </div>

      <div className="panel-header subhead">
        <div>
          <span className="panel-kicker">Flexible Cash</span>
          <h2>One-off gigs</h2>
        </div>
        <p>Gigs are still the burst option. They are useful inside a tight week, but recurring commitments are now the steadier lane.</p>
      </div>

      <div className="card-grid">
        {GIGS.map((gig) => {
          const lockedReason = getLockedReason(gig.reputationRequired, gig.certifications, state, gig.needsProperty)
          const bonus = gig.id === 'delivery' && hasUpgrade(state, 'scooter') ? ' + Scooter bonus' : gig.id === 'repair-callout' && hasUpgrade(state, 'toolkit') ? ' + Tool kit bonus' : ''
          return (
            <article className="card" key={gig.id}>
              <CardMedia imageUrl={gig.imageUrl} imageAlt={gig.imageAlt} />
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
        <p>Courses still cost stamina, so qualification runs compete directly with work commitments and recovery.</p>
      </div>

      <div className="dual-grid">
        <div className="card-grid compact">
          {COURSES.map((course) => (
            <article className="card" key={course.id}>
              <CardMedia imageUrl={course.imageUrl} imageAlt={course.imageAlt} />
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
              <CardMedia imageUrl={upgrade.imageUrl} imageAlt={upgrade.imageAlt} />
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
