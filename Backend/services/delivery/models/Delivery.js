import mongoose from 'mongoose';
import { deliveryDb } from '../../../config/db.js';

const DeliverySchema = new mongoose.Schema({
  deliveryId: { type: String, required: true, unique: true, index: true },
  orderId: { type: String, required: true, unique: true, index: true }, // Opaque ref to Orders
  riderId: { type: String, required: true },
  pickupLocation: { type: String, required: true },
  dropoffAddress: { type: String, required: true },
  status: {
    type: String,
    enum: ['ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
    default: 'ASSIGNED'
  },
  estimatedMinutes: { type: Number, default: 20 },
  assignedAt: { type: Date, default: Date.now },
  deliveredAt: { type: Date }
}, { timestamps: true });

export const Delivery = deliveryDb.model('Delivery', DeliverySchema);
