import express from 'express';
import Order from '../models/Order.js';
import { verifyToken, checkRole } from '../middleware/auth.js';

const router = express.Router();

// Apply middleware
router.use(verifyToken, checkRole('chef', 'admin'));

// Get kitchen orders (pending and preparing)
router.get('/orders', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const orders = await Order.find({
      createdAt: { $gte: today },
      status: { $in: ['pending', 'preparing'] }
    })
    .populate('waiter', 'name')
    .sort({ createdAt: 1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders.' });
  }
});

// Get completed orders (for reference)
router.get('/completed-orders', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const orders = await Order.find({
      createdAt: { $gte: today },
      status: { $in: ['ready', 'served', 'completed'] }
    })
    .populate('waiter', 'name')
    .sort({ createdAt: -1 })
    .limit(20);

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch completed orders.' });
  }
});

// Update order status to preparing
router.put('/orders/:id/preparing', async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: 'preparing' },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    res.json({ message: 'Order marked as preparing.', order });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update order.' });
  }
});

// Update order status to ready
router.put('/orders/:id/ready', async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: 'ready' },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    res.json({ message: 'Order marked as ready.', order });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update order.' });
  }
});

// Get stats for chef dashboard
router.get('/stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pendingCount = await Order.countDocuments({
      createdAt: { $gte: today },
      status: 'pending'
    });

    const preparingCount = await Order.countDocuments({
      createdAt: { $gte: today },
      status: 'preparing'
    });

    const completedCount = await Order.countDocuments({
      createdAt: { $gte: today },
      status: { $in: ['ready', 'served', 'completed'] }
    });

    res.json({
      pending: pendingCount,
      preparing: preparingCount,
      completed: completedCount
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

export default router;
