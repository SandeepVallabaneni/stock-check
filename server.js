const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const { getStockAnalysis, searchIndianStocks, PRESET_INDIAN_STOCKS } = require('./services/stockService');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'alphapulse-stock-secret-key-2026';

// Middleware
app.use(cors());
app.use(express.json());

// In-memory demo users database
const users = [
  {
    id: 'usr_1',
    name: 'Sandeep Vallabaneni',
    email: 'sandeep@alphapulse.io',
    username: 'sandeep',
    password: 'password123',
    role: 'Senior Equity Analyst',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
  },
  {
    id: 'usr_2',
    name: 'Sarah Chen',
    email: 'sarah@alphapulse.io',
    username: 'admin',
    password: 'admin123',
    role: 'Portfolio Manager',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80'
  }
];

// Helper to generate JWT token
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired session token' });
    }
    req.user = decoded;
    next();
  });
}

// --- Auth Endpoints ---

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username/Email and Password are required.' });
  }

  const cleanUser = username.trim().toLowerCase();
  const foundUser = users.find(
    u => u.username.toLowerCase() === cleanUser || 
         u.email.toLowerCase() === cleanUser ||
         (cleanUser === 'alex' && u.username === 'sandeep')
  );

  if (!foundUser || foundUser.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials. Try sandeep / password123' });
  }

  const token = generateToken(foundUser);
  return res.json({
    token,
    user: {
      id: foundUser.id,
      name: foundUser.name,
      email: foundUser.email,
      username: foundUser.username,
      role: foundUser.role,
      avatar: foundUser.avatar
    }
  });
});

// POST /api/auth/register
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  if (users.find(u => u.email.toLowerCase() === email.trim().toLowerCase())) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const newUser = {
    id: `usr_${Date.now()}`,
    name: name.trim(),
    email: email.trim(),
    username: email.trim().split('@')[0],
    password: password,
    role: 'Market Trader',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'
  };

  users.push(newUser);
  const token = generateToken(newUser);

  return res.status(201).json({
    token,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      username: newUser.username,
      role: newUser.role,
      avatar: newUser.avatar
    }
  });
});

// GET /api/auth/me
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const found = users.find(u => u.id === req.user.id);
  if (!found) {
    return res.json({ user: req.user });
  }
  return res.json({
    user: {
      id: found.id,
      name: found.name,
      email: found.email,
      username: found.username,
      role: found.role,
      avatar: found.avatar
    }
  });
});

// POST /api/auth/logout
app.post('/api/auth/logout', (req, res) => {
  return res.json({ success: true, message: 'Logged out successfully' });
});

// --- Stock Endpoints ---

// GET /api/stocks/search?q=
// Requires at least 3 characters to search Indian stocks
app.get('/api/stocks/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (q.length < 3) {
      return res.json([]);
    }
    const results = await searchIndianStocks(q);
    return res.json(results);
  } catch (err) {
    console.error('Search endpoint error:', err);
    return res.json([]);
  }
});

// GET /api/stocks/:symbol
app.get('/api/stocks/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol;
    if (!symbol || symbol.trim().length === 0) {
      return res.status(400).json({ error: 'Stock symbol is required' });
    }

    const analysis = await getStockAnalysis(symbol);
    return res.json(analysis);
  } catch (error) {
    console.error('Error analyzing stock:', error);
    return res.status(500).json({
      error: 'Failed to retrieve stock data. Please verify ticker symbol and try again.',
      details: error.message
    });
  }
});

// Serve AG-Grid community vendor bundle
app.use('/vendor/ag-grid', express.static(path.join(__dirname, 'node_modules', 'ag-grid-community')));

// Serve frontend static assets
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all route to serve SPA
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 StockCheck Terminal Server running on http://localhost:${PORT}`);
});
