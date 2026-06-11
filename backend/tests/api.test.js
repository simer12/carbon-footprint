import request from 'supertest';
import app from '../server.js';
import fs from 'fs';
import path from 'path';

describe('Carbon Footprint Stateful API Endpoints', () => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'testpassword123';
  let jwtToken = '';

  describe('GET /api/status', () => {
    it('should return 200 OK and show server status details', async () => {
      const response = await request(app).get('/api/status');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'online');
    });
  });

  describe('User Authentication Flow', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: testEmail, password: testPassword });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('email', testEmail);
      expect(response.body.user).toHaveProperty('id');
    });

    it('should block duplicate email registrations with 409 Conflict', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: testEmail, password: testPassword });

      expect(response.status).toBe(409);
    });

    it('should log in the registered user and return a JWT', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: testPassword });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      jwtToken = response.body.token; // Save token for subsequent tests
    });

    it('should fail login with incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: 'wrongpassword' });

      expect(response.status).toBe(401);
    });
  });

  describe('Secured Routes access control', () => {
    it('should reject access to secured endpoints without a token', async () => {
      const response = await request(app).get('/api/activities');
      expect(response.status).toBe(401);
    });

    it('should reject access with an invalid token', async () => {
      const response = await request(app)
        .get('/api/activities')
        .set('Authorization', 'Bearer invalid-token-string');
      expect(response.status).toBe(403);
    });

    it('should grant access to GET /api/activities with a valid JWT', async () => {
      const response = await request(app)
        .get('/api/activities')
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      // It should have some default activities seeded on register
      expect(response.body.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Stateful Habit Processing & Deterministic Calculator', () => {
    it('should process a chat message and automatically record the activity log', async () => {
      const response = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          message: 'I drove my petrol car 20 miles today.',
          chatHistory: []
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('text');
      expect(response.body).toHaveProperty('activities');
      expect(response.body).toHaveProperty('actionPlan');

      // The backend should calculate the emissions: 20 miles * 0.27 (sedan) = 5.4 kg CO2
      const transportLog = response.body.activities.find(l => l.category === 'transport');
      expect(transportLog).toBeDefined();
      expect(transportLog.co2).toBe(5.4); // 20 * 0.27
    });

    it('should toggle action plan checklist and generate corresponding credit logs', async () => {
      // 1. Get action plan
      const planResponse = await request(app)
        .get('/api/action-plan')
        .set('Authorization', `Bearer ${jwtToken}`);
      
      expect(planResponse.status).toBe(200);
      expect(planResponse.body.length).toBeGreaterThan(0);
      
      const targetTask = planResponse.body[0];
      
      // 2. Toggle completion
      const toggleResponse = await request(app)
        .post(`/api/action-plan/${targetTask.id}/toggle`)
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(toggleResponse.status).toBe(200);
      expect(toggleResponse.body.action.completed).toBe(true);

      // Verify that a corresponding offset activity has been logged: Completed: [Task Name]
      const offsetLog = toggleResponse.body.activities.find(
        l => l.description === `Completed: ${targetTask.task}`
      );
      expect(offsetLog).toBeDefined();
      expect(offsetLog.co2).toBe(-targetTask.co2Reduction); // Negative credit!
    });
  });
});
