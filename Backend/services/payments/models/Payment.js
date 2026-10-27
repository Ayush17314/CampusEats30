import mongoose from 'mongoose';
import { paymentsDb } from '../../../config/db.js';

const PaymentSchema = new mongoose.Schema({
  paymentId: { type: String, required: true, unique: true, index: true },
  orderId: { type: String, required: true, index: true }, // Opaque logical ref to Orders
  studentId: { type: String, required: true },
  amountInr: { type: Number, required: true, min: 0 },
  paymentMethod: { type: String, default: 'UPI' },
  status: { type: String, required: true, enum: ['CAPTURED', 'DECLINED', 'REFUNDED'], default: 'CAPTURED' },
  gatewayRef: { type: String },
  idempotencyKey: { type: String, unique: true, sparse: true },
  refundReason: { type: String }
}, { timestamps: true });

export const Payment = paymentsDb.model('Payment', PaymentSchema);
