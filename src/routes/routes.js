import { healthRoutes } from './health-routes.js'
import { homeRoutes } from './home/home-routes.js'
import { aboutRoutes } from './about/about-routes.js'

export const routes = [...healthRoutes, ...homeRoutes, ...aboutRoutes]
