const express = require('express');
const mongoose = require('mongoose');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// MySQL Connection Pool for Customer Login
const mysqlPool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '', // Change this to your MySQL password
  database: 'freshdairy',
  waitForConnections: true,
  connectionLimit: 10
});

// Initialize MySQL Database and Tables
async function initMySQL() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '' // Change this to your MySQL password
    });
    
    // Create database if not exists
    await connection.query('CREATE DATABASE IF NOT EXISTS freshdairy');
    await connection.query('USE freshdairy');
    
    // Create customers table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create cart table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS cart (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_email VARCHAR(255) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        quantity INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create orders table for MySQL
    await connection.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_email VARCHAR(255) NOT NULL,
        customer_name VARCHAR(255),
        items TEXT NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        delivery_address TEXT,
        mobile VARCHAR(20),
        payment_method VARCHAR(50),
        status VARCHAR(50) DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await connection.end();
    console.log("MySQL Database initialized successfully!");
  } catch (error) {
    console.error("MySQL initialization failed:", error.message);
  }
}

initMySQL();

// Connect to MongoDB for other features (orders, contacts)
mongoose.connect('mongodb://localhost:27017/freshdairy')
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("MongoDB connection failed", err));

// Customer Sign-Up Route (MySQL)
app.post('/api/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const [result] = await mysqlPool.query(
      'INSERT INTO customers (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword]
    );
    
    res.status(201).json({ 
      message: "User Created", 
      user: { name, email, id: result.insertId } 
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ message: "Email already exists" });
    } else {
      res.status(500).json({ message: "Registration failed" });
    }
  }
});

// Customer Login Route (MySQL)
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const [rows] = await mysqlPool.query(
      'SELECT * FROM customers WHERE email = ?',
      [email]
    );
    
    if (rows.length > 0) {
      const user = rows[0];
      const isValidPassword = await bcrypt.compare(password, user.password);
      
      if (isValidPassword) {
        res.json({ name: user.name, email: user.email, id: user.id });
      } else {
        res.status(400).json({ message: "Invalid Credentials" });
      }
    } else {
      res.status(400).json({ message: "Invalid Credentials" });
    }
  } catch (error) {
    res.status(500).json({ message: "Login failed" });
  }
});

// Place Order Route (MySQL)
app.post('/api/place-order', async (req, res) => {
  try {
    const { customerEmail, customerName, items, totalAmount, deliveryAddress, mobile, paymentMethod } = req.body;
    
    const [result] = await mysqlPool.query(
      'INSERT INTO orders (customer_email, customer_name, items, total_amount, delivery_address, mobile, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [customerEmail, customerName, JSON.stringify(items), totalAmount, deliveryAddress, mobile, paymentMethod]
    );
    
    res.status(201).json({ 
      message: "Order placed successfully!", 
      orderId: result.insertId 
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to place order" });
  }
});

// Get Customer Orders (MySQL)
app.get('/api/customer-orders/:email', async (req, res) => {
  try {
    const [rows] = await mysqlPool.query(
      'SELECT * FROM orders WHERE customer_email = ? ORDER BY created_at DESC',
      [req.params.email]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

// Get All Customers (MySQL) for Admin
app.get('/api/admin/mysql-customers', async (req, res) => {
  try {
    const [rows] = await mysqlPool.query('SELECT id, name, email, created_at FROM customers');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch customers" });
  }
});

// MongoDB Schemas for backward compatibility
const orderSchema = new mongoose.Schema({
  userEmail: String,
  items: Array,
  totalAmount: Number,
  status: { type: String, default: "Pending" },
  date: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', orderSchema);

const contactSchema = new mongoose.Schema({
  name: String,
  email: String,
  message: String,
  date: { type: Date, default: Date.now }
});
const Contact = mongoose.model('Contact', contactSchema);

// API to Place Order (MongoDB - keeping for backward compatibility)
app.post('/api/orders', async (req, res) => {
  try {
    const newOrder = new Order(req.body);
    await newOrder.save();
    res.status(201).json({ message: "Order placed successfully!", orderId: newOrder._id });
  } catch (error) {
    res.status(500).json({ message: "Failed to place order" });
  }
});

// API to Get User Orders (MongoDB)
app.get('/api/orders/:email', async (req, res) => {
  const orders = await Order.find({ userEmail: req.params.email }).sort({ date: -1 });
  res.json(orders);
});

// Get ALL orders for admin view
app.get('/api/admin/orders', async (req, res) => {
  const allOrders = await Order.find().sort({ date: -1 });
  res.json(allOrders);
});

// Get All MySQL Orders for admin
app.get('/api/admin/mysql-orders', async (req, res) => {
  try {
    const [rows] = await mysqlPool.query('SELECT * FROM orders ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

// Update MySQL Order Status
app.put('/api/admin/mysql-orders/:id', async (req, res) => {
  try {
    await mysqlPool.query('UPDATE orders SET status = ? WHERE id = ?', [req.body.status, req.params.id]);
    const [rows] = await mysqlPool.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: "Failed to update order" });
  }
});

// Update Order Status (MongoDB)
app.put('/api/admin/orders/:id', async (req, res) => {
  const updatedOrder = await Order.findByIdAndUpdate(
    req.params.id, 
    { status: req.body.status }, 
    { new: true }
  );
  res.json(updatedOrder);
});

// Get All Contact Messages
app.get('/api/admin/messages', async (req, res) => {
  const messages = await Contact.find().sort({ date: -1 });
  res.json(messages);
});

// API to save messages from the frontend
app.post('/api/contact', async (req, res) => {
  const newMessage = new Contact(req.body);
  await newMessage.save();
  res.json({ success: true });
});

app.listen(5000, () => console.log("Server running on port 5000"));