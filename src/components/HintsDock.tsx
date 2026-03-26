import { useState } from 'react'

const HINTS_STORAGE_KEY = 'street-to-stock-hints-v1'

const CONTROL_GROUPS = [
  {
    title: 'Navigate',
    items: [
      { key: 'Left / Right', detail: 'Switch top-level sections' },
      { key: '1-0 / -', detail: 'Jump straight to the first ten sections, then the final section' },
    ],
  },
  {
    title: 'Progress',
    items: [{ key: 'Space', detail: 'Advance one week' }],
  },
  {
    title: 'Quick Actions',
    items: [
      { key: 'A', detail: 'Run the main action for the current section' },
      { key: 'B', detail: 'Run the secondary action for the current section' },
    ],
  },
]

export function HintsDock() {
  const [hidden, setHidden] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(HINTS_STORAGE_KEY) === 'hidden'
  })

  const hideDock = () => {
    setHidden(true)
    window.localStorage.setItem(HINTS_STORAGE_KEY, 'hidden')
  }

  const showDock = () => {
    setHidden(false)
    window.localStorage.removeItem(HINTS_STORAGE_KEY)
  }

  if (hidden) {
    return (
      <button className="hints-reveal" type="button" onClick={showDock} aria-label="Show gameplay hints">
        Show Hints
      </button>
    )
  }

  return (
    <aside className="hints-dock" aria-label="Gameplay hints">
      <div className="hints-dock-header">
        <div>
          <span className="panel-kicker">Hints</span>
          <h2>Controls</h2>
        </div>
        <button className="secondary-button hints-dismiss" type="button" onClick={hideDock}>
          Hide
        </button>
      </div>

      <p className="hints-copy">Keep the interface clean and leave the shortcut reminders here when you need them.</p>

      <div className="hints-stack">
        {CONTROL_GROUPS.map((group) => (
          <section className="hint-card" key={group.title}>
            <strong>{group.title}</strong>
            <div className="hint-list">
              {group.items.map((item) => (
                <div className="hint-row" key={item.key}>
                  <span>{item.key}</span>
                  <p>{item.detail}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </aside>
  )
}
