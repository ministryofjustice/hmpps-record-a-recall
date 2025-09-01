import { Router } from 'express'
import PopulateStoredRecallController from '../../../controllers/recall/edit/populateStoredRecallController'
import getCourtCaseOptionsFromRas from '../../../utils/rasCourtCasesUtils'
import { sessionModelFields } from '../../../helpers/formWizardHelper'
import { setSessionValue } from '../../../helpers/sessionHelper'

const router = Router()

router.get('/populate-stored-recall', async (req, res, next) => {
  try {
    const reqAsAny = req as any
    const controller = new PopulateStoredRecallController({ route: '/populate-stored-recall' })

    // First, set up court case items as the controller's middleware does
    const courtCaseOptions = await getCourtCaseOptionsFromRas(reqAsAny, res)
    setSessionValue(reqAsAny, sessionModelFields.COURT_CASE_OPTIONS, courtCaseOptions)

    // Configure the controller (loads recall data and adjustments)
    await controller.configure(reqAsAny, res, next)

    // Call the locals method to populate session data
    // This sets up all the session fields from the stored recall
    const locals = controller.locals(reqAsAny, res)

    // Store the locals in res.locals for compatibility with templates
    Object.assign(res.locals, locals)

    // Redirect to edit summary page
    res.redirect(`${req.baseUrl}/edit-summary`)
  } catch (error) {
    // If there's an error, pass it to the error handler
    next(error)
  }
})

export default router
