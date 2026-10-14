import { readFile } from 'node:fs/promises'

import { slugify } from '#/utils/slugify.js'

const SAMPLE_DATA_URL = new URL('./risk-sample-data.json', import.meta.url)

const FIRST_PAGE = 1
const DEFAULT_PAGE_SIZE = 50

const readRecords = async () =>
  JSON.parse(await readFile(SAMPLE_DATA_URL, 'utf8')).items

/**
 * Static risk data source. Returns `RiskPage` objects in the shape of the
 * backend OpenAPI contract so it can be swapped for an API implementation.
 * The data is sample data, not real assessments.
 * @param {object} [_query] - accepted for interface parity with the API; the
 * static source does not filter, search, sort or paginate
 * @returns {Promise<object>} a `RiskPage`
 */
export const listRisks = async (_query = {}) => {
  const items = (await readRecords()).map(
    ({ riskHistory: _riskHistory, ...summary }) => summary
  )

  return {
    items,
    page: FIRST_PAGE,
    pageSize: DEFAULT_PAGE_SIZE,
    totalItems: items.length,
    totalPages: Math.ceil(items.length / DEFAULT_PAGE_SIZE)
  }
}

/**
 * Fetches one risk record by risk id: the current assessment (`risk`) plus its
 * riskHistory (past assessments only, newest first, excluding the current
 * assessment).
 * @param {string} riskId
 * @returns {Promise<object | undefined>} the record, or undefined if not found
 */
export const getRisk = async (riskId) =>
  (await readRecords()).find(({ id }) => id === riskId)

/**
 * Resolves a disease slug to a risk record. The slug is `slugify(disease.name)`,
 * the same rule the risk card presenter uses for its links. The slug is
 * resolved to a risk id, then the record is fetched by that id.
 * @param {string} slug
 * @returns {Promise<object | undefined>} the record, or undefined if not found
 */
export const getRiskBySlug = async (slug) => {
  const { items } = await listRisks()
  const match = items.find(({ disease }) => slugify(disease.name) === slug)

  return match ? getRisk(match.id) : undefined
}
