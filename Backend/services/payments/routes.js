import express from 'express';
import { chargePayment, refundPayment, getPaymentStatus } from './controller.js';

const router = express.Router();

router.post('/charge', chargePayment);
router.post('/orders/:orderId/refund', refundPayment);
router.get('/orders/:orderId', getPaymentStatus);

export default router;
