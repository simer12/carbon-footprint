import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Initialize database in-memory structure
let db = {
  users: [],
  logs: [],
  actionPlans: []
};

/**
 * Initializes the database directory and file if they do not exist.
 */
export function initDb() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      db = JSON.parse(data);
    } else {
      saveDb();
    }
    console.log('📝 Local JSON database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

let isWriting = false;
let pendingWrite = false;

/**
 * Writes the current database state to the local JSON file asynchronously.
 * Uses a non-blocking queue to prevent event loop delay and file write races.
 */
function saveDb() {
  if (isWriting) {
    pendingWrite = true;
    return;
  }

  isWriting = true;
  const tempFile = DB_FILE + '.tmp';

  fs.writeFile(tempFile, JSON.stringify(db), 'utf8', (err) => {
    if (err) {
      isWriting = false;
      console.error('Error writing temp database file:', err);
      if (pendingWrite) {
        pendingWrite = false;
        saveDb();
      }
      return;
    }

    // Atomic rename to replace the actual database file securely
    fs.rename(tempFile, DB_FILE, (renameErr) => {
      isWriting = false;
      if (renameErr) {
        console.error('Error renaming database file:', renameErr);
      }
      if (pendingWrite) {
        pendingWrite = false;
        saveDb(); // Process next pending write
      }
    });
  });
}

// Ensure database is initialized on import
initDb();

/**
 * USER SERVICE METHODS
 */

export async function registerUser(email, password) {
  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = db.users.find(u => u.email === normalizedEmail);
  if (existingUser) {
    throw new Error('Email is already registered');
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const userId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const newUser = {
    id: userId,
    email: normalizedEmail,
    passwordHash,
    createdAt: new Date().toISOString(),
    streak: 0,
    lastActiveDate: null
  };

  db.users.push(newUser);
  
  // Seed default action items for this user
  db.actionPlans.push({
    userId,
    actions: [
      { id: `seed-1-${userId}`, task: 'Unplug chargers and power strips when not in use to avoid vampire load', category: 'energy', co2Reduction: 0.8, difficulty: 'easy', completed: false },
      { id: `seed-2-${userId}`, task: 'Walk or bike for short trips under 2 miles', category: 'transport', co2Reduction: 2.2, difficulty: 'easy', completed: false }
    ]
  });

  saveDb();
  
  // Return user details without password hash
  return { id: newUser.id, email: newUser.email, streak: newUser.streak };
}

export async function loginUser(email, password) {
  const normalizedEmail = email.toLowerCase().trim();
  const user = db.users.find(u => u.email === normalizedEmail);
  if (!user) {
    throw new Error('Invalid email or password');
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new Error('Invalid email or password');
  }

  // Update daily activity streak
  updateUserStreak(user.id);

  return { id: user.id, email: user.email, streak: user.streak };
}

export function getUser(userId) {
  const user = db.users.find(u => u.id === userId);
  if (!user) return null;
  return { id: user.id, email: user.email, streak: user.streak };
}

function updateUserStreak(userId) {
  const user = db.users.find(u => u.id === userId);
  if (!user) return;

  const todayStr = new Date().toISOString().split('T')[0];
  
  if (!user.lastActiveDate) {
    user.streak = 1;
    user.lastActiveDate = todayStr;
  } else if (user.lastActiveDate !== todayStr) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (user.lastActiveDate === yesterdayStr) {
      // Incremented daily streak!
      user.streak += 1;
    } else {
      // Reset streak because user missed a day
      user.streak = 1;
    }
    user.lastActiveDate = todayStr;
  }
  
  saveDb();
}

/**
 * LOGS SERVICE METHODS
 */

export function getUserLogs(userId) {
  return db.logs.filter(log => log.userId === userId);
}

export function addLog(userId, activity) {
  // Update streak whenever they log an activity
  updateUserStreak(userId);

  const newLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    userId,
    category: activity.category || 'other',
    co2: activity.co2 || 0,
    description: activity.description,
    date: activity.date || new Date().toISOString().split('T')[0]
  };

  db.logs.push(newLog);
  saveDb();
  return newLog;
}

export function deleteLog(userId, logId) {
  const initialLength = db.logs.length;
  db.logs = db.logs.filter(log => !(log.id === logId && log.userId === userId));
  
  if (db.logs.length !== initialLength) {
    saveDb();
    return true;
  }
  return false;
}

/**
 * ACTIONS SERVICE METHODS
 */

export function getUserActionPlan(userId) {
  const userPlan = db.actionPlans.find(plan => plan.userId === userId);
  return userPlan ? userPlan.actions : [];
}

export function saveUserActionPlan(userId, actionsList) {
  let userPlan = db.actionPlans.find(plan => plan.userId === userId);
  
  if (!userPlan) {
    userPlan = { userId, actions: [] };
    db.actionPlans.push(userPlan);
  }

  // Merge lists to avoid overwriting completed actions or duplicate tasks
  const existingActions = userPlan.actions;
  const existingTasks = existingActions.map(a => a.task.toLowerCase());

  actionsList.forEach(newAct => {
    if (!existingTasks.includes(newAct.task.toLowerCase())) {
      existingActions.push({
        id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        task: newAct.task,
        category: newAct.category || 'other',
        co2Reduction: newAct.co2Reduction || 0.5,
        difficulty: newAct.difficulty || 'easy',
        completed: false
      });
    }
  });

  saveDb();
  return userPlan.actions;
}

export function toggleActionCompleted(userId, actionId) {
  const userPlan = db.actionPlans.find(plan => plan.userId === userId);
  if (!userPlan) throw new Error('Action plan not found');

  const action = userPlan.actions.find(a => a.id === actionId);
  if (!action) throw new Error('Action item not found');

  action.completed = !action.completed;

  // If task was marked as completed, insert a carbon savings credit log
  if (action.completed) {
    addLog(userId, {
      category: action.category,
      co2: -action.co2Reduction, // Negative for savings
      description: `Completed: ${action.task}`
    });
  } else {
    // If unchecked, delete the corresponding carbon savings log
    db.logs = db.logs.filter(
      log => !(log.userId === userId && log.description === `Completed: ${action.task}`)
    );
  }

  saveDb();
  return { action, allActions: userPlan.actions };
}
