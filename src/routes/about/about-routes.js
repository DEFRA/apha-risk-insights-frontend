import { aboutPresenter } from '#/presenters/about/about-presenter.js'

const getAbout = {
  method: 'GET',
  path: '/about',
  handler: (_request, h) => h.view('about/index', aboutPresenter())
}

export const aboutRoutes = [getAbout]
