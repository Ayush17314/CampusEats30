import { Rider } from './models/Rider.js';
import { Delivery } from './models/Delivery.js';
import { sendProblem, TYPE_CATALOGUE } from '../../utils/problem.js';

export async function listRiders(req, res, next) {
  try {
    const riders = await Rider.find();
    res.json(riders);
  } catch (err) {
    next(err);
  }
}

/**
 * CS543 Tutorial 2: Delivery Published Operation
 * Orders calls: assignRider(orderId, pickupLocation, dropoffAddress)
 */
export async function assignRider(req, res, next) {
  try {
    const { orderId, pickupLocation, dropoffAddress } = req.body;

    if (!orderId || !dropoffAddress) {
      return sendProblem(res, {
        type: TYPE_CATALOGUE.VALIDATION_ERROR,
        title: 'Validation Error',
        status: 422,
        detail: 'orderId and dropoffAddress are required to assign a delivery runner.',
        instance: req.originalUrl
      });
    }

    // Check if delivery is already assigned
    const existing = await Delivery.findOne({ orderId });
    if (existing) {
      return res.status(200).json(existing);
    }

    // Find available runner or assign primary campus runner
    let rider = await Rider.findOne({ isAvailable: true });
    if (!rider) {
      rider = await Rider.findOne(); // Fallback to any registered rider
    }

    const deliveryId = `del-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const delivery = await Delivery.create({
      deliveryId,
      orderId,
      riderId: rider ? rider.riderId : 'rider-default-iiitv',
      pickupLocation: pickupLocation || 'Central Canteen Hub',
      dropoffAddress,
      status: 'ASSIGNED',
      estimatedMinutes: 20
    });

    res.status(201).json(delivery);
  } catch (err) {
    next(err);
  }
}

export async function getDeliveryStatus(req, res, next) {
  try {
    const { orderId } = req.params;
    const delivery = await Delivery.findOne({ orderId });
    if (!delivery) {
      return sendProblem(res, {
        type: TYPE_CATALOGUE.ORDER_NOT_FOUND,
        title: 'Delivery Not Found',
        status: 404,
        detail: `No delivery assignment found for order '${orderId}'.`,
        instance: req.originalUrl
      });
    }
    res.json(delivery);
  } catch (err) {
    next(err);
  }
}

export async function updateDeliveryStatus(req, res, next) {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const delivery = await Delivery.findOne({ orderId });
    if (!delivery) {
      return sendProblem(res, {
        type: TYPE_CATALOGUE.ORDER_NOT_FOUND,
        title: 'Delivery Not Found',
        status: 404,
        detail: `Delivery for order '${orderId}' was not found.`,
        instance: req.originalUrl
      });
    }

    delivery.status = status;
    if (status === 'DELIVERED') {
      delivery.deliveredAt = new Date();
    }
    await delivery.save();

    res.json(delivery);
  } catch (err) {
    next(err);
  }
}
