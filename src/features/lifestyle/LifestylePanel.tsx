import { money } from '../../game/core/format'
import { getLifestyleSwitchCost, getLivingCost } from '../../game/core/utils'
import type { FoodTier, GameAction, GameState, HousingTier, TransportTier, WellnessTier } from '../../game/core/types'
import { FOOD_OPTIONS, HOUSING_OPTIONS, TRANSPORT_OPTIONS, WELLNESS_OPTIONS } from './data'

type Props = {
  state: GameState
  dispatch: React.Dispatch<GameAction>
}

type LifestyleCardProps<T extends HousingTier | TransportTier | FoodTier | WellnessTier> = {
  title: string
  currentId: T
  options: Array<{ id: T; title: string; monthlyCost: number; description: string }>
  category: 'housing' | 'transport' | 'food' | 'wellness'
  state: GameState
  dispatch: React.Dispatch<GameAction>
}

function LifestyleCard<T extends HousingTier | TransportTier | FoodTier | WellnessTier>({
  title,
  currentId,
  options,
  category,
  state,
  dispatch,
}: LifestyleCardProps<T>) {
  return (
    <article className="card">
      <div className="card-topline">
        <h3>{title}</h3>
        <span>{money(options.find((option) => option.id === currentId)?.monthlyCost ?? 0)}/mo</span>
      </div>
      <div className="card-grid compact">
        {options.map((option) => {
          const switchCost = getLifestyleSwitchCost(state, category, option.id)
          const isCurrent = option.id === currentId
          return (
            <div className="lifestyle-option" key={option.id}>
              <div className="card-topline">
                <strong>{option.title}</strong>
                <span>{money(option.monthlyCost)}/mo</span>
              </div>
              <p>{option.description}</p>
              <div className="tag-row">
                <span className="tag">{switchCost === 0 ? 'Current' : `Switch ${money(switchCost)}`}</span>
              </div>
              <button
                className="mini-button"
                disabled={isCurrent || state.cash < switchCost}
                onClick={() => dispatch({ type: 'SET_LIFESTYLE', category, tier: option.id })}
              >
                {isCurrent ? 'Current' : 'Switch'}
              </button>
            </div>
          )
        })}
      </div>
    </article>
  )
}

export function LifestylePanel({ state, dispatch }: Props) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <span className="panel-kicker">Lifestyle</span>
          <h2>Personal survival layer</h2>
        </div>
        <p>Nothing is locked, but your housing, transport, food, and recovery setup decide how punishing the climb feels.</p>
      </div>

      <div className="card-grid">
        <article className="card current">
          <div className="card-topline">
            <h3>Banking</h3>
            <span>{state.bankAccount ? 'Active' : 'Unbanked'}</span>
          </div>
          <p>
            {state.bankAccount
              ? 'You have a basic account, which keeps trading fees and financing friction under control.'
              : 'You can still trade and hustle, but fees are worse and financing is more predatory until you open an account.'}
          </p>
          <div className="tag-row">
            <span className="tag">Living Cost {money(getLivingCost(state))}/mo</span>
            <span className="tag">Bank Trust {state.bankTrust}</span>
          </div>
          <button className="mini-button" disabled={state.bankAccount || state.actionPoints <= 0 || state.cash < 25} onClick={() => dispatch({ type: 'OPEN_BANK_ACCOUNT' })}>
            {state.bankAccount ? 'Opened' : 'Open Account'}
          </button>
        </article>
      </div>

      <div className="dual-grid">
        <LifestyleCard title="Housing" currentId={state.housingTier} options={HOUSING_OPTIONS} category="housing" state={state} dispatch={dispatch} />
        <LifestyleCard title="Transport" currentId={state.transportTier} options={TRANSPORT_OPTIONS} category="transport" state={state} dispatch={dispatch} />
        <LifestyleCard title="Food" currentId={state.foodTier} options={FOOD_OPTIONS} category="food" state={state} dispatch={dispatch} />
        <LifestyleCard title="Recovery" currentId={state.wellnessTier} options={WELLNESS_OPTIONS} category="wellness" state={state} dispatch={dispatch} />
      </div>
    </section>
  )
}
