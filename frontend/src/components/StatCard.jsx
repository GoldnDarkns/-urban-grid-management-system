import { motion } from 'framer-motion';

export default function StatCard({ 
  value, 
  label, 
  icon: Icon, 
  color = 'primary',
  suffix = '',
  delay = 0 
}) {
  const colorMap = {
    primary: 'var(--accent-primary)',
    secondary: 'var(--accent-secondary)',
    warning: 'var(--accent-warning)',
    danger: 'var(--accent-danger)',
    purple: 'var(--accent-purple)',
  };

  return (
    <motion.div
      className="stat-card-container"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <div className="stat-icon" style={{ color: colorMap[color] }}>
        {Icon && <Icon size={24} />}
      </div>
      <div className="stat-content">
        <div className="stat-value" style={{ color: colorMap[color] }}>
          {value}{suffix}
        </div>
        <div className="stat-label">{label}</div>
      </div>

      <style>{`
        .stat-card-container {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1.5rem;
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          transition: all 0.3s ease;
        }

        .stat-card-container:hover {
          border-color: ${colorMap[color]};
          box-shadow: 0 0 20px ${colorMap[color]}33;
        }

        .stat-icon {
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }

        .stat-content {
          flex: 1;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 700;
          font-family: var(--font-mono);
          line-height: 1;
          margin-bottom: 0.25rem;
        }

        .stat-label {
          color: var(--text-secondary);
          font-size: 0.875rem;
        }
      `}</style>
    </motion.div>
  );
}

