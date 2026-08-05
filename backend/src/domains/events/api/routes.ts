import { Router } from 'express';
import { eventsController } from '../controllers/events.controller';

const router = Router();

router.get('/', eventsController.getEvents);
router.get('/:id', eventsController.getEventById);
router.post('/', eventsController.createEvent);
router.put('/:id', eventsController.updateEvent);
router.delete('/:id', eventsController.deleteEvent);
router.get('/organizer/events', eventsController.getOrganizerEvents);
router.post('/:id/like', eventsController.toggleLikeEvent);
router.get('/:id/likes', eventsController.getEventLikes);
router.get('/:id/attendees', eventsController.getEventAttendees);
router.get('/:id/analytics', eventsController.getEventAnalytics);

export { router as eventsRoutes };
