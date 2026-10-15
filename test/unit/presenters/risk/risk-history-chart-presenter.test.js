import { riskHistoryChartPresenter } from '#/presenters/risk/risk-history-chart-presenter.js'
import {
  assessment,
  hpaiTimeline
} from '#test/helpers/risk-assessment-fixtures.js'

const at = (status, dateReported) => assessment({ status, dateReported })

describe('#riskHistoryChartPresenter', () => {
  describe('Without a usable timeline', () => {
    test('Should return no chart for no assessments', () => {
      expect(riskHistoryChartPresenter([])).toBeNull()
    })

    test('Should throw for an unknown status', () => {
      expect(() =>
        riskHistoryChartPresenter([at('severe', '2026-10-01T00:00:00Z')])
      ).toThrow('Unknown risk status: severe')
    })

    test('Should throw for an invalid date', () => {
      expect(() =>
        riskHistoryChartPresenter([at('high', 'not-a-date')])
      ).toThrow('Invalid date')
    })
  })

  describe('Title', () => {
    test('Should use the visible chart title', () => {
      expect(riskHistoryChartPresenter(hpaiTimeline).title).toBe(
        'Risk level over time'
      )
    })
  })

  describe('Window', () => {
    test('Should cover 12 months ending in the latest assessment month', () => {
      const { layout } = riskHistoryChartPresenter(hpaiTimeline).spec

      expect(layout.xaxis.type).toBe('date')
      expect(layout.xaxis.range).toEqual([
        '2025-11-01 00:00:00',
        '2026-11-01 00:00:00'
      ])
    })

    test('Should anchor on the latest assessment, not today', () => {
      const { layout } = riskHistoryChartPresenter([
        at('low', '2026-02-10T00:00:00Z')
      ]).spec

      expect(layout.xaxis.range).toEqual([
        '2025-03-01 00:00:00',
        '2026-03-01 00:00:00'
      ])
    })

    test('Should cross a year boundary when the latest month is early in the year', () => {
      const { layout } = riskHistoryChartPresenter([
        at('low', '2026-01-31T00:00:00Z')
      ]).spec

      expect(layout.xaxis.range).toEqual([
        '2025-02-01 00:00:00',
        '2026-02-01 00:00:00'
      ])
    })
  })

  describe('Traces', () => {
    const traces = (timeline) => {
      const { data } = riskHistoryChartPresenter(timeline).spec
      const [line] = data.filter(({ mode }) => mode === 'lines')
      const [markers] = data.filter(({ mode }) => mode.startsWith('markers'))

      return { data, line, markers }
    }

    test('Should draw markers only for a single assessment', () => {
      const { data, line, markers } = traces([
        at('medium', '2026-08-28T00:00:00Z')
      ])

      expect(data).toHaveLength(1)
      expect(line).toBeUndefined()
      expect(markers.x).toEqual(['2026-08-28 00:00:00'])
      expect(markers.y).toEqual([4])
    })

    test('Should draw a step line to the right edge for two assessments', () => {
      const { data, line, markers } = traces([
        at('high', '2026-08-01T00:00:00Z'),
        at('low', '2026-03-05T00:00:00Z')
      ])

      expect(data).toHaveLength(2)
      expect(line.line.shape).toBe('hv')
      expect(line.x).toEqual([
        '2026-03-05 00:00:00',
        '2026-08-01 00:00:00',
        '2026-09-01 00:00:00'
      ])
      expect(line.y).toEqual([3, 5, 5])
      expect(markers.x).toEqual(['2026-03-05 00:00:00', '2026-08-01 00:00:00'])
      expect(markers.y).toEqual([3, 5])
    })

    test('Should order the points oldest first', () => {
      const { line, markers } = traces(hpaiTimeline)

      expect(markers.y).toEqual([5, 4, 5])
      expect(markers.x).toEqual([
        '2026-01-09 00:00:00',
        '2026-06-15 00:00:00',
        '2026-10-01 00:00:00'
      ])
      expect(line.x.at(-1)).toBe('2026-11-01 00:00:00')
    })

    test('Should clamp the last pre-window assessment to the left edge', () => {
      const { line, markers } = traces([
        at('high', '2026-10-01T00:00:00Z'),
        at('medium', '2025-12-10T00:00:00Z'),
        at('low', '2025-06-01T00:00:00Z'),
        at('negligible', '2025-01-01T00:00:00Z')
      ])

      expect(line.x[0]).toBe('2025-11-01 00:00:00')
      expect(line.y[0]).toBe(3)
      expect(line.x.slice(1)).toEqual([
        '2025-12-10 00:00:00',
        '2026-10-01 00:00:00',
        '2026-11-01 00:00:00'
      ])
      expect(markers.x).toEqual(['2025-12-10 00:00:00', '2026-10-01 00:00:00'])
    })

    test('Should draw a line for one in-window assessment that follows an older one', () => {
      const { line, markers } = traces([
        at('high', '2026-10-01T00:00:00Z'),
        at('low', '2025-06-01T00:00:00Z')
      ])

      expect(line.x).toEqual([
        '2025-11-01 00:00:00',
        '2026-10-01 00:00:00',
        '2026-11-01 00:00:00'
      ])
      expect(line.y).toEqual([3, 5, 5])
      expect(markers.y).toEqual([5])
    })

    test('Should colour each marker by level with a dark 2px outline', () => {
      const { markers } = traces(hpaiTimeline)

      expect(markers.marker.color).toEqual(['#ca3535', '#f47738', '#ca3535'])
      expect(markers.marker.line).toEqual({ color: '#0b0c0c', width: 2 })
    })

    test('Should label markers with the date', () => {
      const { markers } = traces(hpaiTimeline)

      expect(markers.mode).toBe('markers+text')
      expect(markers.text).toEqual(['9 Jan', '15 Jun', '1 Oct'])
    })

    test('Should put the label below on a step down and beside otherwise', () => {
      const { markers } = traces(hpaiTimeline)

      expect(markers.textposition).toEqual([
        'top right',
        'bottom center',
        'top left'
      ])
    })

    test('Should put the label on the left in the last month of the window', () => {
      const { markers } = traces([
        at('high', '2026-10-25T00:00:00Z'),
        at('low', '2026-10-05T00:00:00Z')
      ])

      expect(markers.textposition).toEqual(['top left', 'top left'])
    })

    test('Should keep the label below on a step down in the last month', () => {
      const { markers } = traces([
        at('low', '2026-10-25T00:00:00Z'),
        at('high', '2026-10-05T00:00:00Z')
      ])

      expect(markers.textposition).toEqual(['top left', 'bottom center'])
    })

    test('Should keep the label on the right just before the last month', () => {
      const { markers } = traces([
        at('high', '2026-10-01T00:00:00Z'),
        at('high', '2026-09-30T00:00:00Z')
      ])

      expect(markers.textposition).toEqual(['top right', 'top left'])
    })

    test('Should compare the first in-window marker with the pre-window level', () => {
      const { markers } = traces([
        at('low', '2026-03-01T00:00:00Z'),
        at('high', '2025-03-01T00:00:00Z')
      ])

      expect(markers.textposition).toEqual(['bottom center'])
    })

    test('Should not let labels be clipped at the plot edge', () => {
      expect(traces(hpaiTimeline).markers.cliponaxis).toBe(false)
    })

    describe('With assessments on the same date', () => {
      const tiedTimeline = [
        at('high', '2026-10-01T00:00:00Z'),
        at('low', '2026-10-01T00:00:00Z'),
        at('medium', '2026-06-01T00:00:00Z')
      ]

      test('Should end the line and markers on the current level', () => {
        const { line, markers } = traces(tiedTimeline)

        expect(line.y).toEqual([4, 3, 5, 5])
        expect(markers.y).toEqual([4, 3, 5])
      })

      test('Should order tied markers oldest first for label positions', () => {
        const { markers } = traces(tiedTimeline)

        expect(markers.textposition).toEqual([
          'top right',
          'bottom center',
          'top left'
        ])
      })

      test('Should not change the order of the caller timeline', () => {
        const timeline = [...tiedTimeline]

        riskHistoryChartPresenter(timeline)

        expect(timeline).toEqual(tiedTimeline)
      })
    })
  })

  describe('Y axis', () => {
    const { yaxis } = riskHistoryChartPresenter(hpaiTimeline).spec.layout

    test('Should map levels 1 to 5 with High at the top', () => {
      expect(yaxis.tickvals).toEqual([1, 2, 3, 4, 5])
      expect(yaxis.ticktext).toEqual([
        'Negligible',
        'Very low',
        'Low',
        'Medium',
        'High'
      ])
      expect(yaxis.range).toEqual([0.5, 5.5])
    })

    test('Should size the left margin to the tick labels', () => {
      expect(yaxis.automargin).toBe(true)
    })

    test('Should keep tick labels clear of markers on the window start', () => {
      expect(yaxis.ticks).toBe('outside')
      expect(yaxis.ticklen).toBeGreaterThanOrEqual(8)
    })

    test('Should use light gridlines and no zoom', () => {
      expect(yaxis.showgrid).toBe(true)
      expect(yaxis.gridcolor).toBe('#b1b4b6')
      expect(yaxis.fixedrange).toBe(true)
    })
  })

  describe('X axis', () => {
    const { xaxis } = riskHistoryChartPresenter(hpaiTimeline).spec.layout

    test('Should label months with three letters from the window start', () => {
      expect(xaxis.tickformat).toBe('%b')
      expect(xaxis.fixedrange).toBe(true)
    })

    test('Should tick every third month, in the window only', () => {
      expect(xaxis.tickmode).toBe('array')
      expect(xaxis.tickvals).toEqual([
        '2025-11-01 00:00:00',
        '2026-02-01 00:00:00',
        '2026-05-01 00:00:00',
        '2026-08-01 00:00:00'
      ])
    })

    test('Should not tick at or after the window end', () => {
      const [, end] = xaxis.range

      expect(xaxis.tickvals.every((tick) => tick < end)).toBe(true)
    })

    test('Should keep month labels horizontal', () => {
      expect(xaxis.tickangle).toBe(0)
    })

    test('Should centre a year label under each year of months', () => {
      const { annotations } =
        riskHistoryChartPresenter(hpaiTimeline).spec.layout

      expect(
        annotations.map(({ text, x, xref, yref, showarrow }) => ({
          text,
          x,
          xref,
          yref,
          showarrow
        }))
      ).toEqual([
        {
          text: '2025',
          x: '2025-12-01 12:00:00',
          xref: 'x',
          yref: 'paper',
          showarrow: false
        },
        {
          text: '2026',
          x: '2026-06-02 00:00:00',
          xref: 'x',
          yref: 'paper',
          showarrow: false
        }
      ])
    })

    test('Should give a single year label when the window is within one year', () => {
      const { annotations } = riskHistoryChartPresenter([
        at('low', '2026-12-10T00:00:00Z')
      ]).spec.layout
      // window is Jan 2026 to Dec 2026

      expect(annotations.map(({ text }) => text)).toEqual(['2026'])
      expect(annotations[0].x).toBe('2026-07-02 12:00:00')
    })

    test('Should set the year label font to 16px or larger', () => {
      const { annotations } =
        riskHistoryChartPresenter(hpaiTimeline).spec.layout

      for (const { font } of annotations) {
        expect(font.size).toBeGreaterThanOrEqual(16)
      }
    })
  })

  describe('Layout and config', () => {
    const { layout, config } = riskHistoryChartPresenter(hpaiTimeline).spec

    test('Should be static with no hover, legend or animation', () => {
      expect(layout.hovermode).toBe(false)
      expect(layout.showlegend).toBe(false)
      expect(layout.transition).toEqual({ duration: 0 })
      expect(config).toEqual({
        staticPlot: true,
        displayModeBar: false,
        responsive: true
      })
    })

    test('Should use the GOV.UK font at 16px or larger on white', () => {
      expect(layout.font.family).toBe('Arial, sans-serif')
      expect(layout.font.size).toBeGreaterThanOrEqual(16)
      expect(layout.paper_bgcolor).toBe('#ffffff')
      expect(layout.plot_bgcolor).toBe('#ffffff')
    })

    test('Should leave room for labels without wasting width on mobile', () => {
      expect(layout.margin).toEqual({ l: 10, r: 40, t: 20, b: 80 })
    })
  })

  describe('Description', () => {
    const descriptionOf = (timeline) =>
      riskHistoryChartPresenter(timeline).description
    const TABLE_NOTE = 'The full history is in the table below.'

    test('Should describe a single assessment', () => {
      expect(descriptionOf([at('medium', '2026-08-28T00:00:00Z')])).toBe(
        `Risk level is Medium, assessed on 28 August 2026. ${TABLE_NOTE}`
      )
    })

    test('Should say when the level has not changed', () => {
      expect(
        descriptionOf([
          at('medium', '2026-08-28T00:00:00Z'),
          at('medium', '2026-05-20T00:00:00Z')
        ])
      ).toBe(`Risk level has been Medium since 20 May 2026. ${TABLE_NOTE}`)
    })

    test('Should describe one change', () => {
      expect(
        descriptionOf([
          at('medium', '2026-08-28T00:00:00Z'),
          at('low', '2026-05-20T00:00:00Z')
        ])
      ).toBe(
        `Risk level changed from Low to Medium on 28 August 2026. ${TABLE_NOTE}`
      )
    })

    test('Should describe a change and a return to the earlier level', () => {
      expect(descriptionOf(hpaiTimeline)).toBe(
        `Risk level changed from High to Medium on 15 June 2026 and back to High on 1 October 2026. ${TABLE_NOTE}`
      )
    })

    test('Should describe several changes and skip assessments that kept the level', () => {
      expect(
        descriptionOf([
          at('high', '2026-10-01T00:00:00Z'),
          at('medium', '2026-08-01T00:00:00Z'),
          at('medium', '2026-06-01T00:00:00Z'),
          at('low', '2026-04-01T00:00:00Z'),
          at('negligible', '2026-02-01T00:00:00Z')
        ])
      ).toBe(
        `Risk level changed from Negligible to Low on 1 April 2026, to Medium on 1 June 2026 and to High on 1 October 2026. ${TABLE_NOTE}`
      )
    })

    test('Should end on the current level when assessments share a date', () => {
      expect(
        descriptionOf([
          at('high', '2026-10-01T00:00:00Z'),
          at('low', '2026-10-01T00:00:00Z'),
          at('medium', '2026-06-01T00:00:00Z')
        ])
      ).toBe(
        `Risk level changed from Medium to Low on 1 October 2026 and to High on 1 October 2026. ${TABLE_NOTE}`
      )
    })

    test('Should include changes from before the window', () => {
      expect(
        descriptionOf([
          at('high', '2026-10-01T00:00:00Z'),
          at('low', '2024-04-01T00:00:00Z')
        ])
      ).toBe(
        `Risk level changed from Low to High on 1 October 2026. ${TABLE_NOTE}`
      )
    })
  })
})
