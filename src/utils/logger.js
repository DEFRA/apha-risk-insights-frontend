import { pino } from 'pino'

import { loggerOptions } from '#/utils/logger-options.js'

const logger = pino(loggerOptions)

function createLogger() {
  return logger
}

export { createLogger }
