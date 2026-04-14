import mongoose from 'mongoose';

const cashRegisterSchema = new mongoose.Schema({
  cashier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  // Cash count by denomination
  bills200: {
    type: Number,
    default: 0
  },
  bills100: {
    type: Number,
    default: 0
  },
  bills50: {
    type: Number,
    default: 0
  },
  bills20: {
    type: Number,
    default: 0
  },
  coins: {
    type: Number,
    default: 0
  },
  // Calculated totals
  countedTotal: {
    type: Number,
    required: true
  },
  expectedTotal: {
    type: Number,
    required: true
  },
  difference: {
    type: Number,
    required: true
  },
  // Statistics
  totalOrders: {
    type: Number,
    default: 0
  },
  cashOrders: {
    type: Number,
    default: 0
  },
  cardOrders: {
    type: Number,
    default: 0
  },
  notes: String,
  closedAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('CashRegister', cashRegisterSchema);
