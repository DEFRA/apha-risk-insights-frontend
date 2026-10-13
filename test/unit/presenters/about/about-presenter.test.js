import { aboutPresenter } from '#/presenters/about/about-presenter.js'

describe('#aboutPresenter', () => {
  test('Should return the about page view model', () => {
    expect(aboutPresenter()).toEqual({
      pageTitle: 'About',
      heading: 'About',
      breadcrumbs: [{ text: 'Home', href: '/' }, { text: 'About' }]
    })
  })
})
