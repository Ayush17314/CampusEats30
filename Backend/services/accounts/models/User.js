import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { accountsDb } from '../../../config/db.js';

const AddressSchema = new mongoose.Schema({
  title: { type: String, required: true }, // e.g. "Hostel Block B, Room 304"
  area: { type: String, required: true },  // e.g. "Campus Hostel"
  landmark: { type: String, default: '' }
}, { _id: true });

const UserSchema = new mongoose.Schema({
  studentId: { type: String, required: true, unique: true, index: true }, // e.g. "202351001" or "restaurant-canteen"
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, default: '+91-9876543210' },
  passwordHash: { type: String, required: true },
  role: {
    type: String,
    enum: ['customer', 'restaurant', 'admin'],
    default: 'customer'
  },
  addresses: [AddressSchema],
  createdAt: { type: Date, default: Date.now }
});

UserSchema.methods.comparePassword = function(candidatePassword) {
  return bcrypt.compareSync(candidatePassword, this.passwordHash);
};

export const User = accountsDb.model('User', UserSchema);
