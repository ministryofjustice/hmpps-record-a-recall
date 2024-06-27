import type { DateForm } from 'forms'
import RecallService from './recallService'
import HmppsAuthClient from '../data/hmppsAuthClient'

jest.mock('../data/hmppsAuthClient')

// Define your own type for the session object
interface MockSession {
  recalls: { [key: string]: { recallDate?: Date } }
}

// describe('Recall service', () => {
//   let hmppsAuthClient: jest.Mocked<HmppsAuthClient>
//   let recallService: RecallService
//
//   beforeEach(() => {
//     hmppsAuthClient = new HmppsAuthClient(null) as jest.Mocked<HmppsAuthClient>
//     recallService = new RecallService(hmppsAuthClient)
//   })
//
//   describe('setRecallDate', () => {
//     it('should set the recall date correctly in the session', () => {
//       const session: MockSession = {
//         recalls: {},
//       }
//
//       const nomsId = 'A1234BC'
//       const recallDateForm: DateForm = {
//         day: '01',
//         month: '02',
//         year: '2023',
//       }
//
//       recallService.setRecallDate(session, nomsId, recallDateForm)
//
//       expect(session.recalls[nomsId].recallDate).toEqual(new Date(2023, 1, 1)) // Month is 0-indexed, so February is 1
//     })
//   })
// })
