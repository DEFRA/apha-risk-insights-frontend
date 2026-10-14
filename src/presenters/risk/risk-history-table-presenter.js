import { levelFor, tagFor } from '#/presenters/risk/risk-display.js'
import { formatDisplayDate } from '#/plugins/template-renderer/filters/format-date.js'

const NO_PREVIOUS_LABEL = 'None'

/**
 * Maps one `RiskAssessment` to a table row of plain data. The template builds
 * the cells and escapes every value.
 * @param {object} assessment
 * @returns {object}
 */
const toRow = ({
  status,
  previousStatus,
  levelChange,
  source,
  dateReported
}) => {
  const { label, modifier } = levelFor(status)
  const change = tagFor(levelChange)

  return {
    dateTime: dateReported,
    dateText: formatDisplayDate(dateReported),
    level: { label, modifier },
    previousLabel: previousStatus
      ? levelFor(previousStatus).label
      : NO_PREVIOUS_LABEL,
    previousIsNone: !previousStatus,
    change: { ...change },
    source
  }
}

/**
 * Maps a timeline to the params of the `riskHistoryTable` component.
 * @param {string} diseaseName
 * @param {object[]} timeline - `RiskAssessment` items, newest first
 * @returns {{caption: string, rows: object[]}}
 */
export const riskHistoryTablePresenter = (diseaseName, timeline) => ({
  caption: `Assessment history for ${diseaseName}`,
  rows: timeline.map(toRow)
})
