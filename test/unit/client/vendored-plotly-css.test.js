import { readFile } from 'node:fs/promises'

const read = (relativePath) =>
  readFile(new URL(relativePath, import.meta.url), 'utf8')

const VENDORED_CSS = '../../../src/client/stylesheets/vendor/_plotly.scss'
const PACKAGE_JSON = '../../../package.json'

describe('Vendored Plotly CSS', () => {
  let css
  let header

  beforeAll(async () => {
    css = await read(VENDORED_CSS)
    ;[header] = css.match(/^\/\*[\s\S]*?\*\//)
  })

  test('Should be the same version as the pinned Plotly bundle', async () => {
    const { dependencies } = JSON.parse(await read(PACKAGE_JSON))
    const [, vendoredVersion] = header.match(/^ \* Version: (\S+)$/m)

    expect(vendoredVersion).toBe(dependencies['plotly.js-basic-dist-min'])
  })

  test('Should name its source package and URL at that version', () => {
    const [, version] = header.match(/^ \* Version: (\S+)$/m)

    expect(header).toContain(`Source: plotly.js@${version}`)
    expect(header).toContain(
      `https://unpkg.com/plotly.js@${version}/dist/plotly.css`
    )
  })

  test('Should explain why it exists', () => {
    expect(header).toMatch(/Content Security Policy/i)
  })

  test('Should carry the Plotly MIT licence notice', () => {
    expect(header).toMatch(/^ \* MIT License$/m)
    expect(header).toMatch(/^ \* Copyright \(c\) .*Plotly/m)
    expect(header).toContain('Permission is hereby granted, free of charge')
    expect(header).toContain('THE SOFTWARE IS PROVIDED "AS IS"')
  })

  test('Should contain the Plotly base rules', () => {
    expect(css).toContain('.js-plotly-plot .plotly')
  })
})
