import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import App from '../App';
import Dashboard from '../components/Dashboard';
import ActionPlan from '../components/ActionPlan';

// Mock api to avoid hitting the actual network
vi.mock('../services/api', () => ({
  getBackendStatus: vi.fn(() => Promise.resolve({ status: 'online', demoMode: true })),
  sendChatMessage: vi.fn(() => Promise.resolve({
    text: "Mocked AI response!",
    activities: [{ category: 'transport', co2: 2.5, description: 'Commute log test', date: '2026-06-09' }],
    actionPlan: [{ id: 'mock-act-99', task: 'Mock recommendation', category: 'energy', co2Reduction: 1.0, difficulty: 'easy', completed: false }]
  })),
  getAuthToken: vi.fn(() => null),
  setAuthToken: vi.fn(),
  getCurrentUser: vi.fn(() => Promise.resolve({ user: null })),
  fetchActivities: vi.fn(() => Promise.resolve([])),
  fetchActionPlan: vi.fn(() => Promise.resolve([]))
}));

describe('Frontend Rendering and Analytics', () => {
  it('App renders brand title and navigation header', async () => {
    render(<App />);
    expect(await screen.findByText('Welcome to EcoTrace')).toBeInTheDocument();
    expect(screen.getByText('Email Address')).toBeInTheDocument();
    expect(screen.getAllByText('Sign In').length).toBe(2);
  });

  it('Dashboard component displays calculated CO2 metric totals correctly', () => {
    const mockActivities = [
      { id: '1', category: 'transport', co2: 5.0, description: 'SUV commute', date: '2026-06-09' },
      { id: '2', category: 'diet', co2: 0.5, description: 'Vegan salad', date: '2026-06-09' },
      { id: '3', category: 'energy', co2: -2.0, description: 'Completed: Turned off AC', date: '2026-06-09' } // negative is savings
    ];

    render(<Dashboard activities={mockActivities} onDeleteActivity={() => {}} />);

    // Total Emitted: 5.0 + 0.5 = 5.5 kg
    expect(screen.getByText('5.5')).toBeInTheDocument();
    
    // Carbon Saved: 2.0 kg
    expect(screen.getByText('2.0')).toBeInTheDocument();

    // Net Footprint: 5.5 - 2.0 = 3.5 kg
    expect(screen.getByText('3.5')).toBeInTheDocument();
  });

  it('ActionPlan renders recommended actions checklist and handles toggle trigger', () => {
    const mockActionPlan = [
      { id: 'act-1', task: 'Turn off unnecessary lights', category: 'energy', co2Reduction: 0.5, difficulty: 'easy', completed: false }
    ];
    const handleToggle = vi.fn();

    render(<ActionPlan actionPlan={mockActionPlan} onToggleAction={handleToggle} />);

    expect(screen.getByText('Turn off unnecessary lights')).toBeInTheDocument();
    expect(screen.getByText('Save 0.5 kg CO₂')).toBeInTheDocument();
    expect(screen.getByText(/easy/i)).toBeInTheDocument();

    // Clicking the item triggers toggle handler
    const card = screen.getByText('Turn off unnecessary lights').closest('.action-item-card');
    fireEvent.click(card);

    expect(handleToggle).toHaveBeenCalledTimes(1);
    expect(handleToggle).toHaveBeenCalledWith('act-1');
  });
});
