import { NotificationLog } from './models/NotificationLog.js';
import { sendEmailViaResend } from './resendClient.js';
import { sendProblem, TYPE_CATALOGUE } from '../../utils/problem.js';

export async function sendNotification(req, res, next) {
  try {
    const { orderId, recipientEmail, subject, message } = req.body;

    if (!orderId || !recipientEmail || !message) {
      return sendProblem(res, {
        type: TYPE_CATALOGUE.VALIDATION_ERROR,
        title: 'Validation Error',
        status: 422,
        detail: 'orderId, recipientEmail, and message are required fields.',
        instance: req.originalUrl
      });
    }

    const emailSubject = subject || `CampusEats Order Update: #${orderId}`;
    const htmlBody = `
      <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
        <h2 style="color: #0284c7;">CampusEats Notification</h2>
        <p>${message}</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <small style="color: #64748b;">IIIT Vadodara CampusEats Platform</small>
      </div>
    `;

    const dispatchResult = await sendEmailViaResend({
      to: recipientEmail,
      subject: emailSubject,
      html: htmlBody,
      text: message
    });

    const notificationId = `notif-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const log = await NotificationLog.create({
      notificationId,
      orderId,
      recipientEmail,
      channel: 'EMAIL_RESEND',
      subject: emailSubject,
      message,
      dispatchMode: dispatchResult.mode,
      status: dispatchResult.success ? 'SENT' : 'FAILED'
    });

    res.status(201).json({
      notificationId: log.notificationId,
      orderId: log.orderId,
      status: log.status,
      dispatchMode: log.dispatchMode
    });
  } catch (err) {
    next(err);
  }
}

export async function getNotificationLogs(req, res, next) {
  try {
    const { orderId } = req.params;
    const logs = await NotificationLog.find({ orderId });
    res.json(logs);
  } catch (err) {
    next(err);
  }
}
