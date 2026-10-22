const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'database.json');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + '_aura_salt').digest('hex');
}

const INITIAL_DB = {
  users: [
    {
      id: 1,
      email: 'admin@aura.ru',
      username: 'SLAVA_ADMIN',
      fullname: 'Моисеев Вячеслав Романович',
      passwordHash: hashPassword('admin123'),
      role: 'admin',
      isSuperAdmin: true,
      params: {
        height: '', chest: '', waist: '', autofit: false,
        delivery: 'home', pvz: 'Яндекс Маркет — ул. Садовая, 42'
      },
      cart: [
        { productId: 1, size: 'L', qty: 1 },
        { productId: 3, size: 'L', qty: 1 }
      ],
      likes: [1]
    }
  ],
  products: [
    {
      id: 1,
      title: 'Худи оверсайз',
      price: 5500,
      category: 'women',
      color: 'Чёрный',
      material: 'Хлопок 100%',
      season: 'Всесезонный',
      image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=600&q=80',
      minHeight: 155, maxHeight: 192, minChest: 80, maxChest: 116, minWaist: 58, maxWaist: 102
    },
    {
      id: 2,
      title: 'Футболка Base',
      price: 3200,
      category: 'men',
      color: 'Белый',
      material: 'Хлопок',
      season: 'Всесезонный',
      image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80',
      minHeight: 165, maxHeight: 195, minChest: 86, maxChest: 114, minWaist: 68, maxWaist: 98
    },
    {
      id: 3,
      title: 'Футболка оверсайз',
      price: 5500,
      category: 'men',
      color: 'Белый',
      material: 'Плотный хлопок',
      season: 'Всесезонный',
      image: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=600&q=80',
      minHeight: 160, maxHeight: 198, minChest: 84, maxChest: 120, minWaist: 64, maxWaist: 105
    },
    {
      id: 4,
      title: 'Худи оверсайз Graphite',
      price: 5500,
      category: 'men',
      color: 'Графит',
      material: 'Хлопок с начёсом',
      season: 'Всесезонный',
      image: 'https://images.unsplash.com/photo-1578681994506-b8f463449011?auto=format&fit=crop&w=600&q=80',
      minHeight: 168, maxHeight: 196, minChest: 90, maxChest: 122, minWaist: 70, maxWaist: 106
    },
    {
      id: 5,
      title: 'Свитшот минимализм',
      price: 4900,
      category: 'women',
      color: 'Серый меланж',
      material: 'Хлопок',
      season: 'Всесезонный',
      image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80',
      minHeight: 152, maxHeight: 185, minChest: 76, maxChest: 106, minWaist: 56, maxWaist: 90
    },
    {
      id: 6,
      title: 'Колье минимализм AURA',
      price: 2900,
      category: 'accessories',
      color: 'Серебро',
      material: 'Хирургическая сталь',
      season: 'Всесезонный',
      image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80',
      minHeight: 120, maxHeight: 220, minChest: 50, maxChest: 160, minWaist: 40, maxWaist: 150
    }
  ],
  orders: []
};

function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DB, null, 2), 'utf-8');
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function sanitizeUser(u) {
  const { passwordHash, ...safeUser } = u;
  return safeUser;
}

