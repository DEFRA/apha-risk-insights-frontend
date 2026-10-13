import { statusCodes } from '#/constants/status-codes.js'

/**
 * A generic health-check endpoint. Used by the platform to check if the service is up and handling requests.
 */
const getHealth = {
  method: 'GET',
  path: '/health',
  handler: (_request, h) =>
    h.response({ message: 'success' }).code(statusCodes.ok)
}

export const healthRoutes = [getHealth]
