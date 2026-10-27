import express from 'express';
import { placeOrder, getOrder, listOrders, cancelOrder, updateOrder, optionsOrder } from './controller.js';

const router = express.Router();

router.post('/', placeOrder);
router.get('/', listOrders);
router.options('/:id', optionsOrder);
router.get('/:id', getOrder);
router.patch('/:id', updateOrder);
router.put('/:id', updateOrder);

// Assignment 5 A2: Non-CRUD action as sub-resource
router.post('/:id/cancel', cancelOrder);
router.post('/:id/cancellation', cancelOrder);

export default router;
