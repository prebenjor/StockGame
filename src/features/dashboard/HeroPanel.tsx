type RailView = {
  id: string
  label: string
  kicker: string
  accent: string
  accentSoft: string
  glow: string
}

type Props = {
  activeView: string
  views: RailView[]
  viewRefs: React.MutableRefObject<Array<HTMLButtonElement | null>>
  onSelectView: (viewId: string) => void
  onViewKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => void
  mobileDrawerOpen: boolean
  onCloseDrawer: () => void
}

export function HeroPanel({
  activeView,
  views,
  viewRefs,
  onSelectView,
  onViewKeyDown,
  mobileDrawerOpen,
  onCloseDrawer,
}: Props) {
  return (
    <aside className="side-nav-shell" aria-label="Section navigation">
      <div className="side-nav-topline">
        <div>
          <span className="panel-kicker">Sections</span>
          <h1>Game map</h1>
        </div>
        <button className="secondary-button rail-close" type="button" onClick={onCloseDrawer}>
          Close
        </button>
      </div>

      <nav className="side-nav-list" aria-label="Game sections" role="tablist">
        {views.map((view, index) => (
          <button
            key={view.id}
            ref={(element) => {
              viewRefs.current[index] = element
            }}
            className={`side-nav-item ${activeView === view.id ? 'active' : ''}`}
            onClick={() => onSelectView(view.id)}
            onKeyDown={(event) => onViewKeyDown(event, index)}
            type="button"
            role="tab"
            id={`tab-${view.id}`}
            aria-selected={activeView === view.id}
            aria-controls={`panel-${view.id}`}
            tabIndex={activeView === view.id ? 0 : -1}
            style={
              {
                '--chip-accent': view.accent,
                '--chip-accent-soft': view.accentSoft,
                '--chip-glow': view.glow,
              } as React.CSSProperties
            }
            data-mobile-open={mobileDrawerOpen ? 'true' : 'false'}
          >
            <span>{view.kicker}</span>
            <strong>{view.label}</strong>
          </button>
        ))}
      </nav>
    </aside>
  )
}
