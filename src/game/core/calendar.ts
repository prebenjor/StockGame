export function getCalendarYear(month: number) {
  return Math.floor((month - 1) / 12) + 1
}

export function getMonthInYear(month: number) {
  return ((month - 1) % 12) + 1
}

export function formatCalendarLabel(month: number, weekOfMonth: number) {
  return `Year ${getCalendarYear(month)} / Month ${getMonthInYear(month)} / W${weekOfMonth}`
}
