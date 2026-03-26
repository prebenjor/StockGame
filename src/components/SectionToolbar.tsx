type SelectOption = {
  value: string
  label: string
}

export type ToolbarFilter =
  | {
      id: string
      label: string
      type: 'toggle'
      checked: boolean
      onChange: (checked: boolean) => void
    }
  | {
      id: string
      label: string
      type: 'select'
      value: string
      options: SelectOption[]
      onChange: (value: string) => void
    }

type Props = {
  sectionId: string
  searchValue?: string
  searchPlaceholder?: string
  onSearchChange?: (value: string) => void
  filters?: ToolbarFilter[]
  sortOptions?: SelectOption[]
  sortValue?: string
  onSortChange?: (value: string) => void
  summary?: string
}

export function SectionToolbar({
  sectionId,
  searchValue,
  searchPlaceholder = 'Search',
  onSearchChange,
  filters = [],
  sortOptions = [],
  sortValue,
  onSortChange,
  summary,
}: Props) {
  const hasControls = !!onSearchChange || filters.length > 0 || (sortOptions.length > 0 && onSortChange)
  if (!hasControls && !summary) return null

  return (
    <div className="section-toolbar" data-toolbar-summary={summary ?? ''}>
      <div className="section-toolbar-controls">
        {onSearchChange ? (
          <label className="toolbar-search" htmlFor={`${sectionId}-search`}>
            <span className="sr-only">{searchPlaceholder}</span>
            <input
              id={`${sectionId}-search`}
              type="search"
              value={searchValue ?? ''}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
            />
          </label>
        ) : null}

        {filters.map((filter) => {
          if (filter.type === 'toggle') {
            return (
              <label className="toolbar-chip" key={filter.id} htmlFor={`${sectionId}-filter-${filter.id}`}>
                <input
                  id={`${sectionId}-filter-${filter.id}`}
                  type="checkbox"
                  checked={filter.checked}
                  onChange={(event) => filter.onChange(event.target.checked)}
                />
                <span>{filter.label}</span>
              </label>
            )
          }

          return (
            <label className="toolbar-select" key={filter.id} htmlFor={`${sectionId}-filter-${filter.id}`}>
              <span>{filter.label}</span>
              <select
                id={`${sectionId}-filter-${filter.id}`}
                value={filter.value}
                onChange={(event) => filter.onChange(event.target.value)}
              >
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          )
        })}

        {sortOptions.length > 0 && onSortChange ? (
          <label className="toolbar-select sort" htmlFor={`${sectionId}-sort`}>
            <span>Sort</span>
            <select id={`${sectionId}-sort`} value={sortValue} onChange={(event) => onSortChange(event.target.value)}>
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {summary ? <p className="toolbar-summary">{summary}</p> : null}
    </div>
  )
}
