import { Payment } from './models/Payment.js';
import { soapPartnerClient } from './soapPartner/soapClient.js';
import { sendProblem, TYPE_CATALOGUE } from '../../utils/problem.js';

/**
 * CS543 Assignment 2 & 3: Payments Service Operations
 */

export async function chargePayment(req, res, next) {
  try {
    const { orderId, studentId, amountInr, paymentMethod } = req.body;
    const idempotencyKey = req.headers['idempotency-key'];

    // 1. Validation
    if (!orderId || !amountInr || amountInr <= 0) {
      return sendProblem(res, {
        type: TYPE_CATALOGUE.VALIDATION_ERROR,
        title: 'Validation Error',
        status: 422,
        detail: 'Valid orderId and positive amountInr are required to charge payment.',
        instance: req.originalUrl
      });
    }

    // 2. Idempotency Key check
    if (idempotencyKey) {
      const existingPayment = await Payment.findOne({ idempotencyKey });
      if (existingPayment) {
        return res.status(200).json({
          paymentId: existingPayment.paymentId,
          orderId: existingPayment.orderId,
          status: existingPayment.status,
          amountInr: existingPayment.amountInr,
          idempotentRepeat: true
        });
      }
    }

    // 3. Delegate to external SOAP Partner Gateway (Assignment 3)
    const soapResult = await soapPartnerClient.invokeCharge({
      orderReference: orderId,
      studentId: studentId || 'anonymous',
      amountInr: Number(amountInr),
      paymentMethod: paymentMethod || 'CAMPUS_WALLET'
    });

    if (!soapResult.success) {
      // Record declined payment
      const paymentId = `pay-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      await Payment.create({
        paymentId,
        orderId,
        studentId: studentId || 'anonymous',
        amountInr,
        paymentMethod: paymentMethod || 'CAMPUS_WALLET',
        status: 'DECLINED',
        idempotencyKey
      });

      // Mapped problem details error (Assignment 3 Task 6 & Assignment 6)
      return sendProblem(res, {
        type: TYPE_CATALOGUE.PAYMENT_DECLINED,
        title: 'Payment Declined',
        status: 422,
        detail: soapResult.mappedErrorMessage,
        instance: req.originalUrl
      });
    }

    // 4. Save captured payment
    const paymentId = `pay-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const payment = await Payment.create({
      paymentId,
      orderId,
      studentId: studentId || 'anonymous',
      amountInr,
      paymentMethod: paymentMethod || 'CAMPUS_WALLET',
      status: 'CAPTURED',
      gatewayRef: soapResult.transactionId,
      idempotencyKey
    });

    res.status(201).json({
      paymentId: payment.paymentId,
      orderId: payment.orderId,
      status: payment.status,
      amountInr: payment.amountInr,
      gatewayRef: payment.gatewayRef
    });
  } catch (err) {
    next(err);
  }
}

export async function refundPayment(req, res, next) {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    const payment = await Payment.findOne({ orderId, status: 'CAPTURED' });
    if (!payment) {
      return sendProblem(res, {
        type: TYPE_CATALOGUE.ORDER_NOT_FOUND,
        title: 'Payment Not Found',
        status: 404,
        detail: `No captured payment found for order '${orderId}'.`,
        instance: req.originalUrl
      });
    }

    payment.status = 'REFUNDED';
    payment.refundReason = reason || 'Order cancellation';
    await payment.save();

    res.json({
      paymentId: payment.paymentId,
      orderId: payment.orderId,
      status: payment.status,
      refundReason: payment.refundReason
    });
  } catch (err) {
    next(err);
  }
}

export async function getPaymentStatus(req, res, next) {
  try {
    const { orderId } = req.params;
    const payment = await Payment.findOne({ orderId });
    if (!payment) {
      return sendProblem(res, {
        type: TYPE_CATALOGUE.ORDER_NOT_FOUND,
        title: 'Payment Not Found',
        status: 404,
        detail: `No payment transaction found for order '${orderId}'.`,
        instance: req.originalUrl
      });
    }
    res.json(payment);
  } catch (err) {
    next(err);
  }
}