function sendJSON(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 25 * 1024 * 1024) reject(new Error('Payload too large'));
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return sendJSON(res, 200, {});

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  try {
    if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
      const htmlPath = path.join(__dirname, 'index.html');
      const content = fs.readFileSync(htmlPath, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(content);
    }

    if (req.method === 'GET' && pathname === '/api/products') {
      const db = readDB();
      return sendJSON(res, 200, { products: db.products });
    }

    if (req.method === 'POST' && pathname === '/api/auth/register') {
      const { email, username, fullname, password } = await parseBody(req);
      if (!email || !username || !fullname || !password) {
        return sendJSON(res, 400, { error: 'Заполните все поля регистрации' });
      }
      const db = readDB();
      const exists = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (exists) {
        return sendJSON(res, 400, { error: 'Пользователь с таким Email уже существует' });
      }
      const newUser = {
        id: Date.now(),
        email: email.trim(),
        username: username.trim(),
        fullname: fullname.trim(),
        passwordHash: hashPassword(password),
        role: 'user',
        isSuperAdmin: false,
        params: { height: '', chest: '', waist: '', autofit: false, delivery: 'home', pvz: 'Яндекс Маркет — ул. Садовая, 42' },
        cart: [],
        likes: []
      };
      db.users.push(newUser);
      writeDB(db);
      return sendJSON(res, 200, { user: sanitizeUser(newUser) });
    }

    if (req.method === 'POST' && pathname === '/api/auth/login') {
      const { email, password } = await parseBody(req);
      const db = readDB();
      const user = db.users.find(
        u => (u.email.toLowerCase() === email.toLowerCase() || u.username.toLowerCase() === email.toLowerCase()) &&
             u.passwordHash === hashPassword(password)
      );
      if (!user) return sendJSON(res, 401, { error: 'Неверный логин или пароль' });
      return sendJSON(res, 200, { user: sanitizeUser(user) });
    }

    if (req.method === 'GET' && pathname === '/api/user') {
      const userId = Number(url.searchParams.get('id'));
      const db = readDB();
      const user = db.users.find(u => u.id === userId);
      if (!user) return sendJSON(res, 404, { error: 'Пользователь не найден' });
      return sendJSON(res, 200, { user: sanitizeUser(user) });
    }

    if (req.method === 'PUT' && pathname === '/api/user/sync') {
      const { userId, username, fullname, email, params, cart, likes } = await parseBody(req);
      const db = readDB();
      const user = db.users.find(u => u.id === Number(userId));
      if (!user) return sendJSON(res, 404, { error: 'Пользователь не найден' });

      if (username !== undefined) user.username = username;
      if (fullname !== undefined) user.fullname = fullname;
      if (email !== undefined) user.email = email;
      if (params !== undefined) user.params = params;
      if (cart !== undefined) user.cart = cart;
      if (likes !== undefined) user.likes = likes;

      writeDB(db);
      return sendJSON(res, 200, { user: sanitizeUser(user) });
    }

    if (req.method === 'POST' && pathname === '/api/orders') {
      const { userId, items, total, deliveryType, address } = await parseBody(req);
      const db = readDB();
      const user = db.users.find(u => u.id === Number(userId));
      if (!user) return sendJSON(res, 404, { error: 'Авторизуйтесь для оформления заказа' });

      const newOrder = {
        id: Date.now(),
        userId: user.id,
        userEmail: user.email,
        userName: `${user.fullname} (@${user.username})`,
        items,
        total,
        deliveryType,
        address,
        status: 'Новый',
        createdAt: new Date().toLocaleString('ru-RU')
      };
      db.orders.unshift(newOrder);
      user.cart = [];
      writeDB(db);
      return sendJSON(res, 200, { order: newOrder, user: sanitizeUser(user) });
    }

    if (req.method === 'GET' && pathname === '/api/admin/data') {
      const adminId = Number(url.searchParams.get('adminId'));
      const db = readDB();
      const admin = db.users.find(u => u.id === adminId && u.role === 'admin');
      if (!admin) return sendJSON(res, 403, { error: 'Доступ запрещён' });

      return sendJSON(res, 200, {
        users: db.users.map(sanitizeUser),
        orders: db.orders
      });
    }

    if (req.method === 'POST' && pathname === '/api/admin/role') {
      const { adminId, targetUserId, newRole } = await parseBody(req);
      const db = readDB();
      const admin = db.users.find(u => u.id === Number(adminId) && u.role === 'admin');
      if (!admin) return sendJSON(res, 403, { error: 'Нет прав администратора' });

      const target = db.users.find(u => u.id === Number(targetUserId));
      if (!target) return sendJSON(res, 404, { error: 'Пользователь не найден' });
      if (target.isSuperAdmin) {
        return sendJSON(res, 400, { error: 'Нельзя снять права у главного администратора' });
      }

      target.role = newRole;
      writeDB(db);
      return sendJSON(res, 200, { users: db.users.map(sanitizeUser) });
    }

    if (req.method === 'POST' && pathname === '/api/admin/products') {
      const { adminId, product } = await parseBody(req);
      const db = readDB();
      const admin = db.users.find(u => u.id === Number(adminId) && u.role === 'admin');
      if (!admin) return sendJSON(res, 403, { error: 'Нет прав администратора' });

      const newProd = {
        id: Date.now(),
        title: product.title,
        price: Number(product.price),
        category: product.category || 'men',
        color: product.color || 'Чёрный',
        material: product.material || 'Хлопок',
        season: 'Всесезонный',
        image: product.image || 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=600&q=80',
        minHeight: Number(product.minHeight) || 150,
        maxHeight: Number(product.maxHeight) || 200,
        minChest: Number(product.minChest) || 75,
        maxChest: Number(product.maxChest) || 125,
        minWaist: 55,
        maxWaist: 110
      };
      db.products.unshift(newProd);
      writeDB(db);
      return sendJSON(res, 200, { products: db.products });
    }

    // РЕДАКТИРОВАНИЕ СУЩЕСТВУЮЩЕГО ТОВАРА
    if (req.method === 'PUT' && pathname === '/api/admin/products') {
      const { adminId, productId, product } = await parseBody(req);
      const db = readDB();
      const admin = db.users.find(u => u.id === Number(adminId) && u.role === 'admin');
      if (!admin) return sendJSON(res, 403, { error: 'Нет прав администратора' });

      const target = db.products.find(p => p.id === Number(productId));
      if (!target) return sendJSON(res, 404, { error: 'Товар не найден' });

      if (product.title) target.title = product.title;
      if (product.price) target.price = Number(product.price);
      if (product.category) target.category = product.category;
      if (product.color) target.color = product.color;
      if (product.material) target.material = product.material;
      if (product.season) target.season = product.season;
      if (product.image) target.image = product.image;
      if (product.minHeight !== undefined) target.minHeight = Number(product.minHeight);
      if (product.maxHeight !== undefined) target.maxHeight = Number(product.maxHeight);
      if (product.minChest !== undefined) target.minChest = Number(product.minChest);
      if (product.maxChest !== undefined) target.maxChest = Number(product.maxChest);

      writeDB(db);
      return sendJSON(res, 200, { products: db.products });
    }

    if (req.method === 'DELETE' && pathname === '/api/admin/products') {
      const adminId = Number(url.searchParams.get('adminId'));
      const productId = Number(url.searchParams.get('productId'));
      const db = readDB();
      const admin = db.users.find(u => u.id === adminId && u.role === 'admin');
      if (!admin) return sendJSON(res, 403, { error: 'Нет прав администратора' });

      db.products = db.products.filter(p => p.id !== productId);
      writeDB(db);
      return sendJSON(res, 200, { products: db.products });
    }

    if (req.method === 'PUT' && pathname === '/api/admin/orders') {
      const { adminId, orderId, status } = await parseBody(req);
      const db = readDB();
      const admin = db.users.find(u => u.id === Number(adminId) && u.role === 'admin');
      if (!admin) return sendJSON(res, 403, { error: 'Нет прав администратора' });

      const order = db.orders.find(o => o.id === Number(orderId));
      if (order) order.status = status;
      writeDB(db);
      return sendJSON(res, 200, { orders: db.orders });
    }

    sendJSON(res, 404, { error: 'Маршрут не найден' });
  } catch (err) {
    sendJSON(res, 500, { error: err.message });
  }
});

function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
}

server.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log('====================================================');
  console.log('🚀 СЕРВЕР AURA УСПЕШНО ЗАПУЩЕН!');
  console.log(`💻 Локально на ПК:        http://localhost:${PORT}`);
  console.log(`📱 По Wi-Fi (без VPN):   http://${ip}:${PORT}`);
  console.log('🌐 Для доступа другу:    выполни во 2-й консоли: npx localtunnel --port 3000');
  console.log('====================================================');
});