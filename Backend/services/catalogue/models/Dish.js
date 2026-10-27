import mongoose from 'mongoose';
import { catalogueDb } from '../../../config/db.js';

const DishSchema = new mongoose.Schema({
  dishId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  available: { type: Boolean, default: true },
  category: { type: String, default: 'General' },
  vendorId: { type: String, default: 'vendor-canteen' }
}, { timestamps: true });

// Transform for GraphQL & JSON serialization: maps dishId to id
DishSchema.methods.toGraphQL = function() {
  return {
    id: this.dishId,
    name: this.name,
    price: this.price,
    available: this.available,
    category: this.category,
    vendorId: this.vendorId
  };
};

export const Dish = catalogueDb.model('Dish', DishSchema);
