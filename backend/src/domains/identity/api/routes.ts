import { Router } from 'express';
import { identityController } from '../controllers/identity.controller';

const router = Router();

// Public routes
router.post('/register', identityController.register);
router.post('/login', identityController.login);
router.get('/username/:username', identityController.checkUsername);

// Protected routes (auth middleware applied at app level)
router.get('/profile', identityController.getProfile);
router.put('/profile', identityController.updateProfile);
router.delete('/account', identityController.deleteAccount);
router.post('/become-organizer', identityController.becomeOrganizer);
router.get('/search', identityController.searchProfiles);

export { router as identityRoutes };
