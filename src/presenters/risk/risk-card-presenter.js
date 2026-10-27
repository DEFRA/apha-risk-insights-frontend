import { LEVELS, levelFor, tagFor } from '#/presenters/risk/risk-display.js'
import { formatDisplayDate } from '#/plugins/template-renderer/filters/format-date.js'

const NO_PREVIOUS_TEXT = 'No previous assessment'

const LEVEL_COUNT = Object.keys(LEVELS).length

/**
 * Maps an API `RiskSummary` to the params of the `riskCard` component.
 *
 * Draft/proof-of-concept behaviour: an unknown `status`, `previousStatus` or
 * `levelChange` throws, so a change to the API enums is noticed straight away.
 * Revisit this before production, for example by rendering a safe fallback.
 * @param {object} summary - a `RiskSummary` from the risk data source
 * @param {{variant?: 'detail'}} [options] - `detail` adds the fields the
 *   detail variant needs (`variant`, `source`, `previousLevel`)
 * @returns {object} display-ready params for `appRiskCard`
 */
export const riskCardPresenter = (
  { disease, strain, risk },
  { variant } = {}
) => {
  const level = levelFor(risk.status)
  const previousLevel = risk.previousStatus && levelFor(risk.previousStatus)
  const tag = tagFor(risk.levelChange)
  const previousLabel = previousLevel ? previousLevel.label : null

  const detailParams =
    variant === 'detail'
      ? {
          variant,
          source: risk.source,
          previousLevel: previousLabel
        }
      : {}

  return {
    ...detailParams,
    title: disease.name,
    href: `/risk/${disease.code.toLowerCase()}`,
    strain,
    levelLabel: level.label,
    levelNumber: level.number,
    levelMax: LEVEL_COUNT,
    levelKey: level.key,
    tag: { ...tag },
    previousText: previousLabel ?? NO_PREVIOUS_TEXT,
    dateTime: risk.dateReported,
    dateText: formatDisplayDate(risk.dateReported)
  }
}
