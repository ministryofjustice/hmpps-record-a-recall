import Page from '../page'

export default class EditRecallPage extends Page {
  constructor(recordedDate: string) {
    super(`Recorded on ${recordedDate}`)
  }
}
