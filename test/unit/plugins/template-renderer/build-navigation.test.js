import { buildNavigation } from '#/plugins/template-renderer/build-navigation.js'

function mockRequest(options) {
  return { ...options }
}

describe('#buildNavigation', () => {
  test('Should provide expected navigation details', () => {
    expect(
      buildNavigation(mockRequest({ path: '/non-existent-path' }))
    ).toEqual([
      { current: false, text: 'Home', href: '/' },
      { current: false, text: 'Risk overview', href: '/risk' }
    ])
  })

  test('Should highlight Home on the home page', () => {
    expect(buildNavigation(mockRequest({ path: '/' }))).toEqual([
      { current: true, text: 'Home', href: '/' },
      { current: false, text: 'Risk overview', href: '/risk' }
    ])
  })

  test('Should highlight Risk overview on the risk page', () => {
    expect(buildNavigation(mockRequest({ path: '/risk' }))).toEqual([
      { current: false, text: 'Home', href: '/' },
      { current: true, text: 'Risk overview', href: '/risk' }
    ])
  })

  test('Should not include an About page', () => {
    expect(buildNavigation(mockRequest({ path: '/' }))).not.toContainEqual(
      expect.objectContaining({ href: '/about' })
    )
  })
})
