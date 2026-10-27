import express from 'express';
import { listRiders, assignRider, getDeliveryStatus, updateDeliveryStatus } from './controller.js';

const router = express.Router();

router.get('/riders', listRiders);
router.post('/assign', assignRider);
router.get('/orders/:orderId', getDeliveryStatus);
router.patch('/orders/:orderId/status', updateDeliveryStatus);

export default router;
