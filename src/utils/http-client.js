import { STATUS_CODES } from 'node:http'

import {
  buildHttpClientErrorLog,
  buildHttpClientRequestLog,
  buildHttpClientResponseLog
} from '#/utils/build-http-client-log.js'
import { createLogger } from '#/utils/logger.js'

const PROBLEM_JSON = 'application/problem+json'

export class HttpError extends Error {
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

export class HttpNetworkError extends Error {
  constructor({ url, method, cause }) {
    super(`Network request failed: ${method} ${url}`, { cause })
    this.name = 'HttpNetworkError'
    this.url = url
    this.method = method
  }
}

const isMediaType = (response, mediaType) =>
  (response.headers.get('content-type') ?? '')
    .toLowerCase()
    .split(';')[0]
    .trim() === mediaType

const isJson = (response) => {
  const type = (response.headers.get('content-type') ?? '')
    .toLowerCase()
    .split(';')[0]
    .trim()
  return type === 'application/json' || type.endsWith('+json')
}

const readBody = async (response) => {
  const text = await response.text()
  if (!text) {
    return null
  }
  if (isJson(response)) {
    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  }
  return text
}

const buildHttpError = async (response, url, method) => {
  const statusText = response.statusText || STATUS_CODES[response.status]
  let problem = {}

  if (isMediaType(response, PROBLEM_JSON)) {
    const body = await readBody(response).catch(() => null)
    if (body && typeof body === 'object') {
      problem = body
    }
  }

  return new HttpError({
    status: response.status,
    url,
    method,
    title: problem.title ?? statusText,
    detail: problem.detail ?? statusText,
    instance: problem.instance
  })
}

/**
 * Makes an HTTP request using the global fetch.
 * @param {string} url
 * @param {{ method?: string, headers?: object, body?: any }} [options]
 * @returns {Promise<any>} Parsed JSON, text for non-JSON responses, or null when empty
 * @throws {HttpError} For non-2xx responses
 * @throws {HttpNetworkError} For network failures
 */
export async function httpClient(url, { method = 'GET', headers, body } = {}) {
  const logger = createLogger()
  const upperMethod = method.toUpperCase()
  const start = performance.now()

  logger.info(
    buildHttpClientRequestLog(upperMethod, url),
    `HTTP request started: ${upperMethod} ${url}`
  )

  try {
    let response
    try {
      response = await fetch(url, { method: upperMethod, headers, body })
    } catch (cause) {
      throw new HttpNetworkError({ url, method: upperMethod, cause })
    }

    if (!response.ok) {
      throw await buildHttpError(response, url, upperMethod)
    }

    const data = await readBody(response)
    logger.info(
      buildHttpClientResponseLog(
        upperMethod,
        url,
        response.status,
        performance.now() - start
      ),
      `HTTP request succeeded: ${upperMethod} ${url}`
    )
    return data
  } catch (err) {
    logger.error(
      buildHttpClientErrorLog(upperMethod, url, err, performance.now() - start),
      `HTTP request failed: ${upperMethod} ${url}`
    )
    throw err
  }
}
