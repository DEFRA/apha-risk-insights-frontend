import { slugify } from '#/utils/slugify.js'
import { formatDisplayDate } from '#/plugins/template-renderer/filters/format-date.js'

const NO_PREVIOUS_TEXT = 'No previous assessment'

/** Display details per `RiskStatus`. Bars use even steps, one to five. */
const LEVELS = {
  negligible: { label: 'Negligible', number: 1, key: 'negligible' },
  'very low': { label: 'Very low', number: 2, key: 'very-low' },
  low: { label: 'Low', number: 3, key: 'low' },
  medium: { label: 'Medium', number: 4, key: 'medium' },
  high: { label: 'High', number: 5, key: 'high' }
}

const LEVEL_COUNT = Object.keys(LEVELS).length

/**
 * Link key for a risk: the slug of the disease name only. All strains are
 * grouped under one disease for now. Falls back to the id if the name does
 * not slugify.
 * @param {{id: string, disease: {name: string}}} summary
 * @returns {string}
 */
const riskKey = ({ id, disease }) => slugify(disease.name) || id

/** Tag details per `LevelChange`. Undetermined has no arrow. */
const TAGS = {
  deteriorating: { text: 'Deteriorating', arrow: '↑', modifier: 'red' },
  'no change': { text: 'No change', arrow: '→', modifier: 'grey' },
  improving: { text: 'Improving', arrow: '↓', modifier: 'green' },
  undetermined: { text: 'Undetermined', modifier: 'grey' }
}

/**
 * Maps an API `RiskSummary` to the params of the `riskCard` component.
 *
 * Draft/proof-of-concept behaviour: an unknown `status`, `previousStatus` or
 * `levelChange` throws, so a change to the API enums is noticed straight away.
 * Revisit this before production, for example by rendering a safe fallback.
 * @param {object} summary - a `RiskSummary` from the risk data source
 * @returns {object} display-ready params for `appRiskCard`
 */
export const riskCardPresenter = ({ id, disease, strain, risk }) => {
  const level = LEVELS[risk.status]
  const tag = TAGS[risk.levelChange]
  const previousLevel = risk.previousStatus && LEVELS[risk.previousStatus]

  if (!level) {
    throw new Error(`Unknown risk status: ${risk.status}`)
  }

  if (risk.previousStatus && !previousLevel) {
    throw new Error(`Unknown risk status: ${risk.previousStatus}`)
  }

  if (!tag) {
    throw new Error(`Unknown level change: ${risk.levelChange}`)
  }

  return {
    title: disease.name,
    href: `/risk/${riskKey({ id, disease })}`,
    strain,
    levelLabel: level.label,
    levelNumber: level.number,
    levelMax: LEVEL_COUNT,
    levelKey: level.key,
    tag: { ...tag },
    previousText: previousLevel ? previousLevel.label : NO_PREVIOUS_TEXT,
    dateTime: risk.dateReported,
    dateText: formatDisplayDate(risk.dateReported)
  }
}
