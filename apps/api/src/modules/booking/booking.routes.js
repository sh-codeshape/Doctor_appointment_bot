import { Router } from 'express'
import { bookingController } from './booking.controller.js'

const router = Router()

// Bookings
router.get('/',                bookingController.getAll)
router.get('/:id',             bookingController.getById)
router.get('/:id/draft',       bookingController.getDraft)
router.patch('/:id/draft',     bookingController.saveDraft)
router.patch('/:id',           bookingController.update)
router.patch('/:id/status',       bookingController.updateStatus)
router.patch('/:id/prescription', bookingController.updatePrescription)
router.delete('/:id',          bookingController.delete)

export default router
