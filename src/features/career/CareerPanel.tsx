import { CardMedia } from '../../components/CardMedia'
import { SectionTabs } from '../../components/SectionTabs'
import { SectionToolbar, type ToolbarFilter } from '../../components/SectionToolbar'
import { useStoredUiState } from '../../components/useStoredUiState'
import { money } from '../../game/core/format'
import type { CareerFieldId, GameAction, GameState, Job, LadderTier } from '../../game/core/types'
import { canRunGig, canTakeJob, canTakeSideJob, getLockedReason, toWeeklyAmount } from '../../game/core/utils'
import { SECTION_THEMES } from '../../ui/sectionThemes'
import { EDUCATION_PROGRAMS } from '../education/data'
import { CAREER_FIELDS, CAREER_FIELD_MAP, COURSES, COURSE_MAP, GIGS, JOBS, JOB_MAP, LADDER_TIER_LABELS, SIDE_JOBS, UPGRADES } from './data'

type Props = {
  state: GameState
  dispatch: React.Dispatch<GameAction>
}

type CareerTab = 'fields' | 'jobs' | 'side-work' | 'gigs' | 'progression'
type FieldFilter = CareerFieldId | 'all'
type LadderFilter = LadderTier | 'all'

type CareerUiState = {
  tab: CareerTab
  search: string
  selectedField: FieldFilter
  ladderTier: LadderFilter
  schedule: 'all' | 'daytime' | 'evening' | 'weekend' | 'flex'
  sideMode: 'all' | 'active' | 'available'
  gigMode: 'all' | 'available'
  progressionMode: 'all' | 'courses' | 'programs' | 'upgrades'
}

const CAREER_DEFAULT: CareerUiState = {
  tab: 'fields',
  search: '',
  selectedField: 'all',
  ladderTier: 'all',
  schedule: 'all',
  sideMode: 'all',
  gigMode: 'all',
  progressionMode: 'all',
}

const CAREER_TABS = [
  { id: 'fields', label: 'Fields', kicker: 'Ladders' },
  { id: 'jobs', label: 'Jobs', kicker: 'Main lane' },
  { id: 'side-work', label: 'Side Work', kicker: 'Recurring' },
  { id: 'gigs', label: 'Gigs', kicker: 'Burst cash' },
  { id: 'progression', label: 'Progression', kicker: 'Courses and study' },
] as const

const FIELD_OPTIONS = [{ value: 'all', label: 'All fields' }, ...CAREER_FIELDS.map((field) => ({ value: field.id, label: field.label }))]
const LADDER_OPTIONS = [
  { value: 'all', label: 'All tiers' },
  { value: 'entry', label: 'Entry' },
  { value: 'skilled', label: 'Skilled' },
  { value: 'specialist', label: 'Specialist' },
  { value: 'manager', label: 'Manager' },
  { value: 'executive', label: 'Executive' },
]

function getSearchMatch(text: string, search: string) {
  if (!search.trim()) return true
  return text.toLowerCase().includes(search.trim().toLowerCase())
}

function getProgramReason(state: GameState, program: (typeof EDUCATION_PROGRAMS)[number], financing: 'cash' | 'student-loan') {
  const alreadyOwned =
    state.completedEducationPrograms.includes(program.id) ||
    (program.educationTier === 'certificate' && !!program.certificationReward && state.certifications.includes(program.certificationReward))

  if (alreadyOwned) return 'Already completed'
  if (state.educationEnrollment) return 'Finish your current program first'
  if (state.reputation < program.reputationRequired) return `Reach reputation ${program.reputationRequired}`
  if (program.programRequirements?.some((programId) => !state.completedEducationPrograms.includes(programId))) {
    const missingProgram = program.programRequirements.find((programId) => !state.completedEducationPrograms.includes(programId))
    const missingTitle = EDUCATION_PROGRAMS.find((item) => item.id === missingProgram)?.title ?? missingProgram
    return `Need ${missingTitle}`
  }
  if (program.certificationRequirements?.some((certificationId) => !state.certifications.includes(certificationId))) {
    const missingCertification = program.certificationRequirements.find((certificationId) => !state.certifications.includes(certificationId))
    return `Need ${COURSE_MAP[missingCertification ?? '']?.title ?? missingCertification}`
  }
  if (financing === 'cash' && state.cash < program.totalCost) return `Need ${money(program.totalCost)} cash`
  if (financing === 'student-loan' && !state.bankAccount) return 'Open a bank account first'
  return undefined
}

