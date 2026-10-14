import { renderComponent } from '#test/helpers/component-helpers.js'

describe('Change arrow component', () => {
  describe('With an arrow', () => {
    let $arrow

    beforeEach(() => {
      $arrow = renderComponent('change-arrow', {
        arrow: '↑',
        modifier: 'red'
      })
    })

    test('Should render a single span hidden from assistive technology', () => {
      const $span = $arrow('span')

      expect($span).toHaveLength(1)
      expect($span.attr('aria-hidden')).toBe('true')
    })

    test('Should have the base and modifier classes', () => {
      const $span = $arrow('span')

      expect($span.hasClass('app-change-arrow')).toBe(true)
      expect($span.hasClass('app-change-arrow--red')).toBe(true)
    })

    test('Should contain the arrow character', () => {
      expect($arrow('span').text()).toBe('↑')
    })
  })

  describe('Without an arrow', () => {
    test.each([undefined, null, ''])(
      'Should render nothing when arrow is %p',
      (arrow) => {
        const $arrow = renderComponent('change-arrow', {
          arrow,
          modifier: 'grey'
        })

        expect($arrow('span')).toHaveLength(0)
        expect($arrow('body').text().trim()).toBe('')
      }
    )
  })

  describe('Hostile values', () => {
    test('Should not let a modifier break out of the class attribute', () => {
      const $arrow = renderComponent('change-arrow', {
        arrow: '↑',
        modifier: 'red" onclick="alert(1)'
      })
      const $span = $arrow('span')

      expect($span.attr('onclick')).toBeUndefined()
      expect(Object.keys($span.attr()).sort()).toEqual(['aria-hidden', 'class'])
      expect($span.attr('class')).toBe(
        'app-change-arrow app-change-arrow--red" onclick="alert(1)'
      )
    })

    test('Should escape an arrow value', () => {
      const $arrow = renderComponent('change-arrow', {
        arrow: '<script>alert(1)</script>',
        modifier: 'red'
      })

      expect($arrow('script')).toHaveLength(0)
      expect($arrow('span').text()).toBe('<script>alert(1)</script>')
      expect($arrow.html()).toContain('&lt;script&gt;')
    })
  })
})
