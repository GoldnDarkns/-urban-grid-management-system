import { motion } from 'framer-motion';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

export default function CodeBlock({ code, language = 'python', title }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      className="code-block-container"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="code-header">
        <span className="code-language">{language}</span>
        {title && <span className="code-title">{title}</span>}
        <button className="copy-btn" onClick={handleCopy}>
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="code-content">
        <code>{code}</code>
      </pre>

      <style>{`
        .code-block-container {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          overflow: hidden;
        }

        .code-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 1rem;
          background: var(--bg-tertiary);
          border-bottom: 1px solid var(--border-color);
        }

        .code-language {
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: var(--accent-primary);
          padding: 0.25rem 0.5rem;
          background: rgba(0, 255, 136, 0.1);
          border-radius: 4px;
        }

        .code-title {
          flex: 1;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .copy-btn {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.5rem;
          background: transparent;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          color: var(--text-secondary);
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .copy-btn:hover {
          border-color: var(--accent-primary);
          color: var(--accent-primary);
        }

        .code-content {
          padding: 1rem;
          overflow-x: auto;
          margin: 0;
        }

        .code-content code {
          font-family: var(--font-mono);
          font-size: 0.875rem;
          line-height: 1.6;
          color: var(--text-primary);
          white-space: pre;
        }
      `}</style>
    </motion.div>
  );
}

