import mongoose from 'mongoose';
import { notificationsDb } from '../../../config/db.js';

const NotificationLogSchema = new mongoose.Schema({
  notificationId: { type: String, required: true, unique: true, index: true },
  orderId: { type: String, required: true, index: true },
  recipientEmail: { type: String, required: true },
  channel: { type: String, default: 'EMAIL_RESEND' },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  dispatchMode: { type: String, default: 'simulated' },
  status: { type: String, enum: ['SENT', 'FAILED'], default: 'SENT' }
}, { timestamps: true });

export const NotificationLog = notificationsDb.model('NotificationLog', NotificationLogSchema);
