const PAGE_TITLE = 'APHA-risk insights frontend'

/**
 * Formats data ready for presenting in the `/` page
 * @module homePresenter
 */
export const homePresenter = () => ({
  pageTitle: PAGE_TITLE,
  heading: PAGE_TITLE,
  riskOverviewLink: {
    text: 'Risk overview',
    href: '/risk'
  }
})
