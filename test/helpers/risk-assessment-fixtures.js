export const SOURCE = 'APHA risk assessment'

/**
 * Builds a `RiskAssessment` with sensible defaults.
 * @param {object} [overrides]
 * @returns {object}
 */
export const assessment = (overrides = {}) => ({
  status: 'high',
  previousStatus: 'medium',
  levelChange: 'deteriorating',
  source: SOURCE,
  dateReported: '2026-10-01T00:00:00Z',
  ...overrides
})

/** Three assessments, newest first, covering each kind of previous level. */
export const hpaiTimeline = [
  assessment(),
  assessment({
    status: 'medium',
    previousStatus: 'high',
    levelChange: 'improving',
    dateReported: '2026-06-15T00:00:00Z'
  }),
  assessment({
    status: 'high',
    previousStatus: null,
    levelChange: 'undetermined',
    dateReported: '2026-01-09T00:00:00Z'
  })
]
