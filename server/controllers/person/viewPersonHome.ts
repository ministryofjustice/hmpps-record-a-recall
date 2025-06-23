import { Request, Response } from 'express'
// eslint-disable-next-line import/no-unresolved
import { Recall } from 'models'
import logger from '../../../logger'
import PrisonerService from '../../services/prisonerService'
import ManageOffencesService from '../../services/manageOffencesService'
// import CourtCaseService from '../../services/CourtCaseService'
import getServiceUrls from '../../helpers/urlHelper'
import { summariseRasCases } from '../../utils/CaseSentenceSummariser'
import { SummarisedSentenceGroup } from '../../utils/sentenceUtils'


function hasSentence(item: unknown): item is { sentence: any } {
  return (
    typeof item === 'object' &&
    item !== null &&
    'sentence' in item &&
    typeof (item as Record<string, unknown>).sentence === 'object'
  )
}

export default async (req: Request, res: Response) => {
  await setPrisonerDetailsInLocals(req.services.prisonerService, res)

  const banner: {
    success?: {
      title: string
      content: string
    }
  } = {}

  const success = req.flash('success')
  if (success?.length) {
    // @ts-expect-error This works
    // eslint-disable-next-line prefer-destructuring
    banner.success = success[0]
  }
  const error = req.flash('errorMessage')

  const { nomisId, prisoner } = res.locals
  const { username } = res.locals.user

  const urls = getServiceUrls(nomisId)

if (prisoner) {
    let recalls: Recall[] = []
    let serviceDefinitions: any = null
    let courtCases: any[] = []

  try {
    recalls = await req.services.recallService.getAllRecalls(nomisId, username)
    const locationIds = recalls.map(r => r.location)
    const prisonNames = await req.services.prisonService.getPrisonNames(locationIds, username)
    recalls.forEach(r => (r.locationName = prisonNames.get(r.location)))
    serviceDefinitions = await req.services.courtCasesReleaseDatesService.getServiceDefinitions(
      nomisId,
      req.user.token,
    )

    courtCases = await req.services.courtCaseService.getAllCourtCases(nomisId, username)

    recalls.forEach(recall => {
      (recall as any).courtCases = courtCases.filter(cc => recall.courtCaseIds?.includes(cc.caseId))
    })
  } catch (e) {
    logger.error(e)
  }

  // Find the latest recall by using createdAt date
  let latestRecallId: string | undefined
  if (recalls.length > 0) {
    const latestRecall = recalls.reduce((latest, current) => {
      if (
        !latest ||
        (current.createdAt && latest.createdAt && new Date(current.createdAt) > new Date(latest.createdAt))
      ) {
        return current
      }
      return latest
    }, null as Recall | null)
    latestRecallId = latestRecall?.recallId
  }

  // Extract offenceCodes from all courtCases
  const offenceCodes = courtCases.flatMap(cc =>
    cc.charges?.map((charge: { offenceCode: any }) => charge.offenceCode).filter(Boolean) || []
  )

  let offenceNameMap = {}
  if (offenceCodes.length > 0) {
    offenceNameMap = await new ManageOffencesService().getOffenceMap(offenceCodes, req.user.token)
  }
  const summarisedRasCases = summariseRasCases(
    courtCases.filter(c => c.status !== 'DRAFT' && c.sentenced)
  )
  
  const summarisedSentencesGroups: SummarisedSentenceGroup[] = summarisedRasCases
  .map(group => {
    const filteredMainSentences = group.sentences.filter(
      s => hasSentence(s) && s.sentence.sentenceType?.classification === 'STANDARD',
    )
    
    const sdsSentenceUuids = new Set(filteredMainSentences.map(s => (s as any).sentence.sentenceUuid))
    
    const filteredEligibleSentences = group.eligibleSentences.filter(es => sdsSentenceUuids.has(es.sentenceId))
    const filteredIneligibleSentences = group.ineligibleSentences.filter(is => sdsSentenceUuids.has(is.sentenceId))
    
      // console.log(JSON.stringify(recalls, null, 2))

    return {
      ...group,
      sentences: filteredMainSentences,
      eligibleSentences: filteredEligibleSentences,
      ineligibleSentences: filteredIneligibleSentences,
      hasEligibleSentences: filteredEligibleSentences.length > 0,
      hasIneligibleSentences: filteredIneligibleSentences.length > 0,
    }
  })
  .filter(group => group.sentences.length > 0)



  return res.render('pages/person/home', {
    nomisId,
    prisoner,
    recalls,
    offenceNameMap,
    banner,
    urls,
    serviceDefinitions,
    summarisedSentencesGroups,
    errorMessage: error?.length ? error[0] : null,
    latestRecallId,
  })
}
  req.flash('errorMessage', `Prisoner details for ${nomisId} not found`)
  return res.redirect('/search')
}

export async function setPrisonerDetailsInLocals(prisonerService: PrisonerService, res: Response) {
  const { nomisId } = res.locals
  return prisonerService
    .getPrisonerDetails(nomisId, res.locals.user.username)
    .then(prisoner => {
      res.locals.prisoner = prisoner
    })
    .catch(error => {
      logger.error(error, `Failed to retrieve prisoner details for: ${nomisId}`)
    })
}
