export type SectionTheme = {
  accent: string
  accentSoft: string
  glow: string
  panelTint: string
  borderTone: string
  chartLine: string
  chartFill: string
}

export const SECTION_THEMES = {
  overview: {
    accent: '#cf7a18',
    accentSoft: 'rgba(255, 214, 150, 0.68)',
    glow: 'rgba(231, 143, 31, 0.24)',
    panelTint: 'rgba(255, 233, 192, 0.34)',
    borderTone: 'rgba(193, 121, 28, 0.3)',
    chartLine: '#cf7a18',
    chartFill: 'rgba(231, 143, 31, 0.18)',
  },
  career: {
    accent: '#9e5d1e',
    accentSoft: 'rgba(233, 196, 154, 0.72)',
    glow: 'rgba(174, 101, 31, 0.2)',
    panelTint: 'rgba(237, 211, 183, 0.34)',
    borderTone: 'rgba(158, 93, 30, 0.28)',
    chartLine: '#9e5d1e',
    chartFill: 'rgba(158, 93, 30, 0.16)',
  },
  education: {
    accent: '#346f8f',
    accentSoft: 'rgba(176, 214, 233, 0.7)',
    glow: 'rgba(57, 120, 160, 0.2)',
    panelTint: 'rgba(188, 220, 236, 0.34)',
    borderTone: 'rgba(52, 111, 143, 0.28)',
    chartLine: '#346f8f',
    chartFill: 'rgba(57, 120, 160, 0.16)',
  },
  lifestyle: {
    accent: '#51773d',
    accentSoft: 'rgba(193, 224, 172, 0.72)',
    glow: 'rgba(95, 148, 64, 0.2)',
    panelTint: 'rgba(206, 230, 187, 0.34)',
    borderTone: 'rgba(81, 119, 61, 0.28)',
    chartLine: '#51773d',
    chartFill: 'rgba(95, 148, 64, 0.15)',
  },
  personal: {
    accent: '#8a5b24',
    accentSoft: 'rgba(240, 214, 173, 0.74)',
    glow: 'rgba(193, 134, 63, 0.22)',
    panelTint: 'rgba(242, 225, 198, 0.36)',
    borderTone: 'rgba(138, 91, 36, 0.3)',
    chartLine: '#8a5b24',
    chartFill: 'rgba(193, 134, 63, 0.18)',
  },
  banking: {
    accent: '#145c55',
    accentSoft: 'rgba(167, 222, 213, 0.72)',
    glow: 'rgba(25, 128, 118, 0.2)',
    panelTint: 'rgba(189, 230, 224, 0.34)',
    borderTone: 'rgba(20, 92, 85, 0.3)',
    chartLine: '#145c55',
    chartFill: 'rgba(25, 128, 118, 0.16)',
  },
  market: {
    accent: '#1d6a8a',
    accentSoft: 'rgba(169, 216, 237, 0.72)',
    glow: 'rgba(35, 128, 171, 0.22)',
    panelTint: 'rgba(186, 224, 241, 0.36)',
    borderTone: 'rgba(29, 106, 138, 0.3)',
    chartLine: '#1d6a8a',
    chartFill: 'rgba(35, 128, 171, 0.18)',
  },
  property: {
    accent: '#7b4f95',
    accentSoft: 'rgba(214, 192, 231, 0.72)',
    glow: 'rgba(124, 83, 162, 0.2)',
    panelTint: 'rgba(223, 207, 236, 0.34)',
    borderTone: 'rgba(123, 79, 149, 0.28)',
    chartLine: '#7b4f95',
    chartFill: 'rgba(124, 83, 162, 0.16)',
  },
  business: {
    accent: '#974545',
    accentSoft: 'rgba(239, 194, 194, 0.72)',
    glow: 'rgba(171, 82, 82, 0.2)',
    panelTint: 'rgba(240, 207, 207, 0.34)',
    borderTone: 'rgba(151, 69, 69, 0.28)',
    chartLine: '#974545',
    chartFill: 'rgba(171, 82, 82, 0.16)',
  },
  network: {
    accent: '#a44e2f',
    accentSoft: 'rgba(242, 202, 179, 0.72)',
    glow: 'rgba(196, 101, 57, 0.2)',
    panelTint: 'rgba(245, 214, 194, 0.34)',
    borderTone: 'rgba(164, 78, 47, 0.28)',
    chartLine: '#a44e2f',
    chartFill: 'rgba(196, 101, 57, 0.16)',
  },
  ledger: {
    accent: '#5f5a8e',
    accentSoft: 'rgba(206, 202, 236, 0.72)',
    glow: 'rgba(103, 96, 173, 0.2)',
    panelTint: 'rgba(217, 214, 240, 0.34)',
    borderTone: 'rgba(95, 90, 142, 0.28)',
    chartLine: '#5f5a8e',
    chartFill: 'rgba(103, 96, 173, 0.16)',
  },
} as const satisfies Record<string, SectionTheme>
