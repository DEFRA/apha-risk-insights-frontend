import { riskPresenter } from '#/presenters/risk/risk-presenter.js'

const summary = {
  id: 'abc',
  disease: { name: 'African Swine Fever' },
  risk: {
    status: 'medium',
    previousStatus: 'medium',
    levelChange: 'no change',
    source: 'Sample data',
    dateReported: '2026-08-28T00:00:00Z'
  }
}

describe('#riskPresenter', () => {
  test('Should return an empty card list when there are no risks', () => {
    expect(riskPresenter({ items: [] }).cards).toEqual([])
  })

  test('Should return the page view model with one card per risk', () => {
    const viewModel = riskPresenter({ items: [summary] })

    expect(viewModel).toEqual({
      pageTitle: 'Disease risk overview',
      heading: 'Disease risk overview',
      breadcrumbs: [
        { text: 'Home', href: '/' },
        { text: 'Disease risk overview' }
      ],
      cards: [
        expect.objectContaining({
          title: 'African Swine Fever',
          href: '/risk/african-swine-fever'
        })
      ]
    })
  })
})
