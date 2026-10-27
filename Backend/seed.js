import dotenv from 'dotenv';
dotenv.config();

import { Vendor } from './services/catalogue/models/Vendor.js';
import { Dish } from './services/catalogue/models/Dish.js';
import { Rider } from './services/delivery/models/Rider.js';
import { User } from './services/accounts/models/User.js';

export async function seedInitialData() {
  try {
    console.log('[Seed] Checking database seed records...');

    // 1. Seed Vendors
    const vendorCount = await Vendor.countDocuments();
    if (vendorCount === 0) {
      await Vendor.create([
        { vendorId: 'vendor-canteen', name: 'IIITV Central Canteen', campusLocation: 'Academic Block Ground Floor', isOpen: true },
        { vendorId: 'vendor-nightmess', name: 'Campus Night Mess', campusLocation: 'Hostel Block A Entrance', isOpen: true },
        { vendorId: 'vendor-nescafe', name: 'Nescafe & Juice Kiosk', campusLocation: 'Student Activity Hub', isOpen: true }
      ]);
      console.log('[Seed] Seeded campus food vendors.');
    }

    // 2. Seed Dishes (for Catalogue & GraphQL Assignment 7)
    const dishCount = await Dish.countDocuments();
    if (dishCount === 0) {
      await Dish.create([
        { dishId: 'dish-paneer-roll', name: 'Paneer Butter Roll', price: 90, available: true, category: 'Snacks', vendorId: 'vendor-canteen' },
        { dishId: 'dish-masala-dosa', name: 'Special Masala Dosa', price: 75, available: true, category: 'Meals', vendorId: 'vendor-canteen' },
        { dishId: 'dish-cold-coffee', name: 'Cold Coffee with Ice Cream', price: 60, available: true, category: 'Beverages', vendorId: 'vendor-nescafe' },
        { dishId: 'dish-veg-biryani', name: 'Hyderabadi Veg Biryani', price: 130, available: true, category: 'Meals', vendorId: 'vendor-nightmess' },
        { dishId: 'dish-maggi-cheese', name: 'Cheese Masala Maggi', price: 50, available: true, category: 'Snacks', vendorId: 'vendor-nightmess' }
      ]);
      console.log('[Seed] Seeded initial campus dishes.');
    }

    // 3. Seed Campus Delivery Riders
    const riderCount = await Rider.countDocuments();
    if (riderCount === 0) {
      await Rider.create([
        { riderId: 'rider-campus-01', name: 'Ramesh Patel (Campus Runner)', phone: '+91-9876543210', zone: 'Hostel Block A & B', isAvailable: true },
        { riderId: 'rider-campus-02', name: 'Suresh Kumar (Campus Runner)', phone: '+91-9876543211', zone: 'Academic & Lab Complex', isAvailable: true }
      ]);
      console.log('[Seed] Seeded campus delivery runners.');
    }

    // 4. Seed Student Profile
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      await User.create({
        studentId: '202351001',
        name: 'Ayush Kumar Dubey',
        email: '202351001@iiitvadodara.ac.in',
        phone: '+91-9123456789',
        addresses: [
          { title: 'Hostel Room', area: 'Hostel Block B, Room 304', landmark: 'Near Lift Lobby' },
          { title: 'Lab', area: 'CS Lab 2, Academic Block', landmark: 'Second Floor' }
        ]
      });
      console.log('[Seed] Seeded test student profile.');
    }

    console.log('[Seed] Database initialization complete.');
  } catch (err) {
    console.warn('[Seed Warning]', err.message);
  }
}

// Auto-seed if run directly
if (process.argv[1]?.endsWith('seed.js')) {
  seedInitialData().then(() => {
    console.log('Done.');
    process.exit(0);
  });
}
