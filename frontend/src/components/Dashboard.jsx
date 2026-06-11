import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Trash2, 
  Car, 
  Utensils, 
  Zap, 
  Trash, 
  Layers, 
  Scale,
  CalendarDays,
  Download
} from 'lucide-react';

/**
 * Dashboard Component
 * Computes and displays real-time carbon footprint metrics and history.
 */
export default function Dashboard({ activities, onDeleteActivity }) {
  // 1. Calculations
  const emittedList = activities.filter(act => act.co2 > 0);
  const offsetList = activities.filter(act => act.co2 < 0);

  const totalEmitted = emittedList.reduce((sum, act) => sum + act.co2, 0);
  const totalOffset = Math.abs(offsetList.reduce((sum, act) => sum + act.co2, 0));
  const netFootprint = totalEmitted - totalOffset;

  // Group by category (only positive emissions for category breakdown)
  const categories = {
    transport: { label: 'Transport', co2: 0, color: '#3b82f6', icon: Car },
    diet: { label: 'Diet', co2: 0, color: '#f59e0b', icon: Utensils },
    energy: { label: 'Energy', co2: 0, color: '#10b981', icon: Zap },
    waste: { label: 'Waste', co2: 0, color: '#f43f5e', icon: Trash },
    other: { label: 'Other', co2: 0, color: '#9ca3af', icon: Layers }
  };

  emittedList.forEach(act => {
    const cat = act.category || 'other';
    if (categories[cat]) {
      categories[cat].co2 += act.co2;
    } else {
      categories.other.co2 += act.co2;
    }
  });

  const maxCategoryCO2 = Math.max(...Object.values(categories).map(c => c.co2), 1);
  const overallEmissionTotal = Object.values(categories).reduce((sum, c) => sum + c.co2, 0);

  // Format numbers to 1 decimal place
  const formatCO2 = (num) => Math.abs(num).toFixed(1);

  // CSV Data Exporter (Pure client-side implementation)
  const handleExportCSV = () => {
    if (activities.length === 0) return;

    // Header row
    let csvContent = "data:text/csv;charset=utf-8,Date,Category,Description,CO2 Impact (kg)\n";

    // Row parsing
    activities.forEach(act => {
      const escapedDesc = `"${act.description.replace(/"/g, '""')}"`;
      const co2Formatted = act.co2 > 0 ? `+${act.co2}` : `${act.co2}`;
      csvContent += `${act.date},${act.category || 'other'},${escapedDesc},${co2Formatted}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ecotrace_carbon_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="dashboard-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* 1. Metric Cards Grid */}
      <div className="metrics-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem'
      }}>
        {/* Net Footprint */}
        <div className="glass-card metric-card net-card" aria-live="polite" aria-label={`Net Daily Footprint: ${netFootprint < 0 ? '-' : ''}${formatCO2(netFootprint)} kg CO2`} style={{
          padding: '1.5rem',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '140px',
          borderLeft: '4px solid var(--color-primary)'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Net Daily Footprint</span>
              <Scale size={20} color="var(--color-primary)" aria-hidden="true" />
            </div>
            <h2 style={{ fontSize: '2.2rem', fontWeight: '800', marginTop: '0.5rem', color: '#fff', textShadow: '0 0 10px rgba(255,255,255,0.1)' }}>
              {netFootprint < 0 ? '-' : ''}{formatCO2(netFootprint)} <span style={{ fontSize: '1rem', fontWeight: '500', color: 'var(--text-secondary)' }}>kg CO₂</span>
            </h2>
          </div>
          <p style={{ fontSize: '0.75rem', color: netFootprint <= 0 ? 'var(--color-primary)' : 'var(--text-secondary)', marginTop: '0.5rem' }}>
            {netFootprint <= 0 
              ? '🎉 Net Carbon Negative! Outstanding.' 
              : `Your total net carbon balance for today.`}
          </p>
        </div>

        {/* Total Emitted */}
        <div className="glass-card metric-card" aria-live="polite" aria-label={`Total Emitted: ${formatCO2(totalEmitted)} kg CO2`} style={{
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '140px',
          borderLeft: '4px solid var(--color-danger)'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Emitted</span>
              <TrendingUp size={20} color="var(--color-danger)" aria-hidden="true" />
            </div>
            <h2 style={{ fontSize: '2.2rem', fontWeight: '800', marginTop: '0.5rem' }}>
              {formatCO2(totalEmitted)} <span style={{ fontSize: '1rem', fontWeight: '500', color: 'var(--text-secondary)' }}>kg CO₂</span>
            </h2>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Carbon additions from habits logged.
          </p>
        </div>

        {/* Total Offsets / Savings */}
        <div className="glass-card metric-card" aria-live="polite" aria-label={`Carbon Saved: ${formatCO2(totalOffset)} kg CO2`} style={{
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '140px',
          borderLeft: '4px solid var(--color-secondary)'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Carbon Saved</span>
              <TrendingDown size={20} color="var(--color-secondary)" aria-hidden="true" />
            </div>
            <h2 style={{ fontSize: '2.2rem', fontWeight: '800', marginTop: '0.5rem', color: '#67e8f9' }}>
              {formatCO2(totalOffset)} <span style={{ fontSize: '1rem', fontWeight: '500', color: 'var(--text-secondary)' }}>kg CO₂</span>
            </h2>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Mitigations from green choices & completed tasks.
          </p>
        </div>
      </div>

      {/* 2. Category Breakdown Chart */}
      <div className="glass-card chart-card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>Emission Source Analysis</span>
        </h3>
        
        {overallEmissionTotal === 0 ? (
          <div style={{
            padding: '2rem',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.9rem',
            border: '1px dashed var(--glass-border)',
            borderRadius: 'var(--radius-md)'
          }}>
            No emissions logged yet. Type your habits in the AI Assistant on the right (e.g. "I drove 10 miles today") to populate the analysis!
          </div>
        ) : (
          <div className="category-bars" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {Object.entries(categories).map(([key, cat]) => {
              const percentage = overallEmissionTotal > 0 ? (cat.co2 / overallEmissionTotal) * 100 : 0;
              const scalePercentage = (cat.co2 / maxCategoryCO2) * 100;
              const CatIcon = cat.icon;

              if (cat.co2 === 0) return null;

              return (
                <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '500' }}>
                      <span style={{ 
                        color: cat.color, 
                        background: `${cat.color}15`, 
                        padding: '0.25rem', 
                        borderRadius: 'var(--radius-sm)',
                        display: 'inline-flex'
                      }} aria-hidden="true">
                        <CatIcon size={16} />
                      </span>
                      <span>{cat.label}</span>
                    </div>
                    <div style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                      {formatCO2(cat.co2)} kg <span style={{ color: 'var(--text-secondary)', fontWeight: '400', fontSize: '0.75rem' }}>({percentage.toFixed(0)}%)</span>
                    </div>
                  </div>
                  {/* Progress Bar Container */}
                  <div style={{
                    width: '100%',
                    height: '8px',
                    background: 'var(--bg-tertiary)',
                    borderRadius: '9999px',
                    overflow: 'hidden'
                  }} role="progressbar" aria-valuenow={percentage} aria-valuemin="0" aria-valuemax="100" aria-label={`${cat.label} emissions: ${formatCO2(cat.co2)} kg CO2 (${percentage.toFixed(0)}% of total)`}>
                    {/* Animated Fill Bar */}
                    <div style={{
                      width: `${scalePercentage}%`,
                      height: '100%',
                      background: `linear-gradient(90deg, ${cat.color}dd, ${cat.color})`,
                      borderRadius: '9999px',
                      transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. History Logs List */}
      <div className="glass-card history-card" style={{ padding: '1.5rem', flex: 1 }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '1.25rem' 
        }}>
          <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>Activity History Logs</span>
          </h3>

          {activities.length > 0 && (
            <button
              onClick={handleExportCSV}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.75rem',
                fontWeight: '600',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-secondary)',
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                transition: 'var(--transition-fast)'
              }}
              className="export-csv-btn"
              title="Export activities as CSV file"
              aria-label="Export activity log history as a CSV file"
            >
              <Download size={14} aria-hidden="true" />
              <span>Export CSV</span>
            </button>
          )}
        </div>

        {activities.length === 0 ? (
          <div style={{
            padding: '2.5rem 1.5rem',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.9rem',
            border: '1px dashed var(--glass-border)',
            borderRadius: 'var(--radius-md)'
          }}>
            <CalendarDays size={32} style={{ marginBottom: '0.75rem', opacity: 0.5 }} />
            <p>Your logged activities will appear here.</p>
            <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Use the quick prompts or type in the chat to begin tracking.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.875rem',
              textAlign: 'left'
            }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.75rem 0.5rem', fontWeight: '500' }}>Date</th>
                  <th style={{ padding: '0.75rem 0.5rem', fontWeight: '500' }}>Category</th>
                  <th style={{ padding: '0.75rem 0.5rem', fontWeight: '500' }}>Activity</th>
                  <th style={{ padding: '0.75rem 0.5rem', fontWeight: '500', textAlign: 'right' }}>CO₂ Impact</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {activities.map((act) => {
                  const isEmitted = act.co2 > 0;
                  return (
                    <tr key={act.id} className="history-row" style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                      transition: 'background 0.2s ease'
                    }}>
                      <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {act.date}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <span className={`badge badge-${act.category || 'other'}`}>
                          {act.category || 'other'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: '500', color: '#fff' }}>
                        {act.description}
                      </td>
                      <td style={{ 
                        padding: '0.75rem 0.5rem', 
                        textAlign: 'right', 
                        fontWeight: '600',
                        color: isEmitted ? 'var(--color-danger)' : 'var(--color-primary)' 
                      }}>
                        {isEmitted ? '+' : '-'}{formatCO2(act.co2)} kg
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                        <button 
                          onClick={() => onDeleteActivity(act.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                            padding: '0.25rem',
                            borderRadius: 'var(--radius-sm)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            transition: 'color 0.2s ease'
                          }}
                          className="delete-log-btn"
                          title="Delete Activity"
                          aria-label={`Delete activity log: ${act.description} representing ${act.co2 > 0 ? '+' : '-'}${formatCO2(act.co2)} kg CO2`}
                        >
                          <Trash2 size={15} aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .history-row:hover {
          background-color: rgba(255, 255, 255, 0.02);
        }
        .delete-log-btn:hover {
          color: var(--color-danger) !important;
          background-color: rgba(244, 63, 94, 0.1) !important;
        }
        .export-csv-btn:hover {
          background-color: rgba(255, 255, 255, 0.08) !important;
          border-color: rgba(255, 255, 255, 0.15) !important;
          color: var(--text-primary) !important;
        }
      `}} />
    </div>
  );
}
