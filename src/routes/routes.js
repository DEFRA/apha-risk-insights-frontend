import { healthRoutes } from './health-routes.js'
import { homeRoutes } from './home/home-routes.js'
import { aboutRoutes } from './about/about-routes.js'
import { riskRoutes } from './risk/risk-routes.js'

export const routes = [
  ...healthRoutes,
  ...homeRoutes,
  ...aboutRoutes,
  ...riskRoutes
]
