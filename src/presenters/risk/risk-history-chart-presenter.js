import { LEVELS, levelFor } from '#/presenters/risk/risk-display.js'
import { formatDisplayDate } from '#/plugins/template-renderer/filters/format-date.js'

const CHART_TITLE = 'Risk level over time'
const WINDOW_MONTHS = 12
const DISPLAY_TIME_ZONE = 'Europe/London'
const LINE_COLOUR = '#1d70b8'
const OUTLINE_COLOUR = '#0b0c0c'
const LINE_WIDTH = 3
const MARKER_SIZE = 14
const MARKER_OUTLINE_WIDTH = 2
const FONT_SIZE = 16
// Labels every other month still touch at 320px and in the half-width card at
// tablet widths, so label every third month.
const MONTH_TICK_STEP = 3
const GRID_COLOUR = '#b1b4b6'
const BACKGROUND_COLOUR = '#ffffff'
const FONT_FAMILY = 'Arial, sans-serif'
const YEAR_LABEL_OFFSET = -34
// The left margin is a minimum: the y axis grows it to fit its tick labels.
const MARGIN = { l: 10, r: 40, t: 20, b: 80 }
// Longer than the marker radius, so a marker on the window start cannot
// cover a y tick label.
const Y_TICK_LENGTH = 10
const CHART_HEIGHT = 400
// Half a level of space above and below, so edge markers are not clipped.
const Y_AXIS_PADDING = 0.5
const TABLE_NOTE = 'The full history is in the table below.'
const LABEL_BELOW = 'bottom center'
const LABEL_BESIDE = 'top right'
// Beside-right labels would run off the plot at the end of the window.
const LABEL_BESIDE_NEAR_END = 'top left'

const markerLabelFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: DISPLAY_TIME_ZONE,
  day: 'numeric',
  month: 'short'
})

/**
 * Formats a date the way Plotly's date axes read it (UTC).
 * @param {Date} date
 * @returns {string}
 */
const toPlotlyDate = (date) => date.toISOString().slice(0, 19).replace('T', ' ')

/**
 * Builds the 12-month window ending in the month of the latest assessment.
 * @param {Date} latest
 * @returns {{start: Date, end: Date}}
 */
const windowFor = (latest) => {
  const year = latest.getUTCFullYear()
  const month = latest.getUTCMonth()

  return {
    start: new Date(Date.UTC(year, month - (WINDOW_MONTHS - 1), 1)),
    end: new Date(Date.UTC(year, month + 1, 1))
  }
}

/**
 * Lists the month ticks that fall inside the window (the end is exclusive, so
 * it never gets a tick).
 * @param {Date} start
 * @param {Date} end
 * @returns {string[]}
 */
const buildMonthTicks = (start, end) =>
  Array.from({ length: Math.ceil(WINDOW_MONTHS / MONTH_TICK_STEP) }, (_, i) =>
    Date.UTC(
      start.getUTCFullYear(),
      start.getUTCMonth() + i * MONTH_TICK_STEP,
      1
    )
  )
    .filter((tick) => tick < end)
    .map((tick) => toPlotlyDate(new Date(tick)))

/**
 * Picks where a marker's date label sits.
 * @param {{stepDown: boolean, date: Date}} point
 * @param {Date} end - right edge of the window
 * @returns {string}
 */
const labelPositionFor = ({ stepDown, date }, end) => {
  if (stepDown) {
    return LABEL_BELOW
  }

  const lastMonthStart = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 1, 1)
  )

  return date >= lastMonthStart ? LABEL_BESIDE_NEAR_END : LABEL_BESIDE
}

/**
 * Validates the timeline and turns it into points, oldest first. Each point
 * knows whether its level stepped down from the assessment before it.
 * Formatting the date here makes an invalid date throw (fail loud).
 * @param {object[]} timeline - newest first
 * @returns {{level: object, date: Date, dateText: string, stepDown: boolean}[]}
 */
const toPoints = (timeline) => {
  // Reverse first: the sort is stable, so assessments that share a date stay
  // oldest first and the current assessment ends up last.
  const chronological = timeline
    .map(({ status, dateReported }) => {
      const level = levelFor(status)
      const dateText = formatDisplayDate(dateReported)

      return { level, date: new Date(dateReported), dateText }
    })
    .reverse()
    .sort((a, b) => a.date - b.date)

  return chronological.map((point, index) => ({
    ...point,
    stepDown:
      index > 0 && point.level.number < chronological[index - 1].level.number
  }))
}

/**
 * Builds the step line (when there is something to connect) and the markers.
 * @param {{level: object, date: Date, stepDown: boolean}[]} points - oldest first
 * @param {Date} start - left edge of the window
 * @param {Date} end - right edge of the window
 * @returns {object[]} Plotly traces
 */
const buildTraces = (points, start, end) => {
  const inWindow = points.filter(({ date }) => date >= start)
  const before = points.filter(({ date }) => date < start).at(-1)
  const markers = {
    type: 'scatter',
    mode: 'markers+text',
    x: inWindow.map(({ date }) => toPlotlyDate(date)),
    y: inWindow.map(({ level }) => level.number),
    text: inWindow.map(({ date }) => markerLabelFormatter.format(date)),
    textposition: inWindow.map((point) => labelPositionFor(point, end)),
    textfont: { size: FONT_SIZE, color: OUTLINE_COLOUR },
    cliponaxis: false,
    hoverinfo: 'skip',
    marker: {
      size: MARKER_SIZE,
      color: inWindow.map(({ level }) => level.colour),
      line: { color: OUTLINE_COLOUR, width: MARKER_OUTLINE_WIDTH }
    }
  }

  if (points.length < 2) {
    return [markers]
  }

  const steps = [
    ...(before ? [{ ...before, date: start }] : []),
    ...inWindow,
    { ...points.at(-1), date: end }
  ]
  const line = {
    type: 'scatter',
    mode: 'lines',
    x: steps.map(({ date }) => toPlotlyDate(date)),
    y: steps.map(({ level }) => level.number),
    hoverinfo: 'skip',
    line: { shape: 'hv', color: LINE_COLOUR, width: LINE_WIDTH }
  }

  return [line, markers]
}

