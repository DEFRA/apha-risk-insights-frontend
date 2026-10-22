import { createLogger } from '#/utils/logger.js'
import {
  buildHttpClientErrorLog,
  buildHttpClientRequestLog,
  buildHttpClientResponseLog
} from '#/utils/build-http-client-log.js'

const PROBLEM_JSON = 'application/problem+json'

export class HttpError extends Error {
  constructor({ status, url, method, title, detail, instance }) {
    super(detail ?? title ?? `HTTP ${status}`)
    this.name = 'HttpError'
    this.status = status
    this.url = url
    this.method = method
    this.title = title
    this.detail = detail
    this.instance = instance
  }
}

export class HttpNetworkError extends Error {
  constructor({ url, method, cause }) {
    super(`Network request failed: ${method} ${url}`, { cause })
    this.name = 'HttpNetworkError'
    this.url = url
    this.method = method
  }
}

async function readBody(response) {
  const text = await response.text()
  if (!text) {
    return undefined
  }
  const contentType = response.headers.get('content-type') ?? ''
  if (/json/i.test(contentType)) {
    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  }
  return text
}

function buildHttpError(response, body, method, url) {
  const isProblem = (response.headers.get('content-type') ?? '')
    .toLowerCase()
    .includes(PROBLEM_JSON)
  const problem = isProblem && body && typeof body === 'object' ? body : {}

  return new HttpError({
    status: response.status,
    url,
    method,
    title: problem.title ?? response.statusText,
    detail: problem.detail ?? response.statusText,
    instance: problem.instance
  })
}

/**
 * Makes an HTTP request using the global fetch.
 * @param {string} url
 * @param {{method?: string, headers?: object, body?: any}} [options]
 * @returns {Promise<any>} Parsed JSON, text for non-JSON, or undefined when empty
 */
export async function httpClient(url, options = {}) {
  const { method = 'GET', headers, body } = options
  const upperMethod = method.toUpperCase()
  const logger = createLogger()
  const start = Date.now()

  logger.info(buildHttpClientRequestLog(upperMethod, url), 'HTTP request')

  let response
  try {
    response = await fetch(url, { method: upperMethod, headers, body })
  } catch (cause) {
    const error = new HttpNetworkError({ url, method: upperMethod, cause })
    logger.error(
      buildHttpClientErrorLog(upperMethod, url, error, Date.now() - start),
      'HTTP request failed'
    )
    throw error
  }

  const data = await readBody(response)
  const duration = Date.now() - start

  if (!response.ok) {
    const error = buildHttpError(response, data, upperMethod, url)
    logger.error(
      buildHttpClientErrorLog(upperMethod, url, error, duration),
      'HTTP request failed'
    )
    throw error
  }

  logger.info(
    buildHttpClientResponseLog(upperMethod, url, response.status, duration),
    'HTTP request succeeded'
  )
  return data
}
