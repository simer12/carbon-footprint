import React, { useState, useRef, useEffect } from 'react';
import { Send, Leaf, User, Sparkles } from 'lucide-react';

/**
 * ChatInterface Component
 * Handles the AI coaching conversation and quick logging buttons.
 */
export default function ChatInterface({ chatHistory, onSendMessage, isLoading }) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);

  // Quick logging chip presets
  const quickActions = [
    { label: '🚗 Drove 15 mi', text: 'I drove my petrol car 15 miles today.' },
    { label: '🚲 Biked to Work', text: 'I rode my bicycle to work instead of driving my 10-mile car commute.' },
    { label: '🥩 Ate Beef Dinner', text: 'I had a beef steak for dinner tonight.' },
    { label: '🥗 Vegan Lunch', text: 'I ate a plant-based vegan salad for lunch.' },
    { label: '🔌 Saved Energy', text: 'I turned off the AC and unplugged all unused devices for 4 hours.' },
    { label: '♻️ Recycled Bottles', text: 'I recycled all my plastic bottles and cardboard boxes.' }
  ];

  // Auto scroll to bottom
  const scrollToBottom = () => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, isLoading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    onSendMessage(inputValue.trim());
    setInputValue('');
  };

  const handleQuickAction = (text) => {
    if (isLoading) return;
    onSendMessage(text);
  };

  return (
    <div className="chat-container glass-card" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '600px',
      width: '100%',
      maxWidth: '100%',
      overflow: 'hidden',
      position: 'relative'
    }}>
      
      {/* 1. Header */}
      <div style={{
        padding: '1rem 1.25rem',
        borderBottom: '1px solid var(--glass-border)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        background: 'rgba(255,255,255,0.01)'
      }}>
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)',
          color: 'var(--color-primary)',
          borderRadius: 'var(--radius-md)',
          padding: '0.5rem',
          display: 'inline-flex'
        }} aria-hidden="true">
          <Sparkles size={18} />
        </div>
        <div>
          <h3 style={{ fontSize: '0.975rem', fontWeight: '600' }}>AI Carbon Coach</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Log habits naturally. E.g. "I ate beef" or "Biked 5 mi"</p>
        </div>
      </div>

      {/* 2. Messages Log */}
      <div className="messages-log" role="log" aria-live="polite" aria-label="Conversation log history" style={{
        flex: 1,
        padding: '1.25rem',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        {chatHistory.length === 0 ? (
          <div style={{
            margin: 'auto',
            textAlign: 'center',
            maxWidth: '280px',
            color: 'var(--text-secondary)',
            padding: '2rem 1rem'
          }}>
            <Leaf size={32} color="var(--color-primary)" style={{ marginBottom: '1rem', animation: 'bounceSlow 3s infinite' }} aria-hidden="true" />
            <h4 style={{ color: '#fff', marginBottom: '0.5rem', fontSize: '1rem' }}>Welcome to EcoTrace!</h4>
            <p style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>
              I am your AI Carbon Coach. Type details of your daily habits below, or click any quick-log chip to see how your choices impact your dashboard.
            </p>
          </div>
        ) : (
          chatHistory.map((msg, index) => {
            const isUser = msg.sender === 'user';
            return (
              <div 
                key={index} 
                className={`message-bubble-wrapper ${isUser ? 'user-align' : 'coach-align'}`}
                style={{
                  display: 'flex',
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                  gap: '0.5rem',
                  alignItems: 'flex-start',
                  animation: 'fadeInUp 0.3s ease-out forwards'
                }}
              >
                {/* Avatar */}
                {!isUser && (
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: 'var(--color-primary)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.35rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: '0.2rem'
                  }} aria-hidden="true">
                    <Leaf size={14} />
                  </div>
                )}
                
                {/* Text Body */}
                <div style={{
                  maxWidth: '75%',
                  background: isUser ? 'rgba(59, 130, 246, 0.15)' : 'rgba(31, 41, 55, 0.65)',
                  border: isUser ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid var(--glass-border)',
                  padding: '0.75rem 1rem',
                  borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  color: '#fff',
                  fontSize: '0.875rem',
                  lineHeight: '1.45',
                  wordBreak: 'break-word',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  {msg.text}
                </div>

                {isUser && (
                  <div style={{
                    background: 'rgba(59, 130, 246, 0.15)',
                    color: '#60a5fa',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.35rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: '0.2rem'
                  }} aria-hidden="true">
                    <User size={14} />
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center',
            animation: 'fadeIn 0.2s'
          }} role="status" aria-live="assertive" aria-label="AI Carbon Coach is analyzing metrics">
            <div style={{
              background: 'rgba(16, 185, 129, 0.15)',
              color: 'var(--color-primary)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.35rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Leaf size={14} className="spin-slow" aria-hidden="true" />
            </div>
            <div style={{
              background: 'rgba(31, 41, 55, 0.4)',
              border: '1px solid var(--glass-border)',
              padding: '0.5rem 0.75rem',
              borderRadius: '12px 12px 12px 4px',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span className="dot-loading-anim">Analyzing carbon metrics...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. Quick Actions Chips */}
      <div style={{
        padding: '0.5rem 0.75rem',
        borderTop: '1px solid rgba(255,255,255,0.03)',
        background: 'rgba(0,0,0,0.1)',
        width: '100%',
        overflow: 'hidden'
      }}>
        <div className="quick-scroll-chips" role="group" aria-label="Habit logging presets" style={{
          display: 'flex',
          gap: '0.5rem',
          overflowX: 'auto',
          paddingBottom: '4px',
          scrollBehavior: 'smooth',
          width: '100%'
        }}>
          {quickActions.map((chip, idx) => (
            <button
              key={idx}
              disabled={isLoading}
              onClick={() => handleQuickAction(chip.text)}
              style={{
                whiteSpace: 'nowrap',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-secondary)',
                padding: '0.35rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'var(--transition-fast)',
                outline: 'none'
              }}
              className="chip-btn"
              aria-label={`Pre-set log: ${chip.label}`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Text Form Input */}
      <form onSubmit={handleSubmit} style={{
        padding: '0.85rem 1rem',
        borderTop: '1px solid var(--glass-border)',
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center',
        background: 'var(--bg-secondary)'
      }}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={isLoading ? "Coach is thinking..." : "Ask or log: 'I rode the train 20 miles'..."}
          disabled={isLoading}
          aria-label="Chat message log details input"
          style={{
            flex: 1,
            minWidth: '0',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--glass-border)',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            color: '#fff',
            outline: 'none',
            fontSize: '0.875rem',
            transition: 'var(--transition-fast)',
            fontFamily: 'var(--font-body)'
          }}
          className="chat-input"
        />
        <button
          type="submit"
          disabled={isLoading || !inputValue.trim()}
          aria-label="Send message to AI carbon coach"
          style={{
            background: inputValue.trim() ? 'var(--color-primary)' : 'var(--bg-tertiary)',
            color: inputValue.trim() ? '#fff' : 'var(--text-muted)',
            width: '42px',
            height: '42px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: (isLoading || !inputValue.trim()) ? 'not-allowed' : 'pointer',
            transition: 'var(--transition-fast)',
            boxShadow: inputValue.trim() ? '0 0 10px rgba(16, 185, 129, 0.2)' : 'none'
          }}
          className="chat-send-btn"
        >
          <Send size={16} aria-hidden="true" />
        </button>
      </form>

      <style dangerouslySetInnerHTML={{__html: `
        .chip-btn:hover:not(:disabled) {
          background-color: rgba(16, 185, 129, 0.1) !important;
          border-color: rgba(16, 185, 129, 0.3) !important;
          color: var(--color-primary) !important;
        }
        .chat-input:focus {
          border-color: var(--color-primary) !important;
          box-shadow: 0 0 0 2px var(--color-primary-glow) !important;
        }
        .quick-scroll-chips::-webkit-scrollbar {
          height: 3px;
        }
        .quick-scroll-chips::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.05);
        }
        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin-slow {
          animation: spinSlow 3s linear infinite;
        }
        .dot-loading-anim::after {
          content: '.';
          animation: dots 1.5s steps(5, end) infinite;
        }
        @keyframes dots {
          0%, 20% { content: '.'; }
          40% { content: '..'; }
          60% { content: '...'; }
          80%, 100% { content: ''; }
        }
      `}} />
    </div>
  );
}
