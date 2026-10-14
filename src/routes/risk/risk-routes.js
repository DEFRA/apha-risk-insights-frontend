import { listRisks } from '#/data/risk-data-source.js'
import { riskPresenter } from '#/presenters/risk/risk-presenter.js'

const getRisk = {
  method: 'GET',
  path: '/risk',
  handler: async (_request, h) =>
    h.view('risk/index', riskPresenter(await listRisks()))
}

export const riskRoutes = [getRisk]
