import mongoose from 'mongoose';
import { catalogueDb } from '../../../config/db.js';

const VendorSchema = new mongoose.Schema({
  vendorId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  campusLocation: { type: String, required: true }, // e.g. "Campus Central Canteen"
  isOpen: { type: Boolean, default: true }
}, { timestamps: true });

export const Vendor = catalogueDb.model('Vendor', VendorSchema);
