import { riskCardPresenter } from '#/presenters/risk/risk-card-presenter.js'
import { riskHistoryChartPresenter } from '#/presenters/risk/risk-history-chart-presenter.js'
import { riskHistoryTablePresenter } from '#/presenters/risk/risk-history-table-presenter.js'

const BACK_LINK = { text: 'Back to overview', href: '/risk' }

/**
 * Maps a `RiskDetail` to the view model of the disease detail page.
 *
 * `riskHistory` holds past assessments only, so the timeline is the current
 * assessment followed by the history, newest first. Unknown enum values and
 * invalid dates throw (fail loud) so the page never shows incorrect risk data.
 * @param {{id: string, disease: {name: string}, strain?: string, risk: object, riskHistory: object[]}} detail
 * @returns {{pageTitle: string, heading: string, backLink: {text: string, href: string}, latest: object, chart: object | null, table: object}}
 */
export const diseaseDetailPresenter = ({
  id,
  disease,
  strain,
  risk,
  riskHistory
}) => {
  const timeline = [risk, ...riskHistory]

  return {
    pageTitle: disease.name,
    heading: disease.name,
    backLink: { ...BACK_LINK },
    latest: riskCardPresenter(
      { id, disease, strain, risk },
      { variant: 'detail' }
    ),
    chart: riskHistoryChartPresenter(timeline),
    table: riskHistoryTablePresenter(disease.name, timeline)
  }
}
