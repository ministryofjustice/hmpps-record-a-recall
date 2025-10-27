import { Request, Response } from 'express'
import { Controller } from '../controller'
import { Page } from '../../services/auditService'
import CourtCasesReleaseDatesService from '../../services/courtCasesReleaseDatesService'
import RemandAndSentencingService from '../../services/remandAndSentencingService'
import PrisonRegisterService from '../../services/prisonRegisterService'
import { ApiRecall } from '../../@types/remandAndSentencingApi/remandAndSentencingTypes'
import RecallCardModel from '../../views/partials/components/recall-card/RecallCardModel'
import { Prison } from '../../@types/prisonRegisterApi/prisonRegisterTypes'
import { getRecallType } from '../../@types/recallTypes'

export default class HomeController implements Controller {
  constructor(
    private readonly courtCasesReleaseDatesService: CourtCasesReleaseDatesService,
    private readonly remandAndSentencingService: RemandAndSentencingService,
    private readonly prisonRegisterService: PrisonRegisterService,
  ) {}

  public PAGE_NAME = Page.HOME

  GET = async (req: Request<{ nomsId: string }>, res: Response): Promise<void> => {
    const { nomsId } = req.params
    const { prisoner, user } = res.locals
    const serviceDefinitions = await this.courtCasesReleaseDatesService.getServiceDefinitions(nomsId, user.token)
    const sortedRecalls = await this.remandAndSentencingService
      .getAllRecalls(nomsId, user.username)
      .then(recalls => recalls.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
    const requiredPrisonIds = sortedRecalls.map(recall => recall.createdByPrison)
    const prisons = await this.prisonRegisterService.getPrisonNames(requiredPrisonIds, user.username)
    const latestRecallUuid = sortedRecalls.length > 0 ? sortedRecalls[0].recallUuid : undefined
    const recallCards = sortedRecalls.map(recall => this.toRecallCard(recall, prisons, latestRecallUuid))
    return res.render('pages/person/home', {
      recallCards,
      prisoner,
      nomsId,
      serviceDefinitions,
    })
  }

  private toRecallCard(recall: ApiRecall, prisons: Prison[], latestRecallUuid: string): RecallCardModel {
    return {
      recallUuid: recall.recallUuid,
      source: recall.source,
      createdAtTimestamp: recall.createdAt,
      createdAtLocationName: prisons.find(prison => prison.prisonId === recall.createdByPrison)?.prisonName,
      canEdit: recall.source === 'DPS' && recall.recallUuid === latestRecallUuid,
      canDelete: recall.source === 'DPS',
      recallTypeDescription: getRecallType(recall.recallType).description,
      revocationDate: recall.revocationDate,
      returnToCustodyDate: recall.returnToCustodyDate,
    }
  }
}
