import { homePresenter } from '#/presenters/home/home-presenter.js'

describe('#homePresenter', () => {
  test('Should return the home page view model', () => {
    expect(homePresenter()).toEqual({
      pageTitle: 'APHA-risk insights frontend',
      heading: 'APHA-risk insights frontend',
      riskOverviewLink: { text: 'Risk overview', href: '/risk' }
    })
  })
})
