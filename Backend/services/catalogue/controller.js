import { Dish } from './models/Dish.js';
import { Vendor } from './models/Vendor.js';
import { sendProblem, TYPE_CATALOGUE } from '../../utils/problem.js';

export async function listVendors(req, res, next) {
  try {
    const vendors = await Vendor.find({ isOpen: true });
    res.json(vendors);
  } catch (err) {
    next(err);
  }
}

export async function listDishes(req, res, next) {
  try {
    const { category, vendorId, available } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (vendorId) filter.vendorId = vendorId;
    if (available !== undefined) filter.available = available === 'true';

    const dishes = await Dish.find(filter);
    res.json(dishes.map(d => d.toGraphQL()));
  } catch (err) {
    next(err);
  }
}

export async function getDish(req, res, next) {
  try {
    const { id } = req.params;
    const dish = await Dish.findOne({ dishId: id });
    if (!dish) {
      return sendProblem(res, {
        type: TYPE_CATALOGUE.ITEM_UNAVAILABLE,
        title: 'Dish Not Found',
        status: 404,
        detail: `Dish with ID '${id}' does not exist in the catalogue.`,
        instance: req.originalUrl
      });
    }
    res.json(dish.toGraphQL());
  } catch (err) {
    next(err);
  }
}

/**
 * CS543 Tutorial 2: The Catalogue Published Operation
 * Called by Orders service: checkItem(itemId) -> { available, price, name }
 */
export async function checkItem(req, res, next) {
  try {
    const { itemId } = req.params;
    const dish = await Dish.findOne({ dishId: itemId });

    if (!dish) {
      return sendProblem(res, {
        type: TYPE_CATALOGUE.ITEM_UNAVAILABLE,
        title: 'Item Unavailable',
        status: 404,
        detail: `Item '${itemId}' was not found in catalogue.`,
        instance: req.originalUrl
      });
    }

    if (!dish.available) {
      return sendProblem(res, {
        type: TYPE_CATALOGUE.ITEM_UNAVAILABLE,
        title: 'Item Sold Out',
        status: 422,
        detail: `Item '${dish.name}' (${itemId}) is currently sold out.`,
        instance: req.originalUrl
      });
    }

    res.json({
      itemId: dish.dishId,
      name: dish.name,
      price: dish.price,
      available: dish.available
    });
  } catch (err) {
    next(err);
  }
}

export async function setAvailability(req, res, next) {
  try {
    const { id } = req.params;
    const { available, price } = req.body;

    const dish = await Dish.findOne({ dishId: id });
    if (!dish) {
      return sendProblem(res, {
        type: TYPE_CATALOGUE.ITEM_UNAVAILABLE,
        title: 'Item Not Found',
        status: 404,
        detail: `Dish with ID '${id}' not found.`,
        instance: req.originalUrl
      });
    }

    if (available !== undefined) dish.available = Boolean(available);
    if (price !== undefined && price >= 0) dish.price = Number(price);

    await dish.save();
    res.json(dish.toGraphQL());
  } catch (err) {
    next(err);
  }
}

export async function addDish(req, res, next) {
  try {
    const { name, price, category, vendorId, available } = req.body;
    if (!name || price === undefined) {
      return sendProblem(res, {
        type: TYPE_CATALOGUE.VALIDATION_ERROR,
        title: 'Validation Error',
        status: 422,
        detail: 'Name and price are required to add a dish.',
        instance: req.originalUrl
      });
    }

    const dishId = `dish-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const dish = await Dish.create({
      dishId,
      name,
      price: Number(price),
      category: category || 'General',
      vendorId: vendorId || 'vendor-canteen',
      available: available !== undefined ? available : true
    });

    res.status(201).json(dish.toGraphQL());
  } catch (err) {
    next(err);
  }
}
