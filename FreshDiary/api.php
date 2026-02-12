<?php
/**
 * FreshDairy API - PHP Backend for XAMPP
 * 
 * Usage:
 * 1. Place this file in your XAMPP htdocs folder (e.g., C:\xampp\htdocs\freshdairy\api.php)
 * 2. Import freshdairy.sql in phpMyAdmin
 * 3. Update database credentials below if needed
 * 4. Update your HTML files to call this API instead of Node.js server
 * 
 * Example: Change http://localhost:5000/api/login to http://localhost/freshdairy/api.php?action=login
 */

// Enable CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Database Configuration
$DB_HOST = 'localhost';
$DB_USER = 'root';
$DB_PASS = ''; // Default XAMPP MySQL password is empty
$DB_NAME = 'freshdairy';

// Create database connection
try {
    $pdo = new PDO("mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4", $DB_USER, $DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['message' => 'Database connection failed', 'error' => $e->getMessage()]);
    exit();
}

// Get action from query parameter or URL path
$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true) ?? [];

// Router
switch ($action) {
    // ==================== AUTH ====================
    case 'signup':
        if ($method !== 'POST') {
            http_response_code(405);
            echo json_encode(['message' => 'Method not allowed']);
            break;
        }
        
        $name = $input['name'] ?? '';
        $email = $input['email'] ?? '';
        $password = $input['password'] ?? '';
        
        if (empty($name) || empty($email) || empty($password)) {
            http_response_code(400);
            echo json_encode(['message' => 'All fields are required']);
            break;
        }
        
        // Check if email exists
        $stmt = $pdo->prepare("SELECT id FROM customers WHERE email = ?");
        $stmt->execute([$email]);
        
        if ($stmt->fetch()) {
            http_response_code(400);
            echo json_encode(['message' => 'Email already exists']);
            break;
        }
        
        // Hash password
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        
        // Insert user
        $stmt = $pdo->prepare("INSERT INTO customers (name, email, password) VALUES (?, ?, ?)");
        $stmt->execute([$name, $email, $hashedPassword]);
        
        $userId = $pdo->lastInsertId();
        
        http_response_code(201);
        echo json_encode([
            'message' => 'User Created',
            'user' => ['name' => $name, 'email' => $email, 'id' => $userId]
        ]);
        break;
        
    case 'login':
        if ($method !== 'POST') {
            http_response_code(405);
            echo json_encode(['message' => 'Method not allowed']);
            break;
        }
        
        $email = $input['email'] ?? '';
        $password = $input['password'] ?? '';
        
        $stmt = $pdo->prepare("SELECT * FROM customers WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        
        if ($user && password_verify($password, $user['password'])) {
            echo json_encode([
                'name' => $user['name'],
                'email' => $user['email'],
                'id' => $user['id']
            ]);
        } else {
            http_response_code(400);
            echo json_encode(['message' => 'Invalid Credentials']);
        }
        break;
        
    // ==================== ORDERS ====================
    case 'place-order':
        if ($method !== 'POST') {
            http_response_code(405);
            echo json_encode(['message' => 'Method not allowed']);
            break;
        }
        
        $customerEmail = $input['customerEmail'] ?? '';
        $customerName = $input['customerName'] ?? '';
        $items = $input['items'] ?? [];
        $totalAmount = $input['totalAmount'] ?? 0;
        $deliveryAddress = $input['deliveryAddress'] ?? '';
        $mobile = $input['mobile'] ?? '';
        $paymentMethod = $input['paymentMethod'] ?? 'Cash on Delivery';
        
        $stmt = $pdo->prepare("INSERT INTO orders (customer_email, customer_name, items, total_amount, delivery_address, mobile, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $customerEmail,
            $customerName,
            json_encode($items),
            $totalAmount,
            $deliveryAddress,
            $mobile,
            $paymentMethod
        ]);
        
        $orderId = $pdo->lastInsertId();
        
        http_response_code(201);
        echo json_encode([
            'message' => 'Order placed successfully!',
            'orderId' => $orderId
        ]);
        break;
        
    case 'orders':
        if ($method === 'GET') {
            $email = $_GET['email'] ?? '';
            
            if (empty($email)) {
                // Get all orders (admin)
                $stmt = $pdo->query("SELECT * FROM orders ORDER BY created_at DESC");
            } else {
                // Get customer orders
                $stmt = $pdo->prepare("SELECT * FROM orders WHERE customer_email = ? ORDER BY created_at DESC");
                $stmt->execute([$email]);
            }
            
            $orders = $stmt->fetchAll();
            
            // Parse items JSON for each order
            foreach ($orders as &$order) {
                $order['items'] = json_decode($order['items'], true);
            }
            
            echo json_encode($orders);
        } elseif ($method === 'POST') {
            // Legacy MongoDB-style order creation
            $userEmail = $input['userEmail'] ?? '';
            $items = $input['items'] ?? [];
            $totalAmount = $input['totalAmount'] ?? 0;
            
            $stmt = $pdo->prepare("INSERT INTO orders (customer_email, items, total_amount) VALUES (?, ?, ?)");
            $stmt->execute([$userEmail, json_encode($items), $totalAmount]);
            
            http_response_code(201);
            echo json_encode([
                'message' => 'Order placed successfully!',
                'orderId' => $pdo->lastInsertId()
            ]);
        }
        break;
        
    case 'customer-orders':
        $email = $_GET['email'] ?? '';
        
        $stmt = $pdo->prepare("SELECT * FROM orders WHERE customer_email = ? ORDER BY created_at DESC");
        $stmt->execute([$email]);
        $orders = $stmt->fetchAll();
        
        foreach ($orders as &$order) {
            $order['items'] = json_decode($order['items'], true);
        }
        
        echo json_encode($orders);
        break;
        
    // ==================== ADMIN ====================
    case 'admin-orders':
        if ($method === 'GET') {
            $stmt = $pdo->query("SELECT * FROM orders ORDER BY created_at DESC");
            $orders = $stmt->fetchAll();
            
            foreach ($orders as &$order) {
                $order['items'] = json_decode($order['items'], true);
                // Add _id for frontend compatibility
                $order['_id'] = 'FD' . str_pad($order['id'], 6, '0', STR_PAD_LEFT);
            }
            
            echo json_encode($orders);
        } elseif ($method === 'PUT') {
            $orderId = $_GET['id'] ?? 0;
            $status = $input['status'] ?? '';
            
            $stmt = $pdo->prepare("UPDATE orders SET order_status = ? WHERE id = ?");
            $stmt->execute([$status, $orderId]);
            
            $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ?");
            $stmt->execute([$orderId]);
            $order = $stmt->fetch();
            $order['items'] = json_decode($order['items'], true);
            
            echo json_encode($order);
        }
        break;
        
    case 'admin-customers':
        $stmt = $pdo->query("SELECT id, name, email, created_at FROM customers ORDER BY created_at DESC");
        echo json_encode($stmt->fetchAll());
        break;
        
    case 'admin-messages':
        $stmt = $pdo->query("SELECT * FROM contact_messages ORDER BY created_at DESC");
        echo json_encode($stmt->fetchAll());
        break;
        
    // ==================== CONTACT ====================
    case 'contact':
        if ($method !== 'POST') {
            http_response_code(405);
            echo json_encode(['message' => 'Method not allowed']);
            break;
        }
        
        $name = $input['name'] ?? '';
        $email = $input['email'] ?? '';
        $message = $input['message'] ?? '';
        
        $stmt = $pdo->prepare("INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)");
        $stmt->execute([$name, $email, $message]);
        
        echo json_encode(['success' => true]);
        break;
        
    // ==================== PRODUCTS ====================
    case 'products':
        $stmt = $pdo->query("SELECT * FROM products WHERE is_available = 1");
        echo json_encode($stmt->fetchAll());
        break;
        
    // ==================== NOTIFICATIONS ====================
    case 'notifications':
        if ($method === 'GET') {
            $email = $_GET['email'] ?? '';
            $stmt = $pdo->prepare("SELECT * FROM notifications WHERE customer_email = ? ORDER BY created_at DESC LIMIT 20");
            $stmt->execute([$email]);
            echo json_encode($stmt->fetchAll());
        } elseif ($method === 'POST') {
            $customerEmail = $input['customer_email'] ?? '';
            $title = $input['title'] ?? '';
            $message = $input['message'] ?? '';
            $type = $input['type'] ?? 'system';
            
            $stmt = $pdo->prepare("INSERT INTO notifications (customer_email, title, message, type) VALUES (?, ?, ?, ?)");
            $stmt->execute([$customerEmail, $title, $message, $type]);
            
            echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
        }
        break;
        
    case 'mark-notification-read':
        $notificationId = $_GET['id'] ?? $input['id'] ?? 0;
        
        $stmt = $pdo->prepare("UPDATE notifications SET is_read = 1 WHERE id = ?");
        $stmt->execute([$notificationId]);
        
        echo json_encode(['success' => true]);
        break;
        
    // ==================== DASHBOARD STATS ====================
    case 'dashboard-stats':
        $stmt = $pdo->query("CALL sp_get_dashboard_stats()");
        echo json_encode($stmt->fetch());
        break;
        
    default:
        http_response_code(404);
        echo json_encode(['message' => 'Endpoint not found']);
        break;
}

?>
