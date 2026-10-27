import { Order } from './models/Order.js';
import { Dish } from '../catalogue/models/Dish.js';
import { Payment } from '../payments/models/Payment.js';
import { Delivery } from '../delivery/models/Delivery.js';
import { sendEmailViaResend } from '../notifications/resendClient.js';
import { sendProblem, TYPE_CATALOGUE } from '../../utils/problem.js';
import { generateETag, checkIfNoneMatch, checkIfMatch } from '../../utils/etag.js';
import { sendNegotiated } from '../../utils/contentNegotiator.js';

/**
 * CS543 Assignment 6 (C1, C2): Multi-Field Request Validation
 * Validates before acting and collects all errors, not just the first.
 */
function validateOrderPayload(body) {
  const errors = [];

  if (!body.studentId || typeof body.studentId !== 'string' || body.studentId.trim() === '') {
    errors.push({ field: 'studentId', reason: 'studentId is required and must be a valid string.' });
  }

  if (!body.deliveryAddress || typeof body.deliveryAddress !== 'string' || body.deliveryAddress.trim() === '') {
    errors.push({ field: 'deliveryAddress', reason: 'deliveryAddress is required.' });
  }

  if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
    errors.push({ field: 'items', reason: 'items array cannot be empty. Must include at least one dish.' });
  } else {
    body.items.forEach((item, index) => {
      if (!item.itemId) {
        errors.push({ field: `items[${index}].itemId`, reason: 'itemId is required.' });
      }
      if (item.quantity === undefined || !Number.isInteger(item.quantity) || item.quantity < 1) {
        errors.push({ field: `items[${index}].quantity`, reason: 'quantity must be an integer >= 1.' });
      }
    });
  }

  return errors;
}

/**
 * Assignment 4, 5, 6 & Tutorial 2: Central Orchestrator Operation - placeOrder
 */
export async function placeOrder(req, res, next) {
  try {
    const idempotencyKey = req.headers['idempotency-key'];

    // 1. Check Idempotency Key (Assignment 4 C7 & Assignment 5 C3)
    if (idempotencyKey) {
      const existing = await Order.findOne({ idempotencyKey });
      if (existing) {
        res.setHeader('Location', `/api/v1/orders/${existing.orderId}`);
        res.setHeader('ETag', generateETag(existing.as_json()));
        return res.status(200).json({
          ...existing.as_json(),
          idempotentReplay: true
        });
      }
    }

    // 2. Validate request body collecting ALL validation failures (Assignment 6 C1, C2)
    const validationErrors = validateOrderPayload(req.body);
    if (validationErrors.length > 0) {
      const isEmptyCart = validationErrors.some(e => e.field === 'items');
      return sendProblem(res, {
        type: isEmptyCart ? TYPE_CATALOGUE.EMPTY_CART : TYPE_CATALOGUE.VALIDATION_ERROR,
        title: isEmptyCart ? 'Empty Cart' : 'Validation Error',
        status: 422,
        detail: 'The submitted order payload contains invalid or missing fields.',
        instance: req.originalUrl,
        errors: validationErrors
      });
    }

    const { studentId, vendorId, deliveryAddress, items, paymentMethod } = req.body;

    // 3. Tutorial 2: Cross-Service Call -> Catalogue.checkItem
    // Verify each item's availability and fetch authoritative price
    const validatedItems = [];
    let calculatedTotal = 0;

    for (const item of items) {
      const dish = await Dish.findOne({ dishId: item.itemId });
      if (!dish) {
        return sendProblem(res, {
          type: TYPE_CATALOGUE.ITEM_UNAVAILABLE,
          title: 'Item Unavailable',
          status: 404,
          detail: `Dish with ID '${item.itemId}' does not exist in the catalogue.`,
          instance: req.originalUrl
        });
      }

      if (!dish.available) {
        return sendProblem(res, {
          type: TYPE_CATALOGUE.ITEM_UNAVAILABLE,
          title: 'Item Sold Out',
          status: 422,
          detail: `Item '${dish.name}' is currently out of stock.`,
          instance: req.originalUrl
        });
      }

      const lineTotal = dish.price * item.quantity;
      calculatedTotal += lineTotal;

      validatedItems.push({
        itemId: dish.dishId,
        nameSnapshot: dish.name,
        quantity: item.quantity,
        unitPriceInr: dish.price
      });
    }

    const orderId = `ord-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    // 4. Tutorial 2: Cross-Service Call -> Payments.charge
    // Simulate payment transaction
    if (paymentMethod === 'DECLINE_TEST') {
      return sendProblem(res, {
        type: TYPE_CATALOGUE.PAYMENT_DECLINED,
        title: 'Payment Declined',
        status: 422,
        detail: 'Your payment was declined by the campus payment gateway. Order aborted.',
        instance: req.originalUrl
      });
    }

    const paymentId = `pay-${Date.now().toString(36)}`;
    await Payment.create({
      paymentId,
      orderId,
      studentId,
      amountInr: calculatedTotal,
      paymentMethod: paymentMethod || 'CAMPUS_WALLET',
      status: 'CAPTURED',
      idempotencyKey: idempotencyKey ? `pay-${idempotencyKey}` : undefined
    });

    // 5. Tutorial 2: Cross-Service Call -> Delivery.assignRider
    const deliveryId = `del-${Date.now().toString(36)}`;
    await Delivery.create({
      deliveryId,
      orderId,
      riderId: 'rider-campus-01',
      pickupLocation: 'Campus Food Hub',
      dropoffAddress: deliveryAddress,
      status: 'ASSIGNED',
      estimatedMinutes: 20
    });

    // 6. Create durable Order record
    const order = await Order.create({
      orderId,
      studentId,
      vendorId: vendorId || 'vendor-canteen',
      deliveryAddress,
      status: 'PAID',
      items: validatedItems,
      totalAmountInr: calculatedTotal,
      estimatedMinutes: 20,
      paymentGatewayToken: `token-${Math.random().toString(36).substring(2, 8)}`,
      idempotencyKey,
      versionEtag: 1
    });

    // 7. Tutorial 2: Cross-Service Call -> Notifications.send (Resend)
    sendEmailViaResend({
      to: `${studentId}@iiitvadodara.ac.in`,
      subject: `CampusEats Order Placed: #${order.orderId}`,
      text: `Your order #${order.orderId} for INR ${order.totalAmountInr} has been confirmed and dispatched for preparation!`
    }).catch(err => console.warn('[Notification Error]', err.message));

    // 8. Assignment 4 C5 & Assignment 6 A3: 201 Created with Location header
    const representation = order.as_json();
    const etag = generateETag(representation);

    res.setHeader('Location', `/api/v1/orders/${order.orderId}`);
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'public, max-age=60');

    return res.status(201).json(representation);
  } catch (err) {
    next(err);
  }
}

