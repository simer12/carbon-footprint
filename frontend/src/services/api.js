/**
 * Stateful Carbon Footprint API Service Wrapper
 */

const API_BASE = '/api';

/**
 * JWT Token Management
 */
export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('ecotrace_auth_token', token);
  } else {
    localStorage.removeItem('ecotrace_auth_token');
  }
}

export function getAuthToken() {
  return localStorage.getItem('ecotrace_auth_token');
}

function getHeaders() {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

/**
 * API ENDPOINTS
 */

// 1. Connection check
export async function getBackendStatus() {
  try {
    const response = await fetch(`${API_BASE}/status`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) throw new Error(`Server returned ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('Backend server connection failed, falling back to standalone offline simulation.', error);
    return {
      status: 'offline',
      demoMode: true,
      message: 'Running in standalone local simulation mode.'
    };
  }
}

// 2. Authentication: Register
export async function register(email, password) {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Registration failed');
  }

  const data = await response.json();
  setAuthToken(data.token);
  return data; // { user, token }
}

// 3. Authentication: Login
export async function login(email, password) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Login failed');
  }

  const data = await response.json();
  setAuthToken(data.token);
  return data; // { user, token }
}

// 4. Get Current User profile (validation)
export async function getCurrentUser() {
  const response = await fetch(`${API_BASE}/auth/me`, {
    method: 'GET',
    headers: getHeaders()
  });

  if (!response.ok) {
    setAuthToken(null);
    throw new Error('Session expired');
  }
  return await response.json(); // { user }
}

// 5. Fetch activities
export async function fetchActivities() {
  const response = await fetch(`${API_BASE}/activities`, {
    method: 'GET',
    headers: getHeaders()
  });

  if (!response.ok) throw new Error('Failed to fetch activity logs');
  return await response.json(); // Array of logs
}

// 6. Delete activity
export async function deleteActivityLog(id) {
  const response = await fetch(`${API_BASE}/activities/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });

  if (!response.ok) throw new Error('Failed to delete activity log');
  return await response.json();
}

// 7. Fetch action plan tasks
export async function fetchActionPlan() {
  const response = await fetch(`${API_BASE}/action-plan`, {
    method: 'GET',
    headers: getHeaders()
  });

  if (!response.ok) throw new Error('Failed to fetch action plan tasks');
  return await response.json();
}

// 8. Toggle action plan task
export async function toggleActionTask(id) {
  const response = await fetch(`${API_BASE}/action-plan/${id}/toggle`, {
    method: 'POST',
    headers: getHeaders()
  });

  if (!response.ok) throw new Error('Failed to toggle action item');
  return await response.json(); // { action, actionPlan, activities }
}

// 9. Send Chat message
export async function sendChatMessage(message, chatHistory = []) {
  try {
    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ message, chatHistory })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Chat analysis failed');
    }

    return await response.json(); // { text, activities, actionPlan, user }
  } catch (error) {
    console.error('Chat API call failed, running local simulator:', error);
    return simulateLocalResponse(message);
  }
}

/**
 * Local offline simulation logic fallback
 */
function simulateLocalResponse(message) {
  const text = message.toLowerCase();
  const today = new Date().toISOString().split('T')[0];
  const activities = [];
  const actionPlan = [];
  let responseText = "Logged locally: ";

  if (text.includes('drive') || text.includes('car') || text.includes('mile')) {
    activities.push({
      category: 'transport',
      co2: 4.8,
      description: 'Commuted 15 miles in sedan (Local)',
      date: today
    });
    responseText += "Logged transport. Driving standard cars contributes around 4.8 kg CO2. Try walking or active transit!";
  } else {
    responseText += "Acknowledge habit check-in. Tell me details about your meals or transport to track emissions.";
  }

  return {
    text: responseText + " [Running in Standalone local client mode]",
    activities,
    actionPlan,
    user: { email: 'Offline User', streak: 1 },
    demoMode: true
  };
}
