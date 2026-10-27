import mongoose from 'mongoose';
import { accountsDb } from '../../../config/db.js';

const AddressSchema = new mongoose.Schema({
  title: { type: String, required: true }, // e.g. "Hostel Block B, Room 304"
  area: { type: String, required: true },  // e.g. "Campus Hostel"
  landmark: { type: String, default: '' }
}, { _id: true });

const UserSchema = new mongoose.Schema({
  studentId: { type: String, required: true, unique: true, index: true }, // e.g. "202351001"
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  addresses: [AddressSchema],
  createdAt: { type: Date, default: Date.now }
});

export const User = accountsDb.model('User', UserSchema);
