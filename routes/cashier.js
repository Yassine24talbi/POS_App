import express from 'express';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Order from '../models/Order.js';
import PromoCode from '../models/PromoCode.js';
import CashRegister from '../models/CashRegister.js';
import { verifyToken, checkRole } from '../middleware/auth.js';

const router = express.Router();

// Apply middleware
router.use(verifyToken, checkRole('cashier', 'admin'));

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

// Validate promo code
router.post('/validate-promo', async (req, res) => {
  try {
    const { code, orderTotal } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Promo code is required.' });
    }

    const promoCode = await PromoCode.findOne({ code: code.toUpperCase() });

    if (!promoCode) {
      return res.status(404).json({ error: 'Promo code not found.' });
    }

    if (!promoCode.isValid()) {
      return res.status(400).json({ error: 'Promo code is expired or no longer valid.' });
    }

    if (orderTotal < promoCode.minOrderAmount) {
      return res.status(400).json({ 
        error: `Minimum order amount is ${promoCode.minOrderAmount} DH.` 
      });
    }

    const discount = promoCode.calculateDiscount(orderTotal);

    res.json({
      valid: true,
      promoCode: {
        id: promoCode._id,
        code: promoCode.code,
        type: promoCode.type,
        value: promoCode.value
      },
      discount
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to validate promo code.' });
  }
});

// Create order
router.post('/orders', async (req, res) => {
  try {
    const { 
      items, 
      subtotal, 
      promoCodeId, 
      discount, 
      total, 
      tableNumber, 
      orderType, 
      paymentMethod,
      paidAmount,
      notes,
      waiterId,
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Order must have at least one item.' });
    }

    // If promo code was used, increment usage count
    if (promoCodeId) {
      await PromoCode.findByIdAndUpdate(promoCodeId, { $inc: { usedCount: 1 } });
    }
    // Get the last order and increment order number
    const lastOrder = await Order.findOne().sort({ createdAt: -1 });
    const orderNumber = lastOrder ? lastOrder.orderNumber + 1 : 1;

    const order = new Order({
      items,
      subtotal,
      promoCode: promoCodeId,
      discount: discount || 0,
      total,
      tableNumber,
      orderNumber,
      orderType: orderType || 'dine-in',
      waiter: waiterId,
      cashier: req.user._id,
      paymentMethod: paymentMethod || 'cash',
      paidAmount: paidAmount || total,
      changeAmount: (paidAmount || total) - total,
      isPaid: true,
      notes,
      status: 'pending'
    });

    await order.save();

    res.status(201).json({ 
      message: 'Order created successfully.',
      order: {
        id: order._id,
        orderType: orderType || 'dine-in',
        orderNumber: order.orderNumber,
        total: order.total,
        changeAmount: order.changeAmount
      }
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create order.' });
  }
});


// Get order for printing
router.get('/orders/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('waiter', 'name')
      .populate('cashier', 'name');

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order.' });
  }
});

// Get today's order count (NOT the total amount - cashier should not see this)
router.get('/today-stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const orderCount = await Order.countDocuments({
      cashier: req.user._id,
      createdAt: { $gte: today, $lt: tomorrow },
      status: { $ne: 'cancelled' }
    });

    // Return only order count, NOT the total amount
    res.json({ orderCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

// Close register - cashier enters bill counts, system calculates and compares
router.post('/close-register', async (req, res) => {
  try {
    const { bills200, bills100, bills50, bills20, coins, notes } = req.body;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Calculate counted total from cashier's input
    const countedTotal = 
      (bills200 || 0) * 200 +
      (bills100 || 0) * 100 +
      (bills50 || 0) * 50 +
      (bills20 || 0) * 20 +
      (coins || 0);

    // Get today's cash orders for this cashier (expected amount)
    const todayOrders = await Order.find({
      cashier: req.user._id,
      createdAt: { $gte: today, $lt: tomorrow },
      status: { $ne: 'cancelled' },
      paymentMethod: 'cash'
    });

    const expectedTotal = todayOrders.reduce((sum, order) => sum + order.total, 0);
    const difference = countedTotal - expectedTotal;

    const totalOrders = await Order.countDocuments({
      cashier: req.user._id,
      createdAt: { $gte: today, $lt: tomorrow },
      status: { $ne: 'cancelled' }
    });

    const cashOrders = todayOrders.length;
    const cardOrders = totalOrders - cashOrders;

    // Create cash register record
    const cashRegister = new CashRegister({
      cashier: req.user._id,
      date: today,
      bills200: bills200 || 0,
      bills100: bills100 || 0,
      bills50: bills50 || 0,
      bills20: bills20 || 0,
      coins: coins || 0,
      countedTotal,
      expectedTotal,
      difference,
      totalOrders,
      cashOrders,
      cardOrders,
      notes
    });

    await cashRegister.save();

    // NOW reveal the expected total and difference to cashier
    res.json({
      message: 'Register closed successfully.',
      summary: {
        countedTotal,
        expectedTotal,
        difference,
        totalOrders,
        cashOrders,
        cardOrders,
        status: difference === 0 ? 'balanced' : (difference > 0 ? 'over' : 'short')
      }
    });
  } catch (error) {
    console.error('Close register error:', error);
    res.status(500).json({ error: 'Failed to close register.' });
  }
});

// Get pending orders for the kitchen (for display)
router.get('/pending-orders', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const orders = await Order.find({
      createdAt: { $gte: today },
      status: { $in: ['pending', 'preparing'] }
    }).sort({ createdAt: 1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pending orders.' });
  }
});

export default router;
