import { riskCardPresenter } from '#/presenters/risk/risk-card-presenter.js'

const PAGE_TITLE = 'Disease risk overview'

/**
 * Formats data ready for presenting in the `/risk` page
 * @module riskPresenter
 * @param {{items: object[]}} riskPage - a `RiskPage` from the risk data source
 */
export const riskPresenter = ({ items }) => ({
  pageTitle: PAGE_TITLE,
  heading: PAGE_TITLE,
  breadcrumbs: [{ text: 'Home', href: '/' }, { text: PAGE_TITLE }],
  cards: items.map(riskCardPresenter)
})
