import process from 'node:process'

import { startServer } from '#/utils/start-server.js'
import { createLogger } from '#/utils/logger.js'

await startServer()

process.on('unhandledRejection', (error) => {
  const logger = createLogger()
  logger.info('Unhandled rejection')
  logger.error(error)
  process.exitCode = 1
})
