import Boom from '@hapi/boom'

import { getRiskBySlug, listRisks } from '#/data/risk-data-source.js'
import { diseaseDetailPresenter } from '#/presenters/risk/disease-detail-presenter.js'
import { riskPresenter } from '#/presenters/risk/risk-presenter.js'

const getRisk = {
  method: 'GET',
  path: '/risk',
  handler: async (_request, h) =>
    h.view('risk/index', riskPresenter(await listRisks()))
}

const getRiskDetail = {
  method: 'GET',
  path: '/risk/{slug}',
  handler: async ({ params }, h) => {
    const detail = await getRiskBySlug(params.slug)

    if (!detail) {
      throw Boom.notFound('Disease not found')
    }

    return h.view('risk/detail', diseaseDetailPresenter(detail))
  }
}

export const riskRoutes = [getRisk, getRiskDetail]
