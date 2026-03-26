import type { KeyboardEvent } from 'react'

type TabDefinition = {
  id: string
  label: string
  kicker?: string
}

type Theme = {
  accent: string
  accentSoft: string
  glow: string
}

type Props = {
  sectionId: string
  activeTab: string
  onChange: (tabId: string) => void
  tabs: TabDefinition[]
  theme: Theme
}

export function SectionTabs({ sectionId, activeTab, onChange, tabs, theme }: Props) {
  const activeIndex = Math.max(0, tabs.findIndex((tab) => tab.id === activeTab))

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      onChange(tabs[(index + 1) % tabs.length].id)
      return
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      onChange(tabs[(index - 1 + tabs.length) % tabs.length].id)
      return
    }

    if (event.key === 'Home') {
      event.preventDefault()
      onChange(tabs[0].id)
      return
    }

    if (event.key === 'End') {
      event.preventDefault()
      onChange(tabs[tabs.length - 1].id)
    }
  }

  return (
    <nav
      className="section-tabs"
      aria-label={`${sectionId} subtabs`}
      role="tablist"
      style={
        {
          '--section-accent': theme.accent,
          '--section-accent-soft': theme.accentSoft,
          '--section-glow': theme.glow,
        } as React.CSSProperties
      }
    >
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          id={`${sectionId}-subtab-${tab.id}`}
          className={`section-tab ${tab.id === activeTab ? 'active' : ''}`}
          type="button"
          role="tab"
          aria-selected={tab.id === activeTab}
          aria-controls={`${sectionId}-panel-${tab.id}`}
          tabIndex={index === activeIndex ? 0 : -1}
          onClick={() => onChange(tab.id)}
          onKeyDown={(event) => handleKeyDown(event, index)}
        >
          {tab.kicker ? <span>{tab.kicker}</span> : null}
          <strong>{tab.label}</strong>
        </button>
      ))}
    </nav>
  )
}
