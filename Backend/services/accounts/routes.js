import express from 'express';
import { registerUser, getProfile, addAddress } from './controller.js';

const router = express.Router();

router.post('/register', registerUser);
router.get('/:studentId', getProfile);
router.post('/:studentId/addresses', addAddress);

export default router;
