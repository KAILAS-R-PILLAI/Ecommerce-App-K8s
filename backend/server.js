const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const amqp = require('amqplib');
const { S3Client } = require('@aws-sdk/client-s3');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const client = require('prom-client');

// Collect default system metrics
client.collectDefaultMetrics();

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

// Middleware
app.use(cors());
app.use(express.json());

// AWS S3 Configuration
const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  region: process.env.AWS_REGION
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// Models
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'admin' }
}, { timestamps: true });

const Admin = mongoose.model('Admin', adminSchema);

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String, required: true },
  stock: { type: Number, required: true, default: 10 }
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true },
  email: { type: String, required: true },
  product: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, default: 1 }
  },
  deliveryAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    zipCode: { type: String, required: true },
    phone: { type: String, required: true }
  },
  totalAmount: { type: Number, required: true },
  paymentMethod: { type: String, default: 'Cash on Delivery' },
  status: { type: String, default: 'Confirmed' },
  orderNumber: { type: String, unique: true }
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);

// RabbitMQ Setup for emails
let emailChannel;
const connectRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL);
    emailChannel = await connection.createChannel();
    await emailChannel.assertQueue('email_queue');
    console.log('RabbitMQ connected');

    emailChannel.consume('email_queue', async (message) => {
      if (message) {
        const emailData = JSON.parse(message.content.toString());
        await sendOrderConfirmationEmail(emailData);
        emailChannel.ack(message);
      }
    });
  } catch (error) {
    console.error('RabbitMQ connection error:', error);
  }
};
setTimeout(connectRabbitMQ, 10000);

// Nodemailer Email Service
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

const sendOrderConfirmationEmail = async (emailData) => {
  const { email, username, orderNumber, productName, totalAmount } = emailData;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Order Confirmation - ${orderNumber}`,
    html: `
      <h2>Order Confirmation</h2>
      <p>Hi ${username},</p>
      <p>Your order has been confirmed!</p>
      <p><strong>Order Number:</strong> ${orderNumber}</p>
      <p><strong>Product:</strong> ${productName}</p>
      <p><strong>Total Amount:</strong> $${totalAmount}</p>
      <p><strong>Payment Method:</strong> Cash on Delivery</p>
      <p>Thank you for your order!</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Email sending error:', error);
  }
};

// Auth Middleware
const authMiddleware = async (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const adminMiddleware = async (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.user.role !== 'admin') return res.status(403).json({ message: 'Access denied. Admin only.' });
    req.admin = decoded.user;
    next();
  } catch {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) return res.status(400).json({ message: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({ username, email, password: hashedPassword });
    await user.save();

    const payload = { user: { id: user.id, username: user.username, email: user.email, role: 'user' } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.json({ token, user: { username, email, role: 'user' } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const payload = { user: { id: user.id, username: user.username, email: user.email, role: 'user' } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.json({ token, user: { username: user.username, email: user.email, role: 'user' } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const payload = { user: { id: admin.id, username: admin.username, email: admin.email, role: 'admin' } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.json({ token, user: { username: admin.username, email: admin.email, role: 'admin' } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin routes
app.get('/api/admin/users', adminMiddleware, async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/admin/orders', adminMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({}).populate('user', 'username email').sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.patch('/api/admin/orders/:id', adminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/admin/stats', adminMiddleware, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalOrders = await Order.countDocuments();
    const totalRevenue = await Order.aggregate([{ $group: { _id: null, total: { $sum: '$totalAmount' } } }]);
    const recentOrders = await Order.find({}).sort({ createdAt: -1 }).limit(5);

    res.json({ totalUsers, totalOrders, totalRevenue: totalRevenue[0]?.total || 0, recentOrders });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// User dashboard
app.get('/api/user/dashboard', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json({ message: 'Welcome to your dashboard!', user: { username: user.username, email: user.email }, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Products
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find({});
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Orders
app.post('/api/orders', authMiddleware, async (req, res) => {
  try {
    const { productId, quantity, deliveryAddress } = req.body;
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (product.stock < quantity) return res.status(400).json({ message: 'Insufficient stock' });

    const orderNumber = 'ORD' + Date.now();
    const totalAmount = product.price * quantity;

    const order = new Order({
      user: req.user.id,
      username: req.user.username,
      email: req.user.email,
      product: { id: product._id, name: product.name, price: product.price, quantity },
      deliveryAddress,
      totalAmount,
      orderNumber
    });

    await order.save();
    product.stock -= quantity;
    await product.save();

    // Send email if RabbitMQ channel exists
    if (emailChannel) {
      emailChannel.sendToQueue('email_queue', Buffer.from(JSON.stringify({
        email: req.user.email,
        username: req.user.username,
        orderNumber,
        productName: product.name,
        totalAmount
      })));
    }

    res.status(201).json({ message: 'Order placed successfully', orderNumber, totalAmount, emailConfirmation: 'Email confirmation will be sent shortly' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/orders/my-orders', authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Manual Seed Route
app.post('/api/seed', async (req, res) => {
  try {
    await Admin.deleteMany({});
    await Product.deleteMany({});

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    await new Admin({ username: 'admin', email: 'admin@example.com', password: hashedPassword }).save();

    const sampleProductsSeed = [
      { name: 'Wireless Headphones', description: 'High-quality wireless headphones with noise cancellation', price: 99.99, image: process.env.HEADPHONES_IMAGE_URL, stock: 15 },
      { name: 'Smart Watch', description: 'Fitness tracking smart watch with heart rate monitor', price: 199.99, image: process.env.SMARTWATCH_IMAGE_URL, stock: 20 },
      { name: 'Laptop Stand', description: 'Adjustable aluminum laptop stand for better ergonomics', price: 49.99, image: process.env.LAPTOPSTAND_IMAGE_URL, stock: 25 }
    ];

    await Product.insertMany(sampleProductsSeed);

    res.json({ message: 'Data seeded successfully', admin: { username: 'admin', password: 'admin123' } });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Auto-seed on startup
const autoSeed = async () => {
  const adminExists = await Admin.countDocuments();
  if (!adminExists) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    await new Admin({ username: 'admin', email: 'admin@example.com', password: hashedPassword }).save();
  }

  const productExists = await Product.countDocuments();
  if (!productExists) {
    const sampleProductsAuto = [
      { name: 'Wireless Headphones', description: 'High-quality wireless headphones with noise cancellation', price: 99.99, image: process.env.HEADPHONES_IMAGE_URL, stock: 15 },
      { name: 'Smart Watch', description: 'Fitness tracking smart watch with heart rate monitor', price: 199.99, image: process.env.SMARTWATCH_IMAGE_URL, stock: 20 },
      { name: 'Laptop Stand', description: 'Adjustable aluminum laptop stand for better ergonomics', price: 49.99, image: process.env.LAPTOPSTAND_IMAGE_URL, stock: 25 }
    ];
    await Product.insertMany(sampleProductsAuto);
  }
};

mongoose.connection.once('open', () => {
  setTimeout(autoSeed, 2000);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
