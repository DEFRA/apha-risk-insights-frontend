import { errorPresenter } from '#/presenters/errors/error-presenter.js'

describe('#errorPresenter', () => {
  test('Should return the error page view model', () => {
    expect(
      errorPresenter({ statusCode: 404, message: 'Page not found' })
    ).toEqual({
      pageTitle: 'Page not found',
      heading: 404,
      message: 'Page not found'
    })
  })
})