function getCourseReason(state: GameState, course: (typeof COURSES)[number]) {
  if (state.certifications.includes(course.id)) return 'Already studied'
  const lockedReason = getLockedReason(course.reputationRequired, [], state, false, course.programRequirements)
  if (lockedReason) return lockedReason
  if (state.cash < course.cost) return `Need ${money(course.cost)} cash`
  if (state.actionPoints <= 0) return 'No actions left this week'
  if (state.energy < 12) return 'Need at least 12 energy'
  return undefined
}

function getUpgradeReason(state: GameState, upgrade: (typeof UPGRADES)[number]) {
  if (state.upgrades.includes(upgrade.id)) return 'Already owned'
  if (state.cash < upgrade.cost) return `Need ${money(upgrade.cost)} cash`
  return undefined
}

function getSideJobReason(state: GameState, sideJob: (typeof SIDE_JOBS)[number]) {
  const baseReason = getLockedReason(sideJob.reputationRequired, sideJob.certifications, state, false, sideJob.programRequirements)
  if (baseReason) return baseReason
  if (sideJob.bankAccountRequired && !state.bankAccount) return 'Need a bank account'
  if (sideJob.seasonMonths && !sideJob.seasonMonths.includes(((state.month - 1) % 12) + 1)) return 'Out of season'
  const conflicting = state.sideJobIds
    .map((id) => SIDE_JOBS.find((job) => job.id === id))
    .find((job) => job && job.schedule === sideJob.schedule)
  if (conflicting) return `Conflicts with ${conflicting.title}`
  return undefined
}

function getFieldJobs(fieldId: CareerFieldId) {
  return JOBS.filter((job) => job.careerField === fieldId)
}

function getFieldNextJob(fieldId: CareerFieldId, currentJob?: Job | null) {
  const jobs = getFieldJobs(fieldId)
  if (currentJob && currentJob.careerField === fieldId) {
    const preferred = currentJob.nextJobIds?.map((id) => JOB_MAP[id]).filter(Boolean) ?? []
    if (preferred.length > 0) return preferred[0]
  }
  return jobs.find((job) => job.id !== currentJob?.id) ?? null
}

function getFieldProgress(state: GameState, fieldId: CareerFieldId) {
  const currentJob = JOB_MAP[state.jobId] ?? null
  const currentInField = currentJob?.careerField === fieldId ? currentJob : null
  const certifications = COURSES.filter((course) => course.careerField === fieldId && state.certifications.includes(course.id))
  const completedPrograms = EDUCATION_PROGRAMS.filter((program) => program.careerField === fieldId && state.completedEducationPrograms.includes(program.id))
  const nextJob = getFieldNextJob(fieldId, currentInField)
  const blocker = nextJob ? getLockedReason(nextJob.reputationRequired, nextJob.certifications, state, false, nextJob.programRequirements) : null
  return {
    currentInField,
    certifications,
    completedPrograms,
    nextJob,
    blocker,
  }
}

function getFieldHint(fieldId: CareerFieldId, progress: ReturnType<typeof getFieldProgress>) {
  if (progress.currentInField) {
    return `You are already working in this field through ${progress.currentInField.title}.`
  }
  if (progress.completedPrograms.length > 0 || progress.certifications.length > 0) {
    return 'You already have some training here, so the next rung is closer than it looks.'
  }
  return CAREER_FIELD_MAP[fieldId].description
}

function getNextStepLabel(job: Job | null) {
  if (!job) return 'No higher rung yet'
  return `${job.title} (${LADDER_TIER_LABELS[job.ladderTier ?? 'entry']})`
}

function getNextSteps(job: Job) {
  return (job.nextJobIds ?? []).map((jobId) => JOB_MAP[jobId]).filter(Boolean)
}

function groupByField<T extends { careerField: CareerFieldId }>(items: T[], selectedField: FieldFilter) {
  if (selectedField !== 'all') {
    return [{ field: CAREER_FIELD_MAP[selectedField], items: items.filter((item) => item.careerField === selectedField) }]
  }
  return CAREER_FIELDS.map((field) => ({
    field,
    items: items.filter((item) => item.careerField === field.id),
  })).filter((group) => group.items.length > 0)
}

