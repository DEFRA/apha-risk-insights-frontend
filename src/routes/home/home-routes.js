import { homePresenter } from '#/presenters/home/home-presenter.js'

const getHome = {
  method: 'GET',
  path: '/',
  handler: (_request, h) => h.view('home/index', homePresenter())
}

export const homeRoutes = [getHome]
