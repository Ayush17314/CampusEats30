import express from 'express';
import { sendNotification, getNotificationLogs } from './controller.js';

const router = express.Router();

router.post('/send', sendNotification);
router.get('/orders/:orderId', getNotificationLogs);

export default router;
