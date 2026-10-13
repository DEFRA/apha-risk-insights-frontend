import { requestLogger } from '#/plugins/request-logger.js'
import { requestTracing } from '#/plugins/request-tracing.js'
import { metrics } from '@defra/cdp-metrics'
import { secureContext } from '@defra/hapi-secure-context'
import { pulse } from '#/plugins/pulse.js'
import { sessionCache } from '#/plugins/session-cache.js'
import { nunjucksConfig } from '#/plugins/template-renderer/vision.js'
import Scooter from '@hapi/scooter'
import { contentSecurityPolicy } from '#/plugins/content-security-policy.js'
import { router } from '#/plugins/router.js'

export const plugins = [
  requestLogger,
  requestTracing,
  metrics,
  secureContext,
  pulse,
  sessionCache,
  nunjucksConfig,
  Scooter,
  contentSecurityPolicy,
  router
]
