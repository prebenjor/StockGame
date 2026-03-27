import { CardMedia } from '../../components/CardMedia'
import { SectionTabs } from '../../components/SectionTabs'
import { SectionToolbar, type ToolbarFilter } from '../../components/SectionToolbar'
import { useStoredUiState } from '../../components/useStoredUiState'
import { money } from '../../game/core/format'
import type { GameAction, GameState } from '../../game/core/types'
import { canRunGig, canTakeJob, canTakeSideJob, getLockedReason, hasUpgrade, toWeeklyAmount } from '../../game/core/utils'
import { SECTION_THEMES } from '../../ui/sectionThemes'
import { COURSES, COURSE_MAP, GIGS, JOBS, SIDE_JOBS, UPGRADES } from './data'

type Props = {
  state: GameState
  dispatch: React.Dispatch<GameAction>
}

type CareerTab = 'jobs' | 'side-work' | 'gigs' | 'progression'

type CareerUiState = {
  tab: CareerTab
  search: string
  schedule: 'all' | 'daytime' | 'evening' | 'weekend' | 'flex'
  sideMode: 'all' | 'active' | 'available'
  gigMode: 'all' | 'available'
  progressionMode: 'all' | 'courses' | 'upgrades'
}

const CAREER_DEFAULT: CareerUiState = {
  tab: 'jobs',
  search: '',
  schedule: 'all',
  sideMode: 'all',
  gigMode: 'all',
  progressionMode: 'all',
}

const CAREER_TABS = [
  { id: 'jobs', label: 'Jobs', kicker: 'Main lane' },
  { id: 'side-work', label: 'Side Work', kicker: 'Recurring' },
  { id: 'gigs', label: 'Gigs', kicker: 'Burst cash' },
  { id: 'progression', label: 'Progression', kicker: 'Courses and gear' },
] as const

