import mongoose from 'mongoose';
import { deliveryDb } from '../../../config/db.js';

const RiderSchema = new mongoose.Schema({
  riderId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  zone: { type: String, default: 'Campus Hostel Zone' },
  isAvailable: { type: Boolean, default: true }
}, { timestamps: true });

export const Rider = deliveryDb.model('Rider', RiderSchema);
