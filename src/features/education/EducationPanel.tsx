import { CardMedia } from '../../components/CardMedia'
import { SectionTabs } from '../../components/SectionTabs'
import { SectionToolbar, type ToolbarFilter } from '../../components/SectionToolbar'
import { useStoredUiState } from '../../components/useStoredUiState'
import { money } from '../../game/core/format'
import type { GameAction, GameState } from '../../game/core/types'
import { SECTION_THEMES } from '../../ui/sectionThemes'
import { COURSE_MAP } from '../career/data'
import { EDUCATION_PROGRAMS } from './data'

type Props = {
  state: GameState
  dispatch: React.Dispatch<GameAction>
}

type EducationTab = 'profile' | 'programs'

type EducationUiState = {
  tab: EducationTab
  affordability: 'all' | 'cash' | 'loan'
  search: string
}

const EDUCATION_DEFAULT: EducationUiState = {
  tab: 'programs',
  affordability: 'all',
  search: '',
}

const EDUCATION_TABS = [
  { id: 'profile', label: 'Profile', kicker: 'Status' },
  { id: 'programs', label: 'Programs', kicker: 'Catalog' },
] as const

function getSearchMatch(text: string, search: string) {
  if (!search.trim()) return true
  return text.toLowerCase().includes(search.trim().toLowerCase())
}

export function EducationPanel({ state, dispatch }: Props) {
  const theme = SECTION_THEMES.education
  const [ui, setUi] = useStoredUiState<EducationUiState>('street-to-stock-education-ui-v1', EDUCATION_DEFAULT)

  const activeProgram = state.educationEnrollment
    ? EDUCATION_PROGRAMS.find((program) => program.id === state.educationEnrollment?.programId) ?? null
    : null

  const getCashReason = (program: (typeof EDUCATION_PROGRAMS)[number], alreadyOwned: boolean) => {
    if (state.educationEnrollment) return 'Finish your current program first'
    if (alreadyOwned) return 'You already earned this credential'
    if (state.reputation < program.reputationRequired) return `Reach reputation ${program.reputationRequired}`
    if (state.cash < program.totalCost) return `Need ${money(program.totalCost)} cash`
    return undefined
  }

  const getLoanReason = (program: (typeof EDUCATION_PROGRAMS)[number], alreadyOwned: boolean) => {
    if (state.educationEnrollment) return 'Finish your current program first'
    if (alreadyOwned) return 'You already earned this credential'
    if (!state.bankAccount) return 'Open a bank account first'
    if (state.reputation < program.reputationRequired) return `Reach reputation ${program.reputationRequired}`
    return undefined
  }

  const programs = EDUCATION_PROGRAMS.filter((program) => {
    if (!getSearchMatch(`${program.title} ${program.description}`, ui.search)) return false
    const alreadyOwned = program.certificationReward ? state.certifications.includes(program.certificationReward) : false
    const cashReason = getCashReason(program, alreadyOwned)
    const loanReason = getLoanReason(program, alreadyOwned)
    if (ui.affordability === 'cash' && cashReason) return false
    if (ui.affordability === 'loan' && loanReason) return false
    return true
  })

  const filters: ToolbarFilter[] =
    ui.tab === 'programs'
      ? [
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

  const summary =
    ui.tab === 'profile'
      ? `${activeProgram?.title ?? 'no active program'} | knowledge ${state.knowledge}`
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
          <h2>Programs and credentials</h2>
        </div>
        <p>Study is the slower path, but it is a real one. Use this area to see what you are already learning and what credentials are within reach next.</p>
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
              <div><span>Certifications</span><strong>{state.certifications.length}</strong></div>
            </div>
            <p>{activeProgram ? activeProgram.description : 'Education costs time and money up front, but it can open cleaner work and better long-term pay.'}</p>
          </article>

          <article className="card">
            <div className="card-topline">
              <h3>Credential stack</h3>
              <span>{state.certifications.length}</span>
            </div>
            <div className="tag-row">
              {state.certifications.length === 0 ? <span className="tag">No certifications yet</span> : null}
              {state.certifications.map((certificationId) => (
                <span className="tag" key={certificationId}>
                  {COURSE_MAP[certificationId]?.title ?? certificationId}
                </span>
              ))}
            </div>
          </article>
        </div>
      ) : null}

      {ui.tab === 'programs' ? (
        <div className="card-grid">
          {programs.map((program) => {
            const alreadyOwned = program.certificationReward ? state.certifications.includes(program.certificationReward) : false
            const cashReason = getCashReason(program, alreadyOwned)
            const loanReason = getLoanReason(program, alreadyOwned)
            return (
              <article className="card" key={program.id}>
                <CardMedia imageUrl={program.imageUrl} imageAlt={program.imageAlt} fallbackLabel={program.title} size="compact" />
                <div className="card-topline">
                  <h3>{program.title}</h3>
                  <span>{money(program.totalCost)}</span>
                </div>
                <p>{program.description}</p>
                <div className="tag-row">
                  <span className="tag">{program.durationMonths} mo</span>
                  <span className="tag">Rep {program.reputationRequired}+</span>
                  <span className="tag">Knowledge +{program.knowledgeReward}</span>
                  <span className="tag">Stress +{program.monthlyStress}/mo</span>
                  {program.certificationReward ? <span className="tag">{COURSE_MAP[program.certificationReward].title}</span> : null}
                </div>
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