function getSearchMatch(text: string, search: string) {
  if (!search.trim()) return true
  return text.toLowerCase().includes(search.trim().toLowerCase())
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
  const theme = SECTION_THEMES.career
  const [ui, setUi] = useStoredUiState<CareerUiState>('street-to-stock-career-ui-v1', CAREER_DEFAULT)

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

  const jobs = JOBS.filter((job) => getSearchMatch(`${job.title} ${job.description}`, ui.search))
  const sideJobs = SIDE_JOBS.filter((sideJob) => {
    if (!getSearchMatch(`${sideJob.title} ${sideJob.description} ${sideJob.schedule} ${sideJob.category}`, ui.search)) return false
    if (ui.schedule !== 'all' && sideJob.schedule !== ui.schedule) return false
    if (ui.sideMode === 'active' && !state.sideJobIds.includes(sideJob.id)) return false
    if (ui.sideMode === 'available' && !canTakeSideJob(state, sideJob)) return false
    return true
  })
  const gigs = GIGS.filter((gig) => {
    if (!getSearchMatch(`${gig.title} ${gig.description}`, ui.search)) return false
    if (ui.gigMode === 'available' && !canRunGig(state, gig)) return false
    return true
  })
  const progressionCards = [
    ...(ui.progressionMode !== 'upgrades'
      ? COURSES.filter((course) => getSearchMatch(`${course.title} ${course.description}`, ui.search)).map((course) => ({ kind: 'course' as const, course }))
      : []),
    ...(ui.progressionMode !== 'courses'
      ? UPGRADES.filter((upgrade) => getSearchMatch(`${upgrade.title} ${upgrade.description}`, ui.search)).map((upgrade) => ({ kind: 'upgrade' as const, upgrade }))
      : []),
  ]

  const filters: ToolbarFilter[] =
    ui.tab === 'side-work'
      ? [
          {
            id: 'schedule',
            label: 'Schedule',
            type: 'select',
            value: ui.schedule,
            options: [
              { value: 'all', label: 'Any schedule' },
              { value: 'daytime', label: 'Daytime' },
              { value: 'evening', label: 'Evening' },
              { value: 'weekend', label: 'Weekend' },
              { value: 'flex', label: 'Flex' },
            ],
            onChange: (value) => setUi((current) => ({ ...current, schedule: value as CareerUiState['schedule'] })),
          },
          {
            id: 'side-mode',
            label: 'Mode',
            type: 'select',
            value: ui.sideMode,
            options: [
              { value: 'all', label: 'All commitments' },
              { value: 'active', label: 'Active only' },
              { value: 'available', label: 'Available now' },
            ],
            onChange: (value) => setUi((current) => ({ ...current, sideMode: value as CareerUiState['sideMode'] })),
          },
        ]
      : ui.tab === 'gigs'
        ? [
            {
              id: 'gig-mode',
              label: 'Mode',
              type: 'select',
              value: ui.gigMode,
              options: [
                { value: 'all', label: 'All gigs' },
                { value: 'available', label: 'Available now' },
              ],
              onChange: (value) => setUi((current) => ({ ...current, gigMode: value as CareerUiState['gigMode'] })),
            },
          ]
        : ui.tab === 'progression'
          ? [
              {
                id: 'progression-mode',
                label: 'Mode',
                type: 'select',
                value: ui.progressionMode,
                options: [
                  { value: 'all', label: 'Courses and upgrades' },
                  { value: 'courses', label: 'Courses only' },
                  { value: 'upgrades', label: 'Upgrades only' },
                ],
                onChange: (value) => setUi((current) => ({ ...current, progressionMode: value as CareerUiState['progressionMode'] })),
              },
            ]
          : []

  const summary =
    ui.tab === 'jobs'
      ? `${jobs.length} job tracks`
      : ui.tab === 'side-work'
        ? `${sideJobs.length} side roles | ${ui.schedule === 'all' ? 'all schedules' : ui.schedule}`
        : ui.tab === 'gigs'
          ? `${gigs.length} one-off gigs`
          : `${progressionCards.length} progression options`

  return (
    <section
      className="panel section-panel career-panel"
      data-ui-section="career"
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
          <span className="panel-kicker">Career</span>
          <h2>Work lanes and compounding skill</h2>
        </div>
        <p>This is where you piece together a living. Pick a main job, add steady side work, use gigs when you need a burst of cash, and study when you want a cleaner lane later.</p>
      </div>

      <SectionTabs
        sectionId="career"
        activeTab={ui.tab}
        onChange={(tabId) => setUi((current) => ({ ...current, tab: tabId as CareerTab }))}
        tabs={CAREER_TABS as unknown as Array<{ id: string; label: string; kicker?: string }>}
        theme={theme}
      />

      <SectionToolbar
        sectionId="career"
        searchValue={ui.search}
        searchPlaceholder={ui.tab === 'jobs' ? 'Search jobs' : ui.tab === 'progression' ? 'Search courses and upgrades' : 'Search work options'}
        onSearchChange={(value) => setUi((current) => ({ ...current, search: value }))}
        filters={filters}
        summary={summary}
      />

      {ui.tab === 'jobs' ? (
        <div className="card-grid">
          {jobs.map((job) => {
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
                <button className="mini-button" disabled={!canTakeJob(state, job)} onClick={() => dispatch({ type: 'TAKE_JOB', jobId: job.id })} title={lockedReason ?? undefined}>
                  {isCurrent ? 'Current Job' : 'Take Job'}
                </button>
              </article>
            )
          })}
        </div>
      ) : null}

      {ui.tab === 'side-work' ? (
        <div className="card-grid">
          {sideJobs.map((sideJob) => {
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
                </div>
                <div className="action-row">
                  <button
                    id={`add-side-job-${sideJob.id}`}
                    className="mini-button"
                    disabled={!canTakeSideJob(state, sideJob)}
                    onClick={() => dispatch({ type: 'TAKE_SIDE_JOB', sideJobId: sideJob.id })}
                    title={lockedReason}
                  >
                    {isCurrent ? 'Active' : 'Add Commitment'}
                  </button>
                  <button
                    id={`drop-side-job-${sideJob.id}`}
                    className="mini-button ghost"
                    disabled={!isCurrent}
                    onClick={() => dispatch({ type: 'DROP_SIDE_JOB', sideJobId: sideJob.id })}
                    title={!isCurrent ? 'Not currently active' : undefined}
                  >
                    Drop
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      ) : null}

      {ui.tab === 'gigs' ? (
        <div className="card-grid">
          {gigs.map((gig) => {
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
                <button
                  id={`run-gig-${gig.id}`}
                  className="mini-button"
                  disabled={!canRunGig(state, gig)}
                  onClick={() => dispatch({ type: 'RUN_GIG', gigId: gig.id })}
                  title={lockedReason ?? undefined}
                >
                  Run Gig
                </button>
              </article>
            )
          })}
        </div>
      ) : null}

      {ui.tab === 'progression' ? (
        <div className="card-grid">
          {progressionCards.map((item) => {
            if (item.kind === 'course') {
              const reason = getCourseReason(item.course)
              return (
                <article className="card" key={item.course.id}>
                  <CardMedia imageUrl={item.course.imageUrl} imageAlt={item.course.imageAlt} fallbackLabel={item.course.title} size="compact" />
                  <div className="card-topline">
                    <h3>{item.course.title}</h3>
                    <span>{money(item.course.cost)}</span>
                  </div>
                  <p>{item.course.description}</p>
                  <button className="mini-button" disabled={!!reason} onClick={() => dispatch({ type: 'BUY_COURSE', courseId: item.course.id })} title={reason}>
                    {state.certifications.includes(item.course.id) ? 'Owned' : 'Study'}
                  </button>
                </article>
              )
            }

            const reason = getUpgradeReason(item.upgrade)
            return (
              <article className="card" key={item.upgrade.id}>
                <CardMedia imageUrl={item.upgrade.imageUrl} imageAlt={item.upgrade.imageAlt} fallbackLabel={item.upgrade.title} size="compact" />
                <div className="card-topline">
                  <h3>{item.upgrade.title}</h3>
                  <span>{money(item.upgrade.cost)}</span>
                </div>
                <p>{item.upgrade.description}</p>
                <button className="mini-button" disabled={!!reason} onClick={() => dispatch({ type: 'BUY_UPGRADE', upgradeId: item.upgrade.id })} title={reason}>
                  {state.upgrades.includes(item.upgrade.id) ? 'Owned' : 'Buy Upgrade'}
                </button>
              </article>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}