/**
 * Lists the level changes in order. A change is "back" when it returns to the
 * level held before the previous change.
 * @param {{level: object, dateText: string}[]} points - oldest first
 * @returns {{from: object, to: object, dateText: string, back: boolean}[]}
 */
const findChanges = (points) => {
  const changes = []

  for (let index = 1; index < points.length; index++) {
    const { level, dateText } = points[index]
    const from = points[index - 1].level

    if (level !== from) {
      changes.push({
        from,
        to: level,
        dateText,
        back: changes.at(-1)?.from === level
      })
    }
  }

  return changes
}

/**
 * Phrases the changes as one sentence ending, e.g. "changed from Low to
 * Medium on 1 June 2026 and back to Low on 1 July 2026".
 * @param {{from: object, to: object, dateText: string, back: boolean}[]} changes
 * @returns {string}
 */
const describeChanges = (changes) => {
  const phrases = changes.map(({ from, to, dateText, back }, index) => {
    const move = back ? 'back to' : 'to'
    const lead = index === 0 ? `changed from ${from.label} to` : move

    return `${lead} ${to.label} on ${dateText}`
  })
  const last = phrases.pop()

  return phrases.length ? `${phrases.join(', ')} and ${last}` : last
}

/**
 * Builds the text alternative for the chart, from every assessment.
 * @param {{level: object, dateText: string}[]} points - oldest first
 * @returns {string}
 */
const buildDescription = (points) => {
  const [first] = points
  const changes = findChanges(points)
  let summary

  if (points.length === 1) {
    summary = `Risk level is ${first.level.label}, assessed on ${first.dateText}.`
  } else if (!changes.length) {
    summary = `Risk level has been ${first.level.label} since ${first.dateText}.`
  } else {
    summary = `Risk level ${describeChanges(changes)}.`
  }

  return `${summary} ${TABLE_NOTE}`
}

/**
 * Builds one centred year label per calendar year that the window touches.
 * @param {Date} start
 * @param {Date} end
 * @returns {object[]} Plotly annotations
 */
const buildYearLabels = (start, end) => {
  const labels = []

  for (
    let year = start.getUTCFullYear();
    year <= end.getUTCFullYear();
    year++
  ) {
    const from = Math.max(start, Date.UTC(year, 0, 1))
    const to = Math.min(end, Date.UTC(year + 1, 0, 1))

    if (to > from) {
      labels.push({
        text: String(year),
        x: toPlotlyDate(new Date((from + to) / 2)),
        xref: 'x',
        yref: 'paper',
        y: 0,
        yanchor: 'top',
        yshift: YEAR_LABEL_OFFSET,
        showarrow: false,
        font: { size: FONT_SIZE }
      })
    }
  }

  return labels
}

/**
 * Builds the Plotly layout.
 * @param {Date} start
 * @param {Date} end
 * @returns {object}
 */
const buildLayout = (start, end) => {
  const levels = Object.values(LEVELS).sort((a, b) => a.number - b.number)

  return {
    height: CHART_HEIGHT,
    margin: { ...MARGIN },
    font: { family: FONT_FAMILY, size: FONT_SIZE, color: OUTLINE_COLOUR },
    paper_bgcolor: BACKGROUND_COLOUR,
    plot_bgcolor: BACKGROUND_COLOUR,
    hovermode: false,
    showlegend: false,
    transition: { duration: 0 },
    xaxis: {
      type: 'date',
      range: [toPlotlyDate(start), toPlotlyDate(end)],
      tickmode: 'array',
      tickvals: buildMonthTicks(start, end),
      tickformat: '%b',
      tickangle: 0,
      showgrid: false,
      zeroline: false,
      fixedrange: true
    },
    yaxis: {
      range: [
        levels[0].number - Y_AXIS_PADDING,
        levels.at(-1).number + Y_AXIS_PADDING
      ],
      tickvals: levels.map(({ number }) => number),
      ticktext: levels.map(({ label }) => label),
      automargin: true,
      ticks: 'outside',
      ticklen: Y_TICK_LENGTH,
      tickcolor: BACKGROUND_COLOUR,
      showgrid: true,
      gridcolor: GRID_COLOUR,
      zeroline: false,
      fixedrange: true
    },
    annotations: buildYearLabels(start, end)
  }
}

/**
 * Maps a timeline to the view model of the `riskHistoryChart` component.
 * Pure data: no DOM and no Plotly import. Unknown statuses and invalid dates
 * throw (fail loud), as in the other risk presenters.
 * @param {object[]} timeline - `RiskAssessment` items, newest first
 * @returns {{title: string, spec: object} | null} null when there is nothing to draw
 */
export const riskHistoryChartPresenter = (timeline) => {
  if (!timeline.length) {
    return null
  }

  const points = toPoints(timeline)
  const { start, end } = windowFor(points.at(-1).date)

  return {
    title: CHART_TITLE,
    description: buildDescription(points),
    spec: {
      data: buildTraces(points, start, end),
      layout: buildLayout(start, end),
      config: { staticPlot: true, displayModeBar: false, responsive: true }
    }
  }
}