/**
 * Assignment 4 C3, Assignment 5 B4, C1 & Assignment 6 C3: getOrder
 */
export async function getOrder(req, res, next) {
  try {
    const { id } = req.params;
    const order = await Order.findOne({ orderId: id });

    if (!order) {
      return sendProblem(res, {
        type: TYPE_CATALOGUE.ORDER_NOT_FOUND,
        title: 'Order Not Found',
        status: 404,
        detail: `Order with reference '${id}' does not exist.`,
        instance: req.originalUrl
      });
    }

    const representation = order.as_json();
    const currentETag = generateETag(representation);

    // Assignment 5 (C1): Conditional GET -> 304 Not Modified
    if (checkIfNoneMatch(req, currentETag)) {
      res.setHeader('ETag', currentETag);
      res.setHeader('Cache-Control', 'public, max-age=60');
      return res.status(304).end(); // No body on 304!
    }

    res.setHeader('ETag', currentETag);
    res.setHeader('Cache-Control', 'public, max-age=60');

    // Assignment 6 (C3): Content negotiation (JSON / XML)
    return sendNegotiated(req, res, 200, representation, 'order');
  } catch (err) {
    next(err);
  }
}

/**
 * Assignment 5 (A4): Filtered reads with Query Parameters
 */
export async function listOrders(req, res, next) {
  try {
    const { student_id, status, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (student_id) filter.studentId = student_id;
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Order.countDocuments(filter);

    res.json({
      page: Number(page),
      limit: Number(limit),
      totalCount: total,
      orders: orders.map(o => o.as_json())
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Assignment 5 (A2) & Assignment 6 (B2): Non-CRUD sub-resource: POST /orders/:id/cancel
 */
export async function cancelOrder(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const order = await Order.findOne({ orderId: id });
    if (!order) {
      return sendProblem(res, {
        type: TYPE_CATALOGUE.ORDER_NOT_FOUND,
        title: 'Order Not Found',
        status: 404,
        detail: `Cannot cancel: Order '${id}' does not exist.`,
        instance: req.originalUrl
      });
    }

    // State machine guard: Cannot cancel already DELIVERED or CANCELLED order (409 Conflict)
    if (['DELIVERED', 'CANCELLED'].includes(order.status)) {
      return sendProblem(res, {
        type: TYPE_CATALOGUE.ILLEGAL_TRANSITION,
        title: 'Illegal State Transition',
        status: 409,
        detail: `Order '${id}' is in status '${order.status}' and cannot be cancelled.`,
        instance: req.originalUrl
      });
    }

    order.status = 'CANCELLED';
    order.versionEtag += 1;
    await order.save();

    // Trigger refund on Payments Service
    const payment = await Payment.findOne({ orderId: id, status: 'CAPTURED' });
    if (payment) {
      payment.status = 'REFUNDED';
      payment.refundReason = reason || 'Customer requested cancellation';
      await payment.save();
    }

    res.json({
      orderId: order.orderId,
      status: order.status,
      cancellationReason: reason || 'Requested by customer'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Assignment 5 (C2): Conditional write supporting If-Match (412 Precondition Failed)
 */
export async function updateOrder(req, res, next) {
  try {
    const { id } = req.params;
    const order = await Order.findOne({ orderId: id });

    if (!order) {
      return sendProblem(res, {
        type: TYPE_CATALOGUE.ORDER_NOT_FOUND,
        title: 'Order Not Found',
        status: 404,
        detail: `Order '${id}' not found.`,
        instance: req.originalUrl
      });
    }

    const currentETag = generateETag(order.as_json());

    // Check If-Match header
    if (!checkIfMatch(req, currentETag)) {
      return sendProblem(res, {
        type: TYPE_CATALOGUE.PRECONDITION_FAILED,
        title: 'Precondition Failed',
        status: 412,
        detail: `Resource version mismatch. The resource has been updated by another client. Current ETag: ${currentETag}`,
        instance: req.originalUrl
      });
    }

    const { status, deliveryAddress } = req.body;
    if (status) order.status = status;
    if (deliveryAddress) order.deliveryAddress = deliveryAddress;
    order.versionEtag += 1;
    await order.save();

    const updatedRepresentation = order.as_json();
    res.setHeader('ETag', generateETag(updatedRepresentation));
    res.json(updatedRepresentation);
  } catch (err) {
    next(err);
  }
}

/**
 * Assignment 5 (A5): OPTIONS on resource returning Allow header
 */
export function optionsOrder(req, res) {
  res.setHeader('Allow', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.status(204).end();
}