export function CareerPanel({ state, dispatch }: Props) {
  const theme = SECTION_THEMES.career
  const [ui, setUi] = useStoredUiState<CareerUiState>('street-to-stock-career-ui-v2', CAREER_DEFAULT)
  const currentJob = JOB_MAP[state.jobId] ?? JOBS[0]

  const jobs = JOBS.filter((job) => {
    if (ui.selectedField !== 'all' && job.careerField !== ui.selectedField) return false
    if (ui.ladderTier !== 'all' && job.ladderTier !== ui.ladderTier) return false
    return getSearchMatch(`${job.title} ${job.description} ${CAREER_FIELD_MAP[job.careerField].label}`, ui.search)
  })

  const sideJobs = SIDE_JOBS.filter((sideJob) => {
    if (ui.selectedField !== 'all' && sideJob.careerField !== ui.selectedField) return false
    if (!getSearchMatch(`${sideJob.title} ${sideJob.description} ${sideJob.schedule} ${sideJob.category}`, ui.search)) return false
    if (ui.schedule !== 'all' && sideJob.schedule !== ui.schedule) return false
    if (ui.sideMode === 'active' && !state.sideJobIds.includes(sideJob.id)) return false
    if (ui.sideMode === 'available' && !canTakeSideJob(state, sideJob)) return false
    return true
  })

  const gigs = GIGS.filter((gig) => {
    if (ui.selectedField !== 'all' && gig.careerField !== ui.selectedField) return false
    if (!getSearchMatch(`${gig.title} ${gig.description}`, ui.search)) return false
    if (ui.gigMode === 'available' && !canRunGig(state, gig)) return false
    return true
  })

  const progressionCards = [
    ...(ui.progressionMode !== 'programs' && ui.progressionMode !== 'upgrades'
      ? COURSES.filter((course) => {
          if (ui.selectedField !== 'all' && course.careerField !== ui.selectedField) return false
          return getSearchMatch(`${course.title} ${course.description}`, ui.search)
        }).map((course) => ({ kind: 'course' as const, course }))
      : []),
    ...(ui.progressionMode !== 'courses' && ui.progressionMode !== 'upgrades'
      ? EDUCATION_PROGRAMS.filter((program) => {
          if (ui.selectedField !== 'all' && program.careerField !== ui.selectedField) return false
          return getSearchMatch(`${program.title} ${program.description}`, ui.search)
        }).map((program) => ({ kind: 'program' as const, program }))
      : []),
    ...(ui.progressionMode !== 'courses' && ui.progressionMode !== 'programs'
      ? UPGRADES.filter((upgrade) => getSearchMatch(`${upgrade.title} ${upgrade.description}`, ui.search)).map((upgrade) => ({ kind: 'upgrade' as const, upgrade }))
      : []),
  ]

  const filters: ToolbarFilter[] =
    ui.tab === 'fields'
      ? []
      : [
          {
            id: 'field',
            label: 'Field',
            type: 'select',
            value: ui.selectedField,
            options: FIELD_OPTIONS,
            onChange: (value) => setUi((current) => ({ ...current, selectedField: value as FieldFilter })),
          },
          ...(ui.tab === 'jobs'
            ? [
                {
                  id: 'ladder',
                  label: 'Tier',
                  type: 'select' as const,
                  value: ui.ladderTier,
                  options: LADDER_OPTIONS,
                  onChange: (value: string) => setUi((current) => ({ ...current, ladderTier: value as LadderFilter })),
                },
              ]
            : []),
          ...(ui.tab === 'side-work'
            ? [
                {
                  id: 'schedule',
                  label: 'Schedule',
                  type: 'select' as const,
                  value: ui.schedule,
                  options: [
                    { value: 'all', label: 'Any schedule' },
                    { value: 'daytime', label: 'Daytime' },
                    { value: 'evening', label: 'Evening' },
                    { value: 'weekend', label: 'Weekend' },
                    { value: 'flex', label: 'Flex' },
                  ],
                  onChange: (value: string) => setUi((current) => ({ ...current, schedule: value as CareerUiState['schedule'] })),
                },
                {
                  id: 'side-mode',
                  label: 'Mode',
                  type: 'select' as const,
                  value: ui.sideMode,
                  options: [
                    { value: 'all', label: 'All commitments' },
                    { value: 'active', label: 'Active only' },
                    { value: 'available', label: 'Available now' },
                  ],
                  onChange: (value: string) => setUi((current) => ({ ...current, sideMode: value as CareerUiState['sideMode'] })),
                },
              ]
            : []),
          ...(ui.tab === 'gigs'
            ? [
                {
                  id: 'gig-mode',
                  label: 'Mode',
                  type: 'select' as const,
                  value: ui.gigMode,
                  options: [
                    { value: 'all', label: 'All gigs' },
                    { value: 'available', label: 'Available now' },
                  ],
                  onChange: (value: string) => setUi((current) => ({ ...current, gigMode: value as CareerUiState['gigMode'] })),
                },
              ]
            : []),
          ...(ui.tab === 'progression'
            ? [
                {
                  id: 'progression-mode',
                  label: 'Mode',
                  type: 'select' as const,
                  value: ui.progressionMode,
                  options: [
                    { value: 'all', label: 'Courses, programs, upgrades' },
                    { value: 'courses', label: 'Courses only' },
                    { value: 'programs', label: 'Programs only' },
                    { value: 'upgrades', label: 'Upgrades only' },
                  ],
                  onChange: (value: string) => setUi((current) => ({ ...current, progressionMode: value as CareerUiState['progressionMode'] })),
                },
              ]
            : []),
        ]

  const summary =
    ui.tab === 'fields'
      ? `${CAREER_FIELDS.length} fields | ${ui.selectedField === 'all' ? 'all ladders' : CAREER_FIELD_MAP[ui.selectedField].label}`
      : ui.tab === 'jobs'
        ? `${jobs.length} jobs | ${ui.selectedField === 'all' ? 'all fields' : CAREER_FIELD_MAP[ui.selectedField].label}`
        : ui.tab === 'side-work'
          ? `${sideJobs.length} side roles | ${ui.selectedField === 'all' ? 'all fields' : CAREER_FIELD_MAP[ui.selectedField].label}`
          : ui.tab === 'gigs'
            ? `${gigs.length} gigs | ${ui.selectedField === 'all' ? 'all fields' : CAREER_FIELD_MAP[ui.selectedField].label}`
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
          <h2>Fields, ladders, and cleaner work</h2>
        </div>
        <p>Work is no longer one flat list. Pick a field, climb its ladder step by step, and use side work, certifications, and longer study to unlock the better rungs.</p>
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
        searchValue={ui.tab === 'fields' ? '' : ui.search}
        searchPlaceholder={ui.tab === 'jobs' ? 'Search jobs and ladders' : ui.tab === 'progression' ? 'Search courses and programs' : 'Search work options'}
        onSearchChange={ui.tab === 'fields' ? undefined : (value) => setUi((current) => ({ ...current, search: value }))}
        filters={filters}
        summary={summary}
      />

      {ui.tab === 'fields' ? (
        <div className="card-grid">
          {CAREER_FIELDS.map((field) => {
            const progress = getFieldProgress(state, field.id)
            const isSelected = ui.selectedField === field.id
            return (
              <article className={`card ${isSelected ? 'current' : ''}`} key={field.id}>
                <CardMedia imageUrl={field.imageUrl} imageAlt={field.imageAlt} fallbackLabel={field.label} size="compact" />
                <div className="card-topline">
                  <h3>{field.label}</h3>
                  <span>{progress.currentInField ? 'Active' : 'Open'}</span>
                </div>
                <p>{getFieldHint(field.id, progress)}</p>
                <div className="tag-row">
                  <span className="tag">{progress.currentInField ? progress.currentInField.title : 'No current role'}</span>
                  <span className="tag">Next {getNextStepLabel(progress.nextJob)}</span>
                  {progress.certifications.length > 0 ? <span className="tag">{progress.certifications.length} certs</span> : null}
                  {progress.completedPrograms.length > 0 ? <span className="tag">{progress.completedPrograms.length} programs</span> : null}
                </div>
                <p>{progress.blocker ? `Blocker: ${progress.blocker}` : progress.nextJob ? `${progress.nextJob.title} is in reach if you want to push this field next.` : 'You are already near the top of this lane.'}</p>
                <div className="action-row">
                  <button className="mini-button" onClick={() => setUi((current) => ({ ...current, selectedField: field.id, tab: 'jobs' }))}>
                    Focus field
                  </button>
                  {isSelected ? (
                    <button className="mini-button ghost" onClick={() => setUi((current) => ({ ...current, selectedField: 'all' }))}>
                      Clear focus
                    </button>
                  ) : null}
                </div>
              </article>
            )
          })}
        </div>
      ) : null}

      {ui.tab === 'jobs' ? (
        <>
          <article className="card current">
            <div className="card-topline">
              <h3>{currentJob.title}</h3>
              <span>{CAREER_FIELD_MAP[currentJob.careerField].label}</span>
            </div>
            <div className="tag-row">
              <span className="tag">{LADDER_TIER_LABELS[currentJob.ladderTier ?? 'entry']}</span>
              <span className="tag">Base {money(currentJob.salary)}/mo</span>
              {getNextSteps(currentJob).map((job) => (
                <span className="tag" key={job.id}>
                  Next: {job.title}
                </span>
              ))}
            </div>
            <p>{currentJob.description}</p>
          </article>

          {groupByField(jobs, ui.selectedField).map((group) => (
            <div key={group.field.id}>
              {ui.selectedField === 'all' ? <div className="panel-header compact"><div><span className="panel-kicker">{group.field.label}</span><h3>{group.field.description}</h3></div></div> : null}
              <div className="card-grid">
                {group.items.map((job) => {
                  const lockedReason = getLockedReason(job.reputationRequired, job.certifications, state, false, job.programRequirements)
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
                        <span className="tag">{LADDER_TIER_LABELS[job.ladderTier ?? 'entry']}</span>
                        <span className="tag">Rep {job.reputationRequired}+</span>
                        {job.certifications.map((certificationId) => (
                          <span className="tag" key={certificationId}>
                            {COURSE_MAP[certificationId]?.title ?? certificationId}
                          </span>
                        ))}
                        {(job.programRequirements ?? []).map((programId) => {
                          const program = EDUCATION_PROGRAMS.find((item) => item.id === programId)
                          return <span className="tag" key={programId}>{program?.title ?? programId}</span>
                        })}
                      </div>
                      {job.nextJobIds?.length ? (
                        <p>Leads to {job.nextJobIds.map((jobId) => JOB_MAP[jobId]?.title ?? jobId).join(' or ')}.</p>
                      ) : null}
                      <button className="mini-button" disabled={!canTakeJob(state, job)} onClick={() => dispatch({ type: 'TAKE_JOB', jobId: job.id })} title={lockedReason ?? undefined}>
                        {isCurrent ? 'Current Job' : 'Take Job'}
                      </button>
                    </article>
                  )
                })}
              </div>
            </div>
          ))}
        </>
      ) : null}

      {ui.tab === 'side-work' ? (
        groupByField(sideJobs, ui.selectedField).map((group) => (
          <div key={group.field.id}>
            {ui.selectedField === 'all' ? <div className="panel-header compact"><div><span className="panel-kicker">{group.field.label}</span><h3>Recurring side work</h3></div></div> : null}
            <div className="card-grid">
              {group.items.map((sideJob) => {
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
                      <span className="tag">{sideJob.schedule}</span>
                      <span className="tag">{sideJob.commitment}</span>
                      <span className="tag">{LADDER_TIER_LABELS[sideJob.ladderTier ?? 'entry']}</span>
                      <span className="tag">Rep +{sideJob.reputationGain}</span>
                      {sideJob.knowledgeGain ? <span className="tag">Knowledge +{sideJob.knowledgeGain}</span> : null}
                      {seasonLabel ? <span className="tag">Season {seasonLabel}</span> : null}
                    </div>
                    <p>Feeds into {(sideJob.nextJobIds ?? []).map((jobId) => JOB_MAP[jobId]?.title ?? jobId).join(' or ')}.</p>
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
          </div>
        ))
      ) : null}

      {ui.tab === 'gigs' ? (
        groupByField(gigs, ui.selectedField).map((group) => (
          <div key={group.field.id}>
            {ui.selectedField === 'all' ? <div className="panel-header compact"><div><span className="panel-kicker">{group.field.label}</span><h3>One-off gigs</h3></div></div> : null}
            <div className="card-grid">
              {group.items.map((gig) => {
                const lockedReason = getLockedReason(gig.reputationRequired, gig.certifications, state, gig.needsProperty, gig.programRequirements)
                return (
                  <article className="card" key={gig.id}>
                    <CardMedia imageUrl={gig.imageUrl} imageAlt={gig.imageAlt} fallbackLabel={gig.title} size="compact" />
                    <div className="card-topline">
                      <h3>{gig.title}</h3>
                      <span>{money(gig.payout)}</span>
                    </div>
                    <p>{gig.description}</p>
                    <div className="tag-row">
                      <span className="tag">{LADDER_TIER_LABELS[gig.ladderTier ?? 'entry']}</span>
                      <span className="tag">Rep {gig.reputationRequired}+</span>
                      {gig.needsProperty ? <span className="tag">Needs property</span> : null}
                    </div>
                    <p>Useful for {(gig.nextJobIds ?? []).map((jobId) => JOB_MAP[jobId]?.title ?? jobId).join(' or ')}.</p>
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
          </div>
        ))
      ) : null}

      {ui.tab === 'progression' ? (
        <div className="card-grid">
          {progressionCards.map((item) => {
            if (item.kind === 'course') {
              const reason = getCourseReason(state, item.course)
              return (
                <article className="card" key={item.course.id}>
                  <CardMedia imageUrl={item.course.imageUrl} imageAlt={item.course.imageAlt} fallbackLabel={item.course.title} size="compact" />
                  <div className="card-topline">
                    <h3>{item.course.title}</h3>
                    <span>{money(item.course.cost)}</span>
                  </div>
                  <p>{item.course.description}</p>
                  <div className="tag-row">
                    <span className="tag">{CAREER_FIELD_MAP[item.course.careerField].label}</span>
                    <span className="tag">{item.course.educationTier}</span>
                    {item.course.recommendedProgramIds?.slice(0, 2).map((programId) => {
                      const program = EDUCATION_PROGRAMS.find((entry) => entry.id === programId)
                      return <span className="tag" key={programId}>{program?.title ?? programId}</span>
                    })}
                  </div>
                  <button className="mini-button" disabled={!!reason} onClick={() => dispatch({ type: 'BUY_COURSE', courseId: item.course.id })} title={reason}>
                    {state.certifications.includes(item.course.id) ? 'Owned' : 'Study'}
                  </button>
                </article>
              )
            }

            if (item.kind === 'program') {
              const cashReason = getProgramReason(state, item.program, 'cash')
              const loanReason = getProgramReason(state, item.program, 'student-loan')
              const alreadyOwned =
                state.completedEducationPrograms.includes(item.program.id) ||
                (item.program.educationTier === 'certificate' && !!item.program.certificationReward && state.certifications.includes(item.program.certificationReward))
              return (
                <article className={`card ${alreadyOwned ? 'current' : ''}`} key={item.program.id}>
                  <CardMedia imageUrl={item.program.imageUrl} imageAlt={item.program.imageAlt} fallbackLabel={item.program.title} size="compact" />
                  <div className="card-topline">
                    <h3>{item.program.title}</h3>
                    <span>{money(item.program.totalCost)}</span>
                  </div>
                  <p>{item.program.description}</p>
                  <div className="tag-row">
                    <span className="tag">{item.program.educationTier}</span>
                    <span className="tag">{item.program.durationMonths} mo</span>
                    <span className="tag">Rep {item.program.reputationRequired}+</span>
                    {(item.program.programRequirements ?? []).map((programId) => {
                      const program = EDUCATION_PROGRAMS.find((entry) => entry.id === programId)
                      return <span className="tag" key={programId}>{program?.title ?? programId}</span>
                    })}
                  </div>
                  <div className="action-row">
                    <button
                      className="mini-button"
                      disabled={!!cashReason}
                      onClick={() => dispatch({ type: 'ENROLL_EDUCATION', programId: item.program.id, financing: 'cash' })}
                      title={cashReason}
                    >
                      Pay Cash
                    </button>
                    <button
                      className="mini-button ghost"
                      disabled={!!loanReason}
                      onClick={() => dispatch({ type: 'ENROLL_EDUCATION', programId: item.program.id, financing: 'student-loan' })}
                      title={loanReason}
                    >
                      Student Loan
                    </button>
                  </div>
                </article>
              )
            }

            const reason = getUpgradeReason(state, item.upgrade)
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
