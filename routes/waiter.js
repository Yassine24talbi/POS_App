import express from 'express';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Order from '../models/Order.js';
import { verifyToken, checkRole } from '../middleware/auth.js';

const router = express.Router();

// Apply middleware
router.use(verifyToken, checkRole('waiter', 'admin'));

// Get all categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ order: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories.' });
  }
});

// Get all products
router.get('/products', async (req, res) => {
  try {
    const products = await Product.find({ isAvailable: true }).populate('category');
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products.' });
  }
});

// Create order (waiter creates, sends to cashier for payment)
router.post('/orders', async (req, res) => {
  try {
    const { items, tableNumber, notes } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Order must have at least one item.' });
    }

    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Assign unique orderNumber
    const lastOrder = await Order.findOne().sort({ createdAt: -1 });
    const orderNumber = lastOrder ? lastOrder.orderNumber + 1 : 1;
    
    const order = new Order({
      items,
      subtotal,
      total: subtotal,
      tableNumber,
      orderType: 'dine-in',
      waiter: req.user._id,
      notes,
      status: 'pending',
      isPaid: false,
      orderNumber // assign generated orderNumber
    });
    
    await order.save();

    res.status(201).json({ 
      message: 'Order created successfully.',
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        tableNumber: order.tableNumber,
        total: order.total
      }
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create order.' });
  }
});

// Get waiter's orders for today
router.get('/my-orders', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const orders = await Order.find({
      waiter: req.user._id,
      createdAt: { $gte: today }
    }).sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders.' });
  }
});

// Get ready orders (notifications)
router.get('/ready-orders', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const orders = await Order.find({
      waiter: req.user._id,
      createdAt: { $gte: today },
      status: 'ready'
    }).sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ready orders.' });
  }
});

// Mark order as served
router.put('/orders/:id/served', async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      waiter: req.user._id
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    order.status = 'served';
    await order.save();

    res.json({ message: 'Order marked as served.', order });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update order.' });
  }
});

// Get waiter stats
router.get('/stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const orders = await Order.find({
      waiter: req.user._id,
      createdAt: { $gte: today },
      status: { $ne: 'cancelled' }
    });

    const totalOrders = orders.length;
    const totalSales = orders.reduce((sum, order) => sum + order.total, 0);
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const readyOrders = orders.filter(o => o.status === 'ready').length;

    res.json({
      totalOrders,
      totalSales,
      pendingOrders,
      readyOrders
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

export default router;
