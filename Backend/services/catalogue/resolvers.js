import { Dish } from './models/Dish.js';

export const resolvers = {
  Query: {
    dishes: async (_, { category, available }) => {
      const filter = {};
      if (category) filter.category = category;
      if (available !== undefined) filter.available = available;
      const results = await Dish.find(filter);
      return results.map(d => d.toGraphQL());
    },
    dish: async (_, { id }) => {
      const d = await Dish.findOne({ dishId: id });
      return d ? d.toGraphQL() : null;
    }
  },
  Mutation: {
    addDish: async (_, { input }) => {
      const dishId = `dish-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      const newDish = await Dish.create({
        dishId,
        name: input.name,
        price: input.price,
        available: input.available !== undefined ? input.available : true,
        category: input.category || 'Special',
        vendorId: input.vendorId || 'vendor-canteen'
      });
      return newDish.toGraphQL();
    },
    updateDish: async (_, { id, input }) => {
      const dish = await Dish.findOne({ dishId: id });
      if (!dish) return null;
      if (input.price !== undefined) dish.price = input.price;
      if (input.available !== undefined) dish.available = input.available;
      await dish.save();
      return dish.toGraphQL();
    }
  }
};
