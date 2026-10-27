import mongoose from 'mongoose';
import { ordersDb } from '../../../config/db.js';

const OrderItemSchema = new mongoose.Schema({
  itemId: { type: String, required: true },
  nameSnapshot: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPriceInr: { type: Number, required: true, min: 0 }
}, { _id: false });

const OrderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true, index: true },
  studentId: { type: String, required: true, index: true },
  vendorId: { type: String, required: true },
  deliveryAddress: { type: String, required: true },
  status: {
    type: String,
    enum: ['CREATED', 'PAID', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
    default: 'CREATED'
  },
  items: [OrderItemSchema],
  totalAmountInr: { type: Number, required: true, min: 0 },
  estimatedMinutes: { type: Number, default: 25 },
  
  // Assignment 4 C2: Internal storage fields (must never leak into public representation)
  internalSequenceNumber: { type: Number, default: () => Math.floor(100000 + Math.random() * 900000) },
  paymentGatewayToken: { type: String, select: true },
  idempotencyKey: { type: String, unique: true, sparse: true, index: true },
  versionEtag: { type: Number, default: 1 }
}, { timestamps: true });

/**
 * Assignment 4 (C2): Separate Record from Representation
 * Returns the published JSON contract shape. Internal sequence numbers,
 * secrets, and gateway raw tokens are strictly omitted.
 */
OrderSchema.methods.as_json = function() {
  return {
    orderId: this.orderId,
    studentId: this.studentId,
    vendorId: this.vendorId,
    deliveryAddress: this.deliveryAddress,
    status: this.status,
    items: this.items.map(item => ({
      itemId: item.itemId,
      name: item.nameSnapshot,
      quantity: item.quantity,
      unitPriceInr: item.unitPriceInr,
      lineTotalInr: Number((item.quantity * item.unitPriceInr).toFixed(2))
    })),
    totalAmountInr: this.totalAmountInr,
    estimatedMinutes: this.estimatedMinutes,
    createdAt: this.createdAt
  };
};

export const Order = ordersDb.model('Order', OrderSchema);
