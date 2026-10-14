import { fileURLToPath } from 'node:url'
import path from 'path'
import nunjucks from 'nunjucks'
import { load } from 'cheerio'
import { camelCase } from 'lodash'

import * as filters from '#/plugins/template-renderer/filters/filters.js'
import * as globals from '#/plugins/template-renderer/globals/globals.js'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const nunjucksTestEnv = nunjucks.configure(
  [
    path.normalize(
      path.resolve(dirname, '../../node_modules/govuk-frontend/dist/')
    ),
    path.normalize(path.resolve(dirname, '../../src/views')),
    path.normalize(path.resolve(dirname, '../../src/views/components'))
  ],
  {
    autoescape: true,
    throwOnUndefined: false,
    trimBlocks: true,
    lstripBlocks: true
  }
)

Object.entries(globals).forEach(([name, global]) => {
  nunjucksTestEnv.addGlobal(name, global)
})

Object.entries(filters).forEach(([name, filter]) => {
  nunjucksTestEnv.addFilter(name, filter)
})

function toMacroName(componentName) {
  return `app${
    componentName.charAt(0).toUpperCase() + camelCase(componentName.slice(1))
  }`
}

export function renderComponent(componentName, params, callBlock) {
  const macroPath = `${componentName}/macro.njk`
  const macroName = toMacroName(componentName)
  const macroParams = JSON.stringify(params, null, 2)
  let macroString = `{%- from "${macroPath}" import ${macroName} -%}`

  if (callBlock) {
    macroString += `{%- call ${macroName}(${macroParams}) -%}${callBlock}{%- endcall -%}`
  } else {
    macroString += `{{- ${macroName}(${macroParams}) -}}`
  }

  return load(nunjucksTestEnv.renderString(macroString, {}))
}

/**
 * Renders a component macro the way a page does: params come from the render
 * context rather than being inlined into the template source.
 * @param {string} componentName
 * @param {object} params
 */
export function renderComponentFromContext(componentName, params) {
  const macroName = toMacroName(componentName)
  const macroString = `{%- from "${componentName}/macro.njk" import ${macroName} -%}{{- ${macroName}(params) -}}`

  return load(nunjucksTestEnv.renderString(macroString, { params }))
}
