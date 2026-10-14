import { readFile } from 'node:fs/promises'

const SAMPLE_DATA_URL = new URL('./risk-sample-data.json', import.meta.url)

const FIRST_PAGE = 1
const DEFAULT_PAGE_SIZE = 50

/**
 * Static risk data source. Returns `RiskPage` objects in the shape of the
 * backend OpenAPI contract so it can be swapped for an API implementation.
 * The data is sample data, not real assessments.
 * @param {object} [_query] - accepted for interface parity with the API; the
 * static source does not filter, search, sort or paginate
 * @returns {Promise<object>} a `RiskPage`
 */
export const listRisks = async (_query = {}) => {
  const { items } = JSON.parse(await readFile(SAMPLE_DATA_URL, 'utf8'))

  return {
    items,
    page: FIRST_PAGE,
    pageSize: DEFAULT_PAGE_SIZE,
    totalItems: items.length,
    totalPages: Math.ceil(items.length / DEFAULT_PAGE_SIZE)
  }
}
