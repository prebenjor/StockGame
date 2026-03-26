import { EDUCATION_PROGRAMS } from './data'
import { money } from '../../game/core/format'
import type { GameAction, GameState } from '../../game/core/types'
import { COURSE_MAP } from '../career/data'

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

export function EducationPanel({ state, dispatch }: Props) {
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

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <span className="panel-kicker">Education</span>
          <h2>Programs and credentials</h2>
        </div>
        <p>Short courses still exist, but full programs now take time, build knowledge, and can be financed with student debt.</p>
      </div>

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
          {activeProgram ? (
            <p>{activeProgram.description}</p>
          ) : (
            <p>Education is now a slower compounding system. It hurts short-run runway but improves jobs, credentials, and long-run output.</p>
          )}
        </article>
      </div>

      <div className="card-grid">
        {EDUCATION_PROGRAMS.map((program) => {
          const alreadyOwned = program.certificationReward ? state.certifications.includes(program.certificationReward) : false
          const cashReason = getCashReason(program, alreadyOwned)
          const loanReason = getLoanReason(program, alreadyOwned)
          return (
            <article className="card" key={program.id}>
              <CardMedia imageUrl={program.imageUrl} imageAlt={program.imageAlt} />
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
              <div className="action-stack">
                <div className="action-section">
                  <span className="action-label">Primary Action</span>
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
                  <p className="action-hint">
                    {cashReason
                      ? `Blocked: ${cashReason}.`
                      : 'Primary move: pay cash if you can absorb the runway hit.'}
                  </p>
                </div>
                <div className="action-section">
                  <span className="action-label">Secondary Path</span>
                  <p className="action-hint">
                    {loanReason
                      ? `Loan path blocked: ${loanReason}.`
                      : 'Student loan keeps cash free, but you are trading runway pressure for debt later.'}
                  </p>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
