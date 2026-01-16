import { motion } from 'framer-motion';

export default function ModelArchitecture({ layers, title }) {
  return (
    <div className="architecture-container">
      <h3 className="architecture-title">{title}</h3>
      <div className="layers-flow">
        {layers.map((layer, index) => (
          <motion.div
            key={index}
            className="layer-item"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <div className={`layer-box ${layer.type?.toLowerCase()}`}>
              <div className="layer-name">{layer.name}</div>
              <div className="layer-type">{layer.type}</div>
              {layer.units && (
                <div className="layer-units">{layer.units} units</div>
              )}
              {layer.activation && (
                <div className="layer-activation">{layer.activation}</div>
              )}
              {layer.rate && (
                <div className="layer-rate">rate: {layer.rate}</div>
              )}
            </div>
            {index < layers.length - 1 && (
              <div className="layer-connector">
                <svg width="40" height="20" viewBox="0 0 40 20">
                  <path
                    d="M0 10 L30 10 L25 5 M30 10 L25 15"
                    stroke="var(--accent-primary)"
                    strokeWidth="2"
                    fill="none"
                  />
                </svg>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <style>{`
        .architecture-container {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1.5rem;
          overflow-x: auto;
        }

        .architecture-title {
          font-size: 1.125rem;
          font-weight: 600;
          margin-bottom: 1.5rem;
          color: var(--text-primary);
        }

        .layers-flow {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          min-width: max-content;
          padding: 1rem 0;
        }

        .layer-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .layer-box {
          background: var(--bg-secondary);
          border: 2px solid var(--border-color);
          border-radius: 8px;
          padding: 1rem;
          min-width: 120px;
          text-align: center;
          transition: all 0.3s ease;
        }

        .layer-box:hover {
          border-color: var(--accent-primary);
          box-shadow: 0 0 15px rgba(0, 255, 136, 0.2);
        }

        .layer-box.lstm {
          border-color: var(--accent-secondary);
        }

        .layer-box.dense {
          border-color: var(--accent-primary);
        }

        .layer-box.dropout {
          border-color: var(--accent-warning);
        }

        .layer-box.input {
          border-color: var(--accent-purple);
        }

        .layer-box.graphconvlayer {
          border-color: var(--accent-secondary);
        }

        .layer-name {
          font-weight: 600;
          font-size: 0.875rem;
          color: var(--text-primary);
          margin-bottom: 0.25rem;
        }

        .layer-type {
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: var(--accent-primary);
          margin-bottom: 0.25rem;
        }

        .layer-units,
        .layer-activation,
        .layer-rate {
          font-size: 0.7rem;
          color: var(--text-secondary);
        }

        .layer-connector {
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}

