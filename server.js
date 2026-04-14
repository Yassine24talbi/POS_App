import express from 'express';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';


dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use('/admin', express.static(path.join(__dirname, 'public/admin')));
app.use('/cashier', express.static(path.join(__dirname, 'public/cashier')));
app.use('/chef', express.static(path.join(__dirname, 'public/chef')));
app.use('/waiter', express.static(path.join(__dirname, 'public/waiter')));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pos_app';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Import Routes
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import cashierRoutes from './routes/cashier.js';
import chefRoutes from './routes/chef.js';
import waiterRoutes from './routes/waiter.js';

// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/cashier', cashierRoutes);
app.use('/api/chef', chefRoutes);
app.use('/api/waiter', waiterRoutes);

// Serve HTML Pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'dashboard.html'));
});

app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'dashboard.html'));
});

app.get('/cashier', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'cashier', 'index.html'));
});

app.get('/chef', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chef', 'index.html'));
});

app.get('/waiter', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'waiter', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
