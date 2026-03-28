import { CardMedia } from '../../components/CardMedia'
import { SectionTabs } from '../../components/SectionTabs'
import { SectionToolbar, type ToolbarFilter } from '../../components/SectionToolbar'
import { useStoredUiState } from '../../components/useStoredUiState'
import { money } from '../../game/core/format'
import type { CareerFieldId, EducationTier, GameAction, GameState } from '../../game/core/types'
import { SECTION_THEMES } from '../../ui/sectionThemes'
import { CAREER_FIELDS, CAREER_FIELD_MAP, COURSE_MAP } from '../career/data'
import { EDUCATION_PROGRAMS } from './data'

type Props = {
  state: GameState
  dispatch: React.Dispatch<GameAction>
}

type EducationTab = 'profile' | 'programs'
type FieldFilter = CareerFieldId | 'all'
type TierFilter = EducationTier | 'all'

type EducationUiState = {
  tab: EducationTab
  search: string
  selectedField: FieldFilter
  tier: TierFilter
  affordability: 'all' | 'cash' | 'loan'
}

const EDUCATION_DEFAULT: EducationUiState = {
  tab: 'programs',
  search: '',
  selectedField: 'all',
  tier: 'all',
  affordability: 'all',
}

const EDUCATION_TABS = [
  { id: 'profile', label: 'Profile', kicker: 'Status' },
  { id: 'programs', label: 'Programs', kicker: 'Catalog' },
] as const

const FIELD_OPTIONS = [{ value: 'all', label: 'All fields' }, ...CAREER_FIELDS.map((field) => ({ value: field.id, label: field.label }))]
const TIER_OPTIONS = [
  { value: 'all', label: 'All tiers' },
  { value: 'certificate', label: 'Certificates' },
  { value: 'diploma', label: 'Diplomas' },
  { value: 'bachelor', label: 'Bachelor tracks' },
  { value: 'master', label: 'Master tracks' },
]

function getSearchMatch(text: string, search: string) {
  if (!search.trim()) return true
  return text.toLowerCase().includes(search.trim().toLowerCase())
}

function isProgramOwned(state: GameState, program: (typeof EDUCATION_PROGRAMS)[number]) {
  return state.completedEducationPrograms.includes(program.id) || (program.educationTier === 'certificate' && !!program.certificationReward && state.certifications.includes(program.certificationReward))
}

function getProgramReason(state: GameState, program: (typeof EDUCATION_PROGRAMS)[number], financing: 'cash' | 'student-loan') {
  if (state.educationEnrollment) return 'Finish your current program first'
  if (isProgramOwned(state, program)) return 'Already completed'
  if (state.reputation < program.reputationRequired) return `Reach reputation ${program.reputationRequired}`

  const missingProgram = program.programRequirements?.find((programId) => !state.completedEducationPrograms.includes(programId))
  if (missingProgram) {
    const title = EDUCATION_PROGRAMS.find((item) => item.id === missingProgram)?.title ?? missingProgram
    return `Need ${title}`
  }

  const missingCertification = program.certificationRequirements?.find((certificationId) => !state.certifications.includes(certificationId))
  if (missingCertification) {
    return `Need ${COURSE_MAP[missingCertification]?.title ?? missingCertification}`
  }

  if (financing === 'cash' && state.cash < program.totalCost) return `Need ${money(program.totalCost)} cash`
  if (financing === 'student-loan' && !state.bankAccount) return 'Open a bank account first'
  return undefined
}

