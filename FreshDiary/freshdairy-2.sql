-- ============================================
-- FreshDairy Database Setup for XAMPP (MySQL)
-- ============================================
-- Import this file in phpMyAdmin or run via MySQL CLI
-- 
-- Steps to Import:
-- 1. Open XAMPP Control Panel and start Apache & MySQL
-- 2. Open phpMyAdmin (http://localhost/phpmyadmin)
-- 3. Click on "Import" tab
-- 4. Select this file and click "Go"
-- ============================================

-- Create Database
CREATE DATABASE IF NOT EXISTS freshdairy;
USE freshdairy;

-- ============================================
-- TABLE: customers
-- Stores registered customer information
-- ============================================
DROP TABLE IF EXISTS customers;
CREATE TABLE customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: products
-- Stores product catalog information
-- ============================================
DROP TABLE IF EXISTS products;
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    image VARCHAR(255),
    category VARCHAR(100),
    stock_quantity INT DEFAULT 100,
    is_available TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default products
INSERT INTO products (name, description, price, image, category) VALUES
('Fresh Milk', 'Farm-fresh cow milk delivered daily', 60.00, 'images/product1.png', 'Milk'),
('Organic Butter', 'Creamy organic butter made from pure milk', 120.00, 'images/product2.png', 'Butter'),
('Natural Cheese', 'Delicious natural cheese aged to perfection', 250.00, 'images/product3.png', 'Cheese'),
('Fresh Curd', 'Thick and creamy curd made fresh daily', 50.00, 'images/product4.png', 'Curd'),
('Organic Paneer', 'Soft and fresh organic paneer', 180.00, 'images/product5.png', 'Paneer'),
('Pure Cow Ghee', 'Traditional pure cow ghee with rich aroma', 650.00, 'images/product6.png', 'Ghee');

-- ============================================
-- TABLE: cart
-- Stores customer shopping cart items
-- ============================================
DROP TABLE IF EXISTS cart;
CREATE TABLE cart (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT,
    customer_email VARCHAR(255) NOT NULL,
    product_id INT,
    product_name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    quantity INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_customer_email (customer_email),
    INDEX idx_customer_id (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: orders
-- Stores customer orders
-- ============================================
DROP TABLE IF EXISTS orders;
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE,
    customer_id INT,
    customer_email VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255),
    items JSON NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    delivery_address TEXT,
    mobile VARCHAR(20),
    payment_method VARCHAR(50),
    payment_status ENUM('Pending', 'Paid', 'Failed', 'Refunded') DEFAULT 'Pending',
    order_status ENUM('Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled') DEFAULT 'Pending',
    delivery_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_customer_email (customer_email),
    INDEX idx_order_status (order_status),
    INDEX idx_order_number (order_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create trigger for auto-generating order number
DELIMITER //
CREATE TRIGGER before_order_insert
BEFORE INSERT ON orders
FOR EACH ROW
BEGIN
    IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
        SET NEW.order_number = CONCAT('FD', DATE_FORMAT(NOW(), '%Y%m%d'), LPAD((SELECT COALESCE(MAX(id), 0) + 1 FROM orders), 5, '0'));
    END IF;
END//
DELIMITER ;

-- ============================================
-- TABLE: order_items
-- Stores individual items within each order
-- ============================================
DROP TABLE IF EXISTS order_items;
CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT,
    product_name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    quantity INT NOT NULL,
    subtotal DECIMAL(10, 2) GENERATED ALWAYS AS (price * quantity) STORED,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    INDEX idx_order_id (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: contact_messages
-- Stores messages from contact form
-- ============================================
DROP TABLE IF EXISTS contact_messages;
CREATE TABLE contact_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read TINYINT(1) DEFAULT 0,
    replied_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_is_read (is_read),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: admin_users
-- Stores admin login credentials
-- ============================================
DROP TABLE IF EXISTS admin_users;
CREATE TABLE admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('super_admin', 'admin', 'staff') DEFAULT 'admin',
    is_active TINYINT(1) DEFAULT 1,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default admin user (Password: admin123 - Change this after first login!)
-- Note: This is a bcrypt hash of 'admin123'
INSERT INTO admin_users (username, email, password, role) VALUES
('admin', 'admin@freshdairy.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'super_admin');

-- ============================================
-- TABLE: categories
-- Product categories
-- ============================================
DROP TABLE IF EXISTS categories;
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    image VARCHAR(255),
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO categories (name, description) VALUES
('Milk', 'Fresh farm milk products'),
('Butter', 'Creamy butter varieties'),
('Cheese', 'Natural and processed cheese'),
('Curd', 'Fresh curd and yogurt'),
('Paneer', 'Cottage cheese products'),
('Ghee', 'Pure desi ghee');

-- ============================================
-- TABLE: notifications
-- System notifications for users
-- ============================================
DROP TABLE IF EXISTS notifications;
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT,
    customer_email VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('order', 'promo', 'system', 'delivery') DEFAULT 'system',
    is_read TINYINT(1) DEFAULT 0,
    link VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_customer (customer_email),
    INDEX idx_is_read (is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: subscriptions
-- Newsletter subscriptions
-- ============================================
DROP TABLE IF EXISTS subscriptions;
CREATE TABLE subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    unsubscribed_at TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- VIEWS for Admin Dashboard
-- ============================================

-- View: Daily Sales Summary
CREATE OR REPLACE VIEW v_daily_sales AS
SELECT 
    DATE(created_at) as sale_date,
    COUNT(*) as total_orders,
    SUM(total_amount) as total_revenue,
    AVG(total_amount) as avg_order_value
FROM orders
WHERE order_status NOT IN ('Cancelled')
GROUP BY DATE(created_at)
ORDER BY sale_date DESC;

-- View: Customer Order Summary
CREATE OR REPLACE VIEW v_customer_orders AS
SELECT 
    c.id as customer_id,
    c.name,
    c.email,
    COUNT(o.id) as total_orders,
    COALESCE(SUM(o.total_amount), 0) as total_spent,
    MAX(o.created_at) as last_order_date
FROM customers c
LEFT JOIN orders o ON c.email = o.customer_email
GROUP BY c.id, c.name, c.email;

-- View: Product Sales Summary
CREATE OR REPLACE VIEW v_product_sales AS
SELECT 
    oi.product_name,
    SUM(oi.quantity) as total_quantity_sold,
    SUM(oi.subtotal) as total_revenue
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE o.order_status NOT IN ('Cancelled')
GROUP BY oi.product_name
ORDER BY total_quantity_sold DESC;

-- ============================================
-- Sample Data (Optional - Remove in Production)
-- ============================================

-- Sample customer (Password: test123)
INSERT INTO customers (name, email, password, phone, address) VALUES
('Test User', 'test@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '9876543210', '123 Test Street, Test City');

-- Sample order
INSERT INTO orders (customer_email, customer_name, items, total_amount, delivery_address, mobile, payment_method, order_status) VALUES
('test@example.com', 'Test User', '[{"name":"Fresh Milk","qty":2,"price":60},{"name":"Organic Butter","qty":1,"price":120}]', 240.00, '123 Test Street, Test City', '9876543210', 'Cash on Delivery', 'Delivered');

-- ============================================
-- STORED PROCEDURES
-- ============================================

-- Procedure: Get Dashboard Stats
DELIMITER //
CREATE PROCEDURE sp_get_dashboard_stats()
BEGIN
    SELECT 
        (SELECT COUNT(*) FROM customers) as total_customers,
        (SELECT COUNT(*) FROM orders WHERE DATE(created_at) = CURDATE()) as today_orders,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE DATE(created_at) = CURDATE() AND order_status != 'Cancelled') as today_revenue,
        (SELECT COUNT(*) FROM orders WHERE order_status = 'Pending') as pending_orders,
        (SELECT COUNT(*) FROM contact_messages WHERE is_read = 0) as unread_messages;
END//
DELIMITER ;

-- Procedure: Update Order Status
DELIMITER //
CREATE PROCEDURE sp_update_order_status(
    IN p_order_id INT,
    IN p_new_status VARCHAR(50)
)
BEGIN
    UPDATE orders 
    SET order_status = p_new_status,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_order_id;
    
    -- Return updated order
    SELECT * FROM orders WHERE id = p_order_id;
END//
DELIMITER ;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
SELECT 'FreshDairy database setup completed successfully!' AS Message;
SELECT 'Default admin login: admin@freshdairy.com / admin123' AS AdminCredentials;
SELECT 'Remember to change the admin password after first login!' AS SecurityNote;
