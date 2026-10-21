import { createLogger } from '#/utils/logger.js'
import {
  buildHttpClientErrorLog,
  buildHttpClientRequestLog,
  buildHttpClientResponseLog
} from '#/utils/build-http-client-log.js'

const logger = createLogger()

const PROBLEM_JSON = 'application/problem+json'

class HttpError extends Error {
  constructor({ status, url, method, title, detail, instance }) {
    super(detail ? `${title}: ${detail}` : title)
    this.name = 'HttpError'
    this.status = status
    this.url = url
    this.method = method
    this.title = title
    this.detail = detail
    this.instance = instance
  }
}

class HttpNetworkError extends Error {
  constructor({ url, method, cause }) {
    super(`Network request failed: ${method} ${url}`, { cause })
    this.name = 'HttpNetworkError'
    this.url = url
    this.method = method
  }
}

const parseBody = (text, contentType) => {
  if (!text) {
    return null
  }
  if (contentType.includes('json')) {
    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  }
  return text
}

const buildHttpError = (response, body, method, url) => {
  const contentType = response.headers.get('content-type') ?? ''
  const isProblem =
    contentType.includes(PROBLEM_JSON) && body && typeof body === 'object'

  return new HttpError({
    status: response.status,
    url,
    method,
    title: (isProblem && body.title) || response.statusText,
    detail: isProblem ? body.detail : undefined,
    instance: isProblem ? body.instance : undefined
  })
}

/**
 * Makes an HTTP request using the global fetch API.
 * @param {string} url - Request URL
 * @param {{method?: string, headers?: object, body?: any}} [options]
 * @returns {Promise<any>} Parsed JSON, text for non-JSON, or null if empty
 * @throws {HttpError | HttpNetworkError}
 */
export async function httpClient(url, { method = 'GET', headers, body } = {}) {
  const upperMethod = method.toUpperCase()
  const start = performance.now()

  logger.info(buildHttpClientRequestLog(upperMethod, url), 'HTTP request')

  let response
  try {
    response = await fetch(url, { method: upperMethod, headers, body })
  } catch (cause) {
    const error = new HttpNetworkError({ url, method: upperMethod, cause })
    logger.error(
      buildHttpClientErrorLog(
        upperMethod,
        url,
        error,
        performance.now() - start
      ),
      error.message
    )
    throw error
  }

  const text = await response.text()
  const data = parseBody(text, response.headers.get('content-type') ?? '')
  const duration = performance.now() - start

  if (!response.ok) {
    const error = buildHttpError(response, data, upperMethod, url)
    logger.error(
      buildHttpClientErrorLog(upperMethod, url, error, duration),
      error.message
    )
    throw error
  }

  logger.info(
    buildHttpClientResponseLog(upperMethod, url, response.status, duration),
    'HTTP response'
  )
  return data
}

export { HttpError, HttpNetworkError }
