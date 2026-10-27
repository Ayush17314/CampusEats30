import express from 'express';
import { listVendors, listDishes, getDish, checkItem, setAvailability, addDish } from './controller.js';

const router = express.Router();

router.get('/vendors', listVendors);
router.get('/dishes', listDishes);
router.post('/dishes', addDish);
router.get('/dishes/:id', getDish);
router.patch('/dishes/:id/availability', setAvailability);

// Published operation for cross-service invocation:
router.get('/items/:itemId/check', checkItem);

export default router;
