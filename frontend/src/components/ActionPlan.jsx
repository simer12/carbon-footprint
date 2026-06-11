import React from 'react';
import { Check, Award, Car, Utensils, Zap, Trash, Layers } from 'lucide-react';

/**
 * ActionPlan Component
 * Renders a list of sustainability tasks recommended by the AI.
 */
export default function ActionPlan({ actionPlan, onToggleAction }) {
  
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'transport': return Car;
      case 'diet': return Utensils;
      case 'energy': return Zap;
      case 'waste': return Trash;
      default: return Layers;
    }
  };

  const getDifficultyColor = (diff) => {
    switch (diff) {
      case 'easy': return '#10b981'; // emerald
      case 'medium': return '#f59e0b'; // amber
      case 'hard': return '#f43f5e'; // rose
      default: return '#9ca3af';
    }
  };

  // Sort: put completed items at the bottom
  const sortedPlan = [...actionPlan].sort((a, b) => {
    if (a.completed === b.completed) return 0;
    return a.completed ? 1 : -1;
  });

  const completedCount = actionPlan.filter(item => item.completed).length;
  const progressPercent = actionPlan.length > 0 ? (completedCount / actionPlan.length) * 100 : 0;

  return (
    <div className="action-plan-container glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* 1. Header & Progress */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>Personalized Daily Action Plan</span>
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
            {completedCount}/{actionPlan.length} Done
          </span>
        </div>
        
        {actionPlan.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
            {/* Progress Bar */}
            <div style={{
              flex: 1,
              height: '6px',
              background: 'var(--bg-tertiary)',
              borderRadius: '9999px',
              overflow: 'hidden'
            }} role="progressbar" aria-valuenow={progressPercent} aria-valuemin="0" aria-valuemax="100" aria-label="Action items progress completion rate">
              <div style={{
                width: `${progressPercent}%`,
                height: '100%',
                background: 'linear-gradient(90deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
                borderRadius: '9999px',
                transition: 'width 0.4s ease'
              }} />
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', minWidth: '30px', textAlign: 'right' }}>
              {progressPercent.toFixed(0)}%
            </span>
          </div>
        )}
      </div>

      {/* 2. Tasks Checklist */}
      {actionPlan.length === 0 ? (
        <div style={{
          padding: '2.5rem 1rem',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.9rem',
          border: '1px dashed var(--glass-border)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Award size={36} style={{ marginBottom: '0.75rem', opacity: 0.5 }} />
          <p>No actions recommended yet.</p>
          <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Ask your AI coach to "suggest daily action items" or log habits to get personalized tasks.</p>
        </div>
      ) : (
        <div className="actions-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {sortedPlan.map((action) => {
            const CatIcon = getCategoryIcon(action.category);
            const difficultyColor = getDifficultyColor(action.difficulty);
            
            return (
              <div 
                key={action.id} 
                className={`action-item-card ${action.completed ? 'completed' : ''}`}
                onClick={() => onToggleAction(action.id)}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    onToggleAction(action.id);
                  }
                }}
                role="checkbox"
                aria-checked={action.completed}
                tabIndex="0"
                aria-label={`Action: ${action.task}. Difficulty: ${action.difficulty}. Savings: ${action.co2Reduction.toFixed(1)} kg CO2.`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: action.completed ? 'rgba(255, 255, 255, 0.01)' : 'rgba(255, 255, 255, 0.02)',
                  border: action.completed ? '1px solid rgba(255, 255, 255, 0.03)' : '1px solid var(--glass-border)',
                  cursor: 'pointer',
                  transition: 'var(--transition-fast)',
                  opacity: action.completed ? 0.65 : 1
                }}
              >
                {/* Custom Checkbox (Visual representation, hidden from A11y tree as parent manages checkbox state) */}
                <div style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '6px',
                  border: action.completed ? '2px solid var(--color-primary)' : '2px solid var(--text-muted)',
                  background: action.completed ? 'var(--color-primary)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'var(--transition-fast)',
                  flexShrink: 0
                }} aria-hidden="true">
                  {action.completed && <Check size={14} color="#fff" strokeWidth={3} />}
                </div>

                {/* Task Text & Metadata */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span style={{
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: action.completed ? 'var(--text-secondary)' : '#fff',
                    textDecoration: action.completed ? 'line-through' : 'none',
                    transition: 'var(--transition-fast)',
                    lineHeight: '1.3'
                  }}>
                    {action.task}
                  </span>
                  
                  {/* Metadata Row */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Category Icon indicator */}
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontSize: '0.7rem',
                      color: 'var(--text-secondary)'
                    }}>
                      <CatIcon size={12} aria-hidden="true" />
                      <span style={{ textTransform: 'capitalize' }}>{action.category}</span>
                    </span>

                    <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>•</span>
                    
                    {/* Difficulty Badge */}
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: '600',
                      color: difficultyColor,
                      textTransform: 'uppercase'
                    }}>
                      {action.difficulty}
                    </span>

                    <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>•</span>

                    {/* CO2 Saving */}
                    <span style={{
                      fontSize: '0.7rem',
                      color: 'var(--color-secondary)',
                      fontWeight: '500'
                    }}>
                      Save {action.co2Reduction.toFixed(1)} kg CO₂
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .action-item-card:hover {
          background-color: rgba(255, 255, 255, 0.04) !important;
          transform: scale(1.005);
        }
      `}} />
    </div>
  );
}
