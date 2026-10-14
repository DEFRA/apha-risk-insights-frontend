/**
 * Display details shared by the risk presenters (card and history table).
 */

/**
 * Display details per `RiskStatus`. Bars use even steps, one to five.
 * `modifier` is the GOV.UK tag colour for the level. `colour` is the hex of the
 * matching `govuk-colour()` used by the risk card bars (`_risk-card.scss`), for
 * the chart markers, which cannot read Sass. A test pins the values.
 */
export const LEVELS = {
  negligible: {
    label: 'Negligible',
    number: 1,
    key: 'negligible',
    modifier: 'grey',
    colour: '#484949'
  },
  'very low': {
    label: 'Very low',
    number: 2,
    key: 'very-low',
    modifier: 'green',
    colour: '#0f7a52'
  },
  low: {
    label: 'Low',
    number: 3,
    key: 'low',
    modifier: 'yellow',
    colour: '#ffdd00'
  },
  medium: {
    label: 'Medium',
    number: 4,
    key: 'medium',
    modifier: 'orange',
    colour: '#f47738'
  },
  high: {
    label: 'High',
    number: 5,
    key: 'high',
    modifier: 'red',
    colour: '#ca3535'
  }
}

/** Tag details per `LevelChange`. Undetermined has no arrow. */
export const TAGS = {
  deteriorating: { text: 'Deteriorating', arrow: '↑', modifier: 'red' },
  'no change': { text: 'No change', arrow: '→', modifier: 'grey' },
  improving: { text: 'Improving', arrow: '↓', modifier: 'green' },
  undetermined: { text: 'Undetermined', modifier: 'grey' }
}

/**
 * Looks up a level, throwing for an unknown status (draft behaviour: a change
 * to the API enums is noticed straight away).
 * @param {string} status - a `RiskStatus`
 * @returns {typeof LEVELS[keyof typeof LEVELS]}
 */
export const levelFor = (status) => {
  const level = LEVELS[status]

  if (!level) {
    throw new Error(`Unknown risk status: ${status}`)
  }

  return level
}

/**
 * Looks up a level change tag, throwing for an unknown change.
 * @param {string} levelChange - a `LevelChange`
 * @returns {typeof TAGS[keyof typeof TAGS]}
 */
export const tagFor = (levelChange) => {
  const tag = TAGS[levelChange]

  if (!tag) {
    throw new Error(`Unknown level change: ${levelChange}`)
  }

  return tag
}
