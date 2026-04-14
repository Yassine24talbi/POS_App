import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Order from '../models/Order.js';
import PromoCode from '../models/PromoCode.js';
import CashRegister from '../models/CashRegister.js';
import { verifyToken, checkRole } from '../middleware/auth.js';

const router = express.Router();

// Apply middleware to all admin routes
router.use(verifyToken, checkRole('admin'));

// ============ DASHBOARD ============

// Get dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's orders
    const todayOrders = await Order.find({
      createdAt: { $gte: today, $lt: tomorrow },
      status: { $ne: 'cancelled' }
    });

    const todaySales = todayOrders.reduce((sum, order) => sum + order.total, 0);
    const todayOrderCount = todayOrders.length;

    // This week's sales
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekOrders = await Order.find({
      createdAt: { $gte: weekStart },
      status: { $ne: 'cancelled' }
    });
    const weekSales = weekOrders.reduce((sum, order) => sum + order.total, 0);

    // This month's sales
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthOrders = await Order.find({
      createdAt: { $gte: monthStart },
      status: { $ne: 'cancelled' }
    });
    const monthSales = monthOrders.reduce((sum, order) => sum + order.total, 0);

    // Best selling products
    const bestSellers = await Order.aggregate([
      { $match: { createdAt: { $gte: monthStart }, status: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.productName', totalQty: { $sum: '$items.quantity' }, totalSales: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } } },
      { $sort: { totalQty: -1 } },
      { $limit: 5 }
    ]);

    // Sales by waiter
    const waiterSales = await Order.aggregate([
      { $match: { createdAt: { $gte: today, $lt: tomorrow }, status: { $ne: 'cancelled' }, waiter: { $exists: true } } },
      { $group: { _id: '$waiter', totalSales: { $sum: '$total' }, orderCount: { $sum: 1 } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'waiterInfo' } },
      { $unwind: '$waiterInfo' },
      { $project: { name: '$waiterInfo.name', totalSales: 1, orderCount: 1 } }
    ]);

    // Recent orders
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('waiter', 'name')
      .populate('cashier', 'name');

    // User count
    const userCount = await User.countDocuments();
    const productCount = await Product.countDocuments();
    const categoryCount = await Category.countDocuments();

    res.json({
      todaySales,
      todayOrderCount,
      weekSales,
      monthSales,
      bestSellers,
      waiterSales,
      recentOrders,
      userCount,
      productCount,
      categoryCount
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data.' });
  }
});

// ============ USERS ============

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// Create user
router.post('/users', async (req, res) => {
  try {
    const { username, password, name, role } = req.body;

    if (!username || !password || !name || !role) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists.' });
    }

    const user = new User({
      username: username.toLowerCase(),
      password,
      name,
      role
    });

    await user.save();
    res.status(201).json({ message: 'User created successfully.', user: { id: user._id, username: user.username, name: user.name, role: user.role } });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user.' });
  }
});

// Update user
router.put('/users/:id', async (req, res) => {
  try {
    const { username, password, name, role, isActive } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (username) user.username = username.toLowerCase();
    if (name) user.name = name;
    if (role) user.role = role;
    if (typeof isActive === 'boolean') user.isActive = isActive;
    if (password) user.password = password;

    await user.save();
    res.json({ message: 'User updated successfully.' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user.' });
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last admin user.' });
      }
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});

// ============ CATEGORIES ============

// Get all categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find().sort({ order: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories.' });
  }
});

// Create category
router.post('/categories', async (req, res) => {
  try {
    const { name, description, color } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required.' });
    }

    const category = new Category({ name, description, color });
    await category.save();
    res.status(201).json({ message: 'Category created.', category });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Category name already exists.' });
    }
    res.status(500).json({ error: 'Failed to create category.' });
  }
});

// Update category
router.put('/categories/:id', async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!category) {
      return res.status(404).json({ error: 'Category not found.' });
    }
    res.json({ message: 'Category updated.', category });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update category.' });
  }
});

// Delete category
router.delete('/categories/:id', async (req, res) => {
  try {
    const productsInCategory = await Product.countDocuments({ category: req.params.id });
    if (productsInCategory > 0) {
      return res.status(400).json({ error: 'Cannot delete category with products. Remove or reassign products first.' });
    }

    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: 'Category deleted.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete category.' });
  }
});

// ============ PRODUCTS ============

// Get all products
router.get('/products', async (req, res) => {
  try {
    const products = await Product.find().populate('category').sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products.' });
  }
});

// Create product
router.post('/products', async (req, res) => {
  try {
    const { name, price, category, description, image, isAvailable, preparationTime } = req.body;

    if (!name || !price || !category) {
      return res.status(400).json({ error: 'Name, price, and category are required.' });
    }

    const product = new Product({
      name,
      price,
      category,
      description,
      image,
      isAvailable,
      preparationTime
    });

    await product.save();
    await product.populate('category');
    res.status(201).json({ message: 'Product created.', product });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product.' });
  }
});

// Update product
router.put('/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate('category');

    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    res.json({ message: 'Product updated.', product });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product.' });
  }
});

// Delete product
router.delete('/products/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product.' });
  }
});

// ============ PROMO CODES ============

// Get all promo codes
router.get('/promo-codes', async (req, res) => {
  try {
    const promoCodes = await PromoCode.find().sort({ createdAt: -1 });
    res.json(promoCodes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch promo codes.' });
  }
});

// Create promo code
router.post('/promo-codes', async (req, res) => {
  try {
    const { code, type, value, minOrderAmount, maxDiscount, usageLimit, validUntil } = req.body;

    if (!code || !type || !value || !validUntil) {
      return res.status(400).json({ error: 'Code, type, value, and valid until are required.' });
    }

    const promoCode = new PromoCode({
      code: code.toUpperCase(),
      type,
      value,
      minOrderAmount,
      maxDiscount,
      usageLimit,
      validUntil
    });

    await promoCode.save();
    res.status(201).json({ message: 'Promo code created.', promoCode });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Promo code already exists.' });
    }
    res.status(500).json({ error: 'Failed to create promo code.' });
  }
});

// Update promo code
router.put('/promo-codes/:id', async (req, res) => {
  try {
    const promoCode = await PromoCode.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!promoCode) {
      return res.status(404).json({ error: 'Promo code not found.' });
    }
    res.json({ message: 'Promo code updated.', promoCode });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update promo code.' });
  }
});

// Delete promo code
router.delete('/promo-codes/:id', async (req, res) => {
  try {
    await PromoCode.findByIdAndDelete(req.params.id);
    res.json({ message: 'Promo code deleted.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete promo code.' });
  }
});

// ============ ORDERS ============

// Get all orders with filters
router.get('/orders', async (req, res) => {
  try {
    const { date, status, waiter } = req.query;
    let query = {};

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: startDate, $lte: endDate };
    }

    if (status) query.status = status;
    if (waiter) query.waiter = waiter;

    const orders = await Order.find(query)
      .populate('waiter', 'name')
      .populate('cashier', 'name')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders.' });
  }
});

// ============ CASH REGISTER REPORTS ============

// Get cash register reports
router.get('/cash-registers', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = {};

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const reports = await CashRegister.find(query)
      .populate('cashier', 'name')
      .sort({ closedAt: -1 });

    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cash register reports.' });
  }
});

export default router;
