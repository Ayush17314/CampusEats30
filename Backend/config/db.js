import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_BASE_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';

/**
 * CS543 Tutorial 2 Golden Rule:
 * "Each service owns its own database. No shared tables/collections anywhere."
 * 
 * We create independent Mongoose connections for each microservice boundary.
 */
function createServiceDb(serviceName) {
  const uri = `${MONGO_BASE_URI}/campuseats_${serviceName}`;
  const connection = mongoose.createConnection(uri);

  connection.on('connected', () => {
    console.log(`[Database] Connected to ${serviceName} service DB (${uri})`);
  });

  connection.on('error', (err) => {
    console.error(`[Database Error] ${serviceName} DB failed:`, err.message);
  });

  return connection;
}

export const accountsDb = createServiceDb('accounts');
export const catalogueDb = createServiceDb('catalogue');
export const ordersDb = createServiceDb('orders');
export const paymentsDb = createServiceDb('payments');
export const deliveryDb = createServiceDb('delivery');
export const notificationsDb = createServiceDb('notifications');
