import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { 
  registerUser, 
  loginUser, 
  getUser, 
  getUserLogs, 
  addLog, 
  deleteLog, 
  getUserActionPlan, 
  saveUserActionPlan, 
  toggleActionCompleted 
} from './services/db.js';
import { analyzeHabit } from './services/gemini.js';

// Load environment variables
dotenv.config();

const app = express();
app.disable('x-powered-by'); // Disable tech-stack leak header

const PORT = process.env.PORT || 5000;

// Security: Configure manual HTTP headers for clickjacking, XSS, and MIME-type sniffing protection
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Security: If in production, require/generate a dynamic cryptographically secure key 
// to prevent signature forge vulnerabilities due to hardcoded fallback defaults.
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production'
  ? crypto.randomBytes(32).toString('hex')
  : 'hackathon-eco-secret-key-2026');

// Simple custom in-memory rate limiter to prevent API spam and brute-force auth requests
const ipCache = new Map();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_LIMIT_PER_IP = 100; // max 100 requests per IP per window

function apiRateLimiter(req, res, next) {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const now = Date.now();
  
  if (!ipCache.has(ip)) {
    ipCache.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return next();
  }
  
  const record = ipCache.get(ip);
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + RATE_LIMIT_WINDOW_MS;
    return next();
  }
  
  record.count++;
  if (record.count > MAX_LIMIT_PER_IP) {
    return res.status(429).json({ 
      error: 'Too Many Requests', 
      message: 'Too many auth requests from this IP. Please try again after 15 minutes.' 
    });
  }
  next();
}

// Middleware configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Log incoming requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

/**
 * Authentication Middleware
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Access token is required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Forbidden', message: 'Token is invalid or expired' });
    }
    
    // Fetch fresh user profile to ensure streak and details are up to date
    const profile = getUser(user.id);
    if (!profile) {
      return res.status(404).json({ error: 'User Not Found', message: 'Registered user no longer exists' });
    }
    
    req.user = profile;
    next();
  });
}

/**
 * Open Route: Health Check & Status
 */
app.get('/api/status', (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const isMock = !apiKey || apiKey === 'your_gemini_api_key_here' || apiKey.trim() === '';
  
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    demoMode: isMock,
    message: isMock 
      ? 'Running in Stateful Demo Mode (Gemini API key is unconfigured, using heuristics)' 
      : 'Running in Stateful AI Mode (Gemini API connected)'
  });
});

/**
 * Auth Route: Register
 */
app.post('/api/auth/register', apiRateLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password || password.length < 6) {
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: 'A valid email and password (minimum 6 characters) are required.' 
      });
    }

    const user = await registerUser(email, password);
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    
    res.status(201).json({ user, token });
  } catch (error) {
    if (error.message === 'Email is already registered') {
      return res.status(409).json({ error: 'Conflict', message: error.message });
    }
    next(error);
  }
});

/**
 * Auth Route: Login
 */
app.post('/api/auth/login', apiRateLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: 'Email and password are required.' 
      });
    }

    const user = await loginUser(email, password);
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ user, token });
  } catch (error) {
    if (error.message === 'Invalid email or password') {
      return res.status(401).json({ error: 'Unauthorized', message: error.message });
    }
    next(error);
  }
});

/**
 * Secured Route: Get User Profile/Session
 */
app.get('/api/auth/me', authenticateToken, (req, res, next) => {
  try {
    res.json({ user: req.user });
  } catch (error) {
    next(error);
  }
});

/**
 * Secured Route: Fetch Activities
 */
app.get('/api/activities', authenticateToken, (req, res, next) => {
  try {
    const logs = getUserLogs(req.user.id);
    res.json(logs);
  } catch (error) {
    next(error);
  }
});

/**
 * Secured Route: Manual Activity Log Creation
 */
app.post('/api/activities', authenticateToken, (req, res, next) => {
  try {
    const { category, co2, description, date } = req.body;
    if (!description || typeof co2 !== 'number') {
      return res.status(400).json({ error: 'Bad Request', message: 'Activity description and co2 values are required.' });
    }

    const log = addLog(req.user.id, { category, co2, description, date });
    res.status(201).json(log);
  } catch (error) {
    next(error);
  }
});

/**
 * Secured Route: Delete Log
 */
app.delete('/api/activities/:id', authenticateToken, (req, res, next) => {
  try {
    const deleted = deleteLog(req.user.id, req.params.id);
    if (deleted) {
      res.json({ message: 'Activity deleted successfully' });
    } else {
      res.status(404).json({ error: 'Not Found', message: 'Activity log not found or unauthorized' });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * Secured Route: Fetch Action Plan
 */
app.get('/api/action-plan', authenticateToken, (req, res, next) => {
  try {
    const actions = getUserActionPlan(req.user.id);
    res.json(actions);
  } catch (error) {
    next(error);
  }
});

/**
 * Secured Route: Toggle Action Plan Checklist State
 */
app.post('/api/action-plan/:id/toggle', authenticateToken, (req, res) => {
  try {
    const result = toggleActionCompleted(req.user.id, req.params.id);
    res.json({
      message: `Action toggle updated successfully`,
      action: result.action,
      actionPlan: result.allActions,
      activities: getUserLogs(req.user.id) // Return updated activities due to completing offset
    });
  } catch (error) {
    res.status(404).json({ error: 'Not Found', message: error.message });
  }
});

/**
 * Secured Route: Chat and Habit Analysis Endpoint
 */
app.post('/api/chat', authenticateToken, async (req, res, next) => {
  try {
    const { message, chatHistory } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: 'A non-empty string "message" property is required in the request body.' 
      });
    }

    const currentLogs = getUserLogs(req.user.id);
    
    // Call Gemini API passing conversational memory and user stats context
    const aiResult = await analyzeHabit(message, chatHistory || [], req.user, currentLogs);

    // Save newly parsed activity (if any) to local database
    let parsedLog = null;
    if (aiResult.activities && aiResult.activities.length > 0) {
      parsedLog = addLog(req.user.id, aiResult.activities[0]);
    }

    // Save and merge recommended daily actions (if any)
    let savedActions = getUserActionPlan(req.user.id);
    if (aiResult.actionPlan && aiResult.actionPlan.length > 0) {
      savedActions = saveUserActionPlan(req.user.id, aiResult.actionPlan);
    }

    res.json({
      text: aiResult.text,
      activities: getUserLogs(req.user.id), // Return full updated logs array
      actionPlan: savedActions,             // Return full merged recommendations list
      user: getUser(req.user.id)            // Return user details with updated streak
    });

  } catch (error) {
    next(error);
  }
});

// 404 Route handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', message: `Route ${req.method} ${req.path} not found` });
});

// Global error boundary middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred on the server.',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Start listening (only if not running tests)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`===================================================`);
    console.log(`🌱 Carbon Footprint Awareness Backend Running`);
    console.log(`   Local URL: http://localhost:${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   API Key Status: ${process.env.GEMINI_API_KEY ? 'CONFIGURED' : 'NOT CONFIGURED (Mock Mode)'}`);
    console.log(`===================================================`);
  });
}

export default app; // Export for unit tests
