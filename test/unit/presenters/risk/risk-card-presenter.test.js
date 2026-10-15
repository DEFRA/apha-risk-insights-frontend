import { riskCardPresenter } from '#/presenters/risk/risk-card-presenter.js'

const buildSummary = (overrides = {}) => ({
  id: '80d1d0e4-381f-4a68-887b-fd5c5556943d',
  disease: { name: 'Highly Pathogenic Avian Influenza' },
  strain: 'H5N1',
  risk: {
    status: 'high',
    previousStatus: 'medium',
    levelChange: 'deteriorating',
    source: 'Sample source',
    dateReported: '2026-10-01T00:00:00Z'
  },
  ...overrides
})

const buildWithRisk = (risk) => {
  const summary = buildSummary()
  return buildSummary({ risk: { ...summary.risk, ...risk } })
}

describe('#riskCardPresenter', () => {
  test('Should throw for an unknown risk status (draft behaviour)', () => {
    expect(() =>
      riskCardPresenter(buildWithRisk({ status: 'severe' }))
    ).toThrow('Unknown risk status: severe')
  })

  test('Should throw for an unknown previous status', () => {
    expect(() =>
      riskCardPresenter(buildWithRisk({ previousStatus: 'severe' }))
    ).toThrow('Unknown risk status: severe')
  })

  test('Should throw for an unknown level change (draft behaviour)', () => {
    expect(() =>
      riskCardPresenter(buildWithRisk({ levelChange: 'sideways' }))
    ).toThrow('Unknown level change: sideways')
  })

  test('Should omit the strain when it is absent', () => {
    const params = riskCardPresenter(buildSummary({ strain: undefined }))

    expect(params.strain).toBeUndefined()
  })

  test('Should say there is no previous assessment when previousStatus is null', () => {
    const params = riskCardPresenter(buildWithRisk({ previousStatus: null }))

    expect(params.previousText).toBe('No previous assessment')
  })

  test('Should have no arrow for an undetermined level change', () => {
    const { tag } = riskCardPresenter(
      buildWithRisk({ levelChange: 'undetermined', previousStatus: null })
    )

    expect(tag).toEqual({ text: 'Undetermined', modifier: 'grey' })
  })

  test.each([
    ['negligible', 'Negligible', 1, 'negligible'],
    ['very low', 'Very low', 2, 'very-low'],
    ['low', 'Low', 3, 'low'],
    ['medium', 'Medium', 4, 'medium'],
    ['high', 'High', 5, 'high']
  ])(
    'Should map status %s to label, bar count and colour key',
    (status, label, bars, colourKey) => {
      const params = riskCardPresenter(buildWithRisk({ status }))

      expect(params.levelLabel).toBe(label)
      expect(params.levelNumber).toBe(bars)
      expect(params.levelKey).toBe(colourKey)
    }
  )

  test.each([
    ['deteriorating', { text: 'Deteriorating', arrow: '↑', modifier: 'red' }],
    ['no change', { text: 'No change', arrow: '→', modifier: 'grey' }],
    ['improving', { text: 'Improving', arrow: '↓', modifier: 'green' }]
  ])('Should map level change %s to the tag', (levelChange, tag) => {
    expect(riskCardPresenter(buildWithRisk({ levelChange })).tag).toEqual(tag)
  })

  test('Should format the reported date in Europe/London', () => {
    const { dateText, dateTime } = riskCardPresenter(
      buildWithRisk({ dateReported: '2026-06-30T23:30:00Z' })
    )

    expect(dateText).toBe('1 July 2026')
    expect(dateTime).toBe('2026-06-30T23:30:00Z')
  })

  test.each([[undefined], ['not a date']])(
    'Should throw a labelled error for dateReported %s',
    (dateReported) => {
      expect(() => riskCardPresenter(buildWithRisk({ dateReported }))).toThrow(
        'Invalid date:'
      )
    }
  )

  test('Should link by disease name only so all strains share one link', () => {
    const h5n1 = riskCardPresenter(buildSummary({ strain: 'H5N1' }))
    const h5n8 = riskCardPresenter(buildSummary({ strain: 'H5N8' }))

    expect(h5n1.href).toBe('/risk/highly-pathogenic-avian-influenza')
    expect(h5n8.href).toBe('/risk/highly-pathogenic-avian-influenza')
  })

  test('Should not include the disease code in the output', () => {
    const params = riskCardPresenter(
      buildSummary({
        disease: { code: 'HPAI', name: 'Highly Pathogenic Avian Influenza' }
      })
    )

    expect(JSON.stringify(params)).not.toContain('HPAI')
  })

  test('Should fall back to the id when the name gives no slug', () => {
    const { href } = riskCardPresenter(
      buildSummary({ disease: { name: '!!!' }, strain: undefined })
    )

    expect(href).toBe('/risk/80d1d0e4-381f-4a68-887b-fd5c5556943d')
  })

  test('Should map a full RiskSummary to card params', () => {
    expect(riskCardPresenter(buildSummary())).toEqual({
      title: 'Highly Pathogenic Avian Influenza',
      href: '/risk/highly-pathogenic-avian-influenza',
      strain: 'H5N1',
      levelLabel: 'High',
      levelNumber: 5,
      levelMax: 5,
      levelKey: 'high',
      tag: { text: 'Deteriorating', arrow: '↑', modifier: 'red' },
      previousText: 'Medium',
      dateTime: '2026-10-01T00:00:00Z',
      dateText: '1 October 2026'
    })
  })

  describe('detail variant', () => {
    test('Should add variant, source and previous level', () => {
      const params = riskCardPresenter(buildSummary(), { variant: 'detail' })

      expect(params).toMatchObject({
        variant: 'detail',
        source: 'Sample source',
        previousLevel: 'Medium'
      })
    })

    test('Should give a null previous level when previousStatus is null', () => {
      const params = riskCardPresenter(
        buildWithRisk({ previousStatus: null }),
        {
          variant: 'detail'
        }
      )

      expect(params.previousLevel).toBeNull()
    })

    test('Should leave the default output without detail fields', () => {
      const params = riskCardPresenter(buildSummary())

      expect(params).not.toHaveProperty('variant')
      expect(params).not.toHaveProperty('source')
      expect(params).not.toHaveProperty('previousLevel')
    })
  })
})
