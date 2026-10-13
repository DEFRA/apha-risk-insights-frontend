import { homePresenter } from '#/presenters/home/home-presenter.js'

describe('#homePresenter', () => {
  test('Should return the home page view model', () => {
    expect(homePresenter()).toEqual({
      pageTitle: 'Home',
      heading: 'Home'
    })
  })
})
