import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: String,
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true
  },
  notes: String
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: Number,
    required: true
  },
  items: [orderItemSchema],
  subtotal: {
    type: Number,
    required: true
  },
  discount: {
    type: Number,
    default: 0
  },
  promoCode: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PromoCode'
  },
  promoCodeUsed: String,
  total: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'preparing', 'ready', 'served', 'completed', 'cancelled'],
    default: 'pending'
  },
  tableNumber: {
    type: Number
  },
  orderType: {
    type: String,
    enum: ['dine-in', 'takeaway'],
    default: 'dine-in'
  },
  waiter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cashier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card'],
    default: 'cash'
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  changeAmount: {
    type: Number,
    default: 0
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date
});

// Auto-generate order number
orderSchema.pre('save', async function(next) {
  if (this.isNew) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const count = await mongoose.model('Order').countDocuments({
      createdAt: { $gte: today }
    });
    this.orderNumber = count + 1;
  }
  next();
});

export default mongoose.model('Order', orderSchema);