export function EducationPanel({ state, dispatch }: Props) {
  const theme = SECTION_THEMES.education
  const [ui, setUi] = useStoredUiState<EducationUiState>('street-to-stock-education-ui-v2', EDUCATION_DEFAULT)

  const activeProgram = state.educationEnrollment ? EDUCATION_PROGRAMS.find((program) => program.id === state.educationEnrollment?.programId) ?? null : null

  const programs = EDUCATION_PROGRAMS.filter((program) => {
    if (ui.selectedField !== 'all' && program.careerField !== ui.selectedField) return false
    if (ui.tier !== 'all' && program.educationTier !== ui.tier) return false
    if (!getSearchMatch(`${program.title} ${program.description}`, ui.search)) return false
    const cashReason = getProgramReason(state, program, 'cash')
    const loanReason = getProgramReason(state, program, 'student-loan')
    if (ui.affordability === 'cash' && cashReason) return false
    if (ui.affordability === 'loan' && loanReason) return false
    return true
  })

  const filters: ToolbarFilter[] =
    ui.tab === 'programs'
      ? [
          {
            id: 'field',
            label: 'Field',
            type: 'select',
            value: ui.selectedField,
            options: FIELD_OPTIONS,
            onChange: (value) => setUi((current) => ({ ...current, selectedField: value as FieldFilter })),
          },
          {
            id: 'tier',
            label: 'Tier',
            type: 'select',
            value: ui.tier,
            options: TIER_OPTIONS,
            onChange: (value) => setUi((current) => ({ ...current, tier: value as TierFilter })),
          },
          {
            id: 'affordability',
            label: 'Filter',
            type: 'select',
            value: ui.affordability,
            options: [
              { value: 'all', label: 'All programs' },
              { value: 'cash', label: 'Cash-available' },
              { value: 'loan', label: 'Loan-available' },
            ],
            onChange: (value) => setUi((current) => ({ ...current, affordability: value as EducationUiState['affordability'] })),
          },
        ]
      : []

  const completedPrograms = EDUCATION_PROGRAMS.filter((program) => state.completedEducationPrograms.includes(program.id))
  const summary =
    ui.tab === 'profile'
      ? `${activeProgram?.title ?? 'no active program'} | ${completedPrograms.length} completed programs`
      : `${programs.length} programs in view`

  return (
    <section
      className="panel section-panel education-panel"
      data-ui-section="education"
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
          <span className="panel-kicker">Education</span>
          <h2>Credentials, diplomas, and degrees</h2>
        </div>
        <p>Short certificates still matter, but the cleaner upper lanes now want real diplomas, bachelor tracks, and sometimes expensive master-level follow-through.</p>
      </div>

      <SectionTabs
        sectionId="education"
        activeTab={ui.tab}
        onChange={(tabId) => setUi((current) => ({ ...current, tab: tabId as EducationTab }))}
        tabs={EDUCATION_TABS as unknown as Array<{ id: string; label: string; kicker?: string }>}
        theme={theme}
      />

      <SectionToolbar
        sectionId="education"
        searchValue={ui.tab === 'programs' ? ui.search : ''}
        searchPlaceholder="Search programs"
        onSearchChange={ui.tab === 'programs' ? (value) => setUi((current) => ({ ...current, search: value })) : undefined}
        filters={filters}
        summary={summary}
      />

      {ui.tab === 'profile' ? (
        <div className="dual-grid">
          <article className="card current">
            <div className="card-topline">
              <h3>Education profile</h3>
              <span>Knowledge {state.knowledge}</span>
            </div>
            <div className="ledger-grid">
              <div><span>Active program</span><strong>{activeProgram?.title ?? 'None'}</strong></div>
              <div><span>Months remaining</span><strong>{state.educationEnrollment?.monthsRemaining ?? 0}</strong></div>
              <div><span>Completed</span><strong>{completedPrograms.length}</strong></div>
              <div><span>Certifications</span><strong>{state.certifications.length}</strong></div>
            </div>
            <p>{activeProgram ? activeProgram.description : 'Formal study now has real tiers. A shorter certificate can open a lane, but bachelor and master tracks are where the expensive long-run payoffs live.'}</p>
          </article>

          <article className="card">
            <div className="card-topline">
              <h3>Completed stack</h3>
              <span>{completedPrograms.length + state.certifications.length}</span>
            </div>
            <div className="tag-row">
              {completedPrograms.length === 0 && state.certifications.length === 0 ? <span className="tag">No credentials yet</span> : null}
              {completedPrograms.map((program) => (
                <span className="tag" key={program.id}>
                  {program.title}
                </span>
              ))}
              {state.certifications.map((certificationId) => (
                <span className="tag" key={certificationId}>
                  {COURSE_MAP[certificationId]?.title ?? certificationId}
                </span>
              ))}
            </div>
            <p>{completedPrograms.length > 0 ? 'Your finished programs now matter directly for job gating, not just for flavor.' : 'The first finished diploma or bachelor will start changing which jobs are actually reachable.'}</p>
          </article>
        </div>
      ) : null}

      {ui.tab === 'programs' ? (
        <div className="card-grid">
          {programs.map((program) => {
            const cashReason = getProgramReason(state, program, 'cash')
            const loanReason = getProgramReason(state, program, 'student-loan')
            const owned = isProgramOwned(state, program)
            return (
              <article className={`card ${owned ? 'current' : ''}`} key={program.id}>
                <CardMedia imageUrl={program.imageUrl} imageAlt={program.imageAlt} fallbackLabel={program.title} size="compact" />
                <div className="card-topline">
                  <h3>{program.title}</h3>
                  <span>{money(program.totalCost)}</span>
                </div>
                <p>{program.description}</p>
                <div className="tag-row">
                  <span className="tag">{CAREER_FIELD_MAP[program.careerField].label}</span>
                  <span className="tag">{program.educationTier}</span>
                  <span className="tag">{program.durationMonths} mo</span>
                  <span className="tag">Rep {program.reputationRequired}+</span>
                  {(program.programRequirements ?? []).map((programId) => {
                    const requiredProgram = EDUCATION_PROGRAMS.find((entry) => entry.id === programId)
                    return <span className="tag" key={programId}>{requiredProgram?.title ?? programId}</span>
                  })}
                  {(program.certificationRequirements ?? []).map((certificationId) => (
                    <span className="tag" key={certificationId}>
                      {COURSE_MAP[certificationId]?.title ?? certificationId}
                    </span>
                  ))}
                  {program.certificationReward ? <span className="tag">{COURSE_MAP[program.certificationReward]?.title ?? program.certificationReward}</span> : null}
                </div>
                {program.recommendedProgramIds?.length ? (
                  <p>Feeds into {program.recommendedProgramIds.map((programId) => EDUCATION_PROGRAMS.find((entry) => entry.id === programId)?.title ?? programId).join(' or ')}.</p>
                ) : null}
                <div className="action-row">
                  <button
                    className="mini-button"
                    disabled={!!cashReason}
                    onClick={() => dispatch({ type: 'ENROLL_EDUCATION', programId: program.id, financing: 'cash' })}
                    title={cashReason}
                  >
                    Pay Cash
                  </button>
                  <button
                    className="mini-button ghost"
                    disabled={!!loanReason}
                    onClick={() => dispatch({ type: 'ENROLL_EDUCATION', programId: program.id, financing: 'student-loan' })}
                    title={loanReason}
                  >
                    Student Loan
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}
