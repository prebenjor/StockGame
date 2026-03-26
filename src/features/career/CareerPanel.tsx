import { money } from '../../game/core/format'
import { canRunGig, canTakeJob, canTakeSideJob, getLockedReason, hasUpgrade, toWeeklyAmount } from '../../game/core/utils'
import type { GameAction, GameState } from '../../game/core/types'
import { CardMedia } from '../../components/CardMedia'
import { COURSES, COURSE_MAP, GIGS, JOBS, SIDE_JOBS, UPGRADES } from './data'

type Props = {
  state: GameState
  dispatch: React.Dispatch<GameAction>
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
  const getCourseReason = (course: typeof COURSES[number]) => {
    if (state.certifications.includes(course.id)) return 'Already studied'
    if (state.cash < course.cost) return `Need ${money(course.cost)} cash`
    if (state.actionPoints <= 0) return 'No actions left this week'
    if (state.reputation < course.reputationRequired) return `Reach reputation ${course.reputationRequired}`
    if (state.energy < 12) return 'Need at least 12 energy'
    return undefined
  }

  const getUpgradeReason = (upgrade: typeof UPGRADES[number]) => {
    if (state.upgrades.includes(upgrade.id)) return 'Already owned'
    if (state.cash < upgrade.cost) return `Need ${money(upgrade.cost)} cash`
    return undefined
  }

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
              <CardMedia imageUrl={job.imageUrl} imageAlt={job.imageAlt} fallbackLabel={job.title} size="compact" />
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
              <div className="action-stack">
                <div className="action-section">
                  <button className="mini-button" disabled={!canTakeJob(state, job)} onClick={() => dispatch({ type: 'TAKE_JOB', jobId: job.id })} title={lockedReason ?? undefined}>
                    {isCurrent ? 'Current Job' : 'Take Job'}
                  </button>
                  <p className="action-hint">
                    {lockedReason ? `Blocked: ${lockedReason}.` : isCurrent ? 'This is already your main income track.' : 'Primary move: switch to this when the weekly pay or route advantage is worth the change.'}
                  </p>
                </div>
              </div>
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
              <CardMedia imageUrl={sideJob.imageUrl} imageAlt={sideJob.imageAlt} fallbackLabel={sideJob.title} size="compact" />
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
              <div className="action-stack">
                <div className="action-section">
                  <div className="action-row">
                    <button className="mini-button" disabled={!canTakeSideJob(state, sideJob)} onClick={() => dispatch({ type: 'TAKE_SIDE_JOB', sideJobId: sideJob.id })} title={lockedReason}>
                      {isCurrent ? 'Active' : 'Add Commitment'}
                    </button>
                    <button className="mini-button ghost" disabled={!isCurrent} onClick={() => dispatch({ type: 'DROP_SIDE_JOB', sideJobId: sideJob.id })} title={!isCurrent ? 'Not currently active' : undefined}>
                      Drop
                    </button>
                  </div>
                  <p className="action-hint">
                    {lockedReason ? `Blocked: ${lockedReason}.` : isCurrent ? 'Secondary move: drop this if your schedule or energy cannot support it.' : 'Primary move: add this only if the schedule fits your current load.'}
                  </p>
                </div>
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
              <CardMedia imageUrl={gig.imageUrl} imageAlt={gig.imageAlt} fallbackLabel={gig.title} size="compact" />
              <div className="card-topline">
                <h3>{gig.title}</h3>
                <span>{money(gig.payout)}</span>
              </div>
              <p>{gig.description}</p>
              <div className="tag-row">
                <span className="tag">Rep {gig.reputationRequired}+</span>
                {bonus ? <span className="tag accent">{bonus.trim()}</span> : null}
              </div>
              <div className="action-stack">
                <div className="action-section">
                  <button className="mini-button" disabled={!canRunGig(state, gig)} onClick={() => dispatch({ type: 'RUN_GIG', gigId: gig.id })} title={lockedReason ?? undefined}>
                    Run Gig
                  </button>
                  <p className="action-hint">
                    {lockedReason ? `Blocked: ${lockedReason}.` : 'Primary move: use gigs for short bursts of cash, not as your whole weekly plan.'}
                  </p>
                </div>
              </div>
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
          {COURSES.map((course) => {
            const reason = getCourseReason(course)
            return (
            <article className="card" key={course.id}>
              <CardMedia imageUrl={course.imageUrl} imageAlt={course.imageAlt} fallbackLabel={course.title} size="compact" />
              <div className="card-topline">
                <h3>{course.title}</h3>
                <span>{money(course.cost)}</span>
              </div>
              <p>{course.description}</p>
              <div className="action-stack">
                <div className="action-section">
                  <button className="mini-button" disabled={!!reason} onClick={() => dispatch({ type: 'BUY_COURSE', courseId: course.id })} title={reason}>
                    {state.certifications.includes(course.id) ? 'Owned' : 'Study'}
                  </button>
                  <p className="action-hint">
                    {reason ? `Blocked: ${reason}.` : 'Primary move: buy earning power when it opens a cleaner route than grinding low-end jobs.'}
                  </p>
                </div>
              </div>
            </article>
          )})}
        </div>

        <div className="card-grid compact">
          {UPGRADES.map((upgrade) => {
            const reason = getUpgradeReason(upgrade)
            return (
            <article className="card" key={upgrade.id}>
              <CardMedia imageUrl={upgrade.imageUrl} imageAlt={upgrade.imageAlt} fallbackLabel={upgrade.title} size="compact" />
              <div className="card-topline">
                <h3>{upgrade.title}</h3>
                <span>{money(upgrade.cost)}</span>
              </div>
              <p>{upgrade.description}</p>
              <div className="action-stack">
                <div className="action-section">
                  <button className="mini-button" disabled={!!reason} onClick={() => dispatch({ type: 'BUY_UPGRADE', upgradeId: upgrade.id })} title={reason}>
                    {state.upgrades.includes(upgrade.id) ? 'Owned' : 'Buy Upgrade'}
                  </button>
                  <p className="action-hint">
                    {reason ? `Blocked: ${reason}.` : 'Primary move: upgrades are best when they make an existing lane more efficient, not just because cash is available.'}
                  </p>
                </div>
              </div>
            </article>
          )})}
        </div>
      </div>
    </section>
  )
}
