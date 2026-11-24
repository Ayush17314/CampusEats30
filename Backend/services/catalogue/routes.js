import express from 'express';
import { listVendors, listDishes, getDish, checkItem, setAvailability, addDish } from './controller.js';
import { auth, requireRole } from '../../middleware/auth.js';

const router = express.Router();

router.get('/vendors', listVendors);

// CS543 Assignment 09: Guard 1 (auth) protects read routes
router.get('/items', auth, listDishes);
router.get('/dishes', auth, listDishes);
router.get('/dishes/:id', auth, getDish);
router.get('/items/:id', auth, getDish);

// CS543 Assignment 09: Guard 2 (requireRole) protects write routes
router.post('/items', auth, requireRole('restaurant', 'admin'), addDish);
router.post('/dishes', auth, requireRole('restaurant', 'admin'), addDish);
router.patch('/items/:id/availability', auth, requireRole('restaurant', 'admin'), setAvailability);
router.patch('/dishes/:id/availability', auth, requireRole('restaurant', 'admin'), setAvailability);

// Published operation for internal cross-service checks (unauthenticated or service-to-service)
router.get('/items/:itemId/check', checkItem);

export default router;
