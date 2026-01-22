import { useState, useEffect } from 'react';
import { Database, PlayCircle, Loader, AlertTriangle } from 'lucide-react';
import { queriesAPI } from '../services/api';

export default function MongoDBQueries() {
  const [queries, setQueries] = useState([]);
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [params, setParams] = useState({ zone_id: 'Z_001', limit: 10, hours: 24 });

  useEffect(() => {
    loadQueries();
  }, []);

  const loadQueries = async () => {
    try {
      const response = await queriesAPI.listQueries();
      setQueries(response.data.queries || []);
    } catch (err) {
      setError('Failed to load queries');
      console.error(err);
    }
  };

  const executeQuery = async (queryId) => {
    setLoading(true);
    setError(null);
    setResults(null);
    
    try {
      const queryParams = { ...params };
      if (queryId === 3 || queryId === 4) {
        queryParams.zone_id = params.zone_id;
      }
      if (queryId === 4 || queryId === 9) {
        queryParams.hours = params.hours;
      }
      if (queryId !== 3 && queryId !== 4 && queryId !== 9) {
        queryParams.limit = params.limit;
      }
      
      const response = await queriesAPI.executeQuery(queryId, queryParams);
      setResults(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to execute query');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const basicQueries = queries.filter(q => q.type === 'basic');
  const advancedQueries = queries.filter(q => q.type === 'advanced');

  return (
    <div className="mongodb-queries">
      <div className="section-header">
        <h3><Database size={20} /> MongoDB Queries</h3>
        <p>Execute and explore the 10 meaningful MongoDB queries</p>
      </div>

      <div className="queries-layout">
        <div className="queries-sidebar">
          <h4>Available Queries</h4>
          
          <div className="query-group">
            <h5>Basic Queries (3)</h5>
            {basicQueries.map(query => (
              <div
                key={query.id}
                className={`query-item ${selectedQuery?.id === query.id ? 'active' : ''}`}
                onClick={() => setSelectedQuery(query)}
              >
                <div className="query-number">{query.id}</div>
                <div className="query-info">
                  <div className="query-name">{query.name}</div>
                  <div className="query-desc">{query.description}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="query-group">
            <h5>Advanced Queries (7)</h5>
            {advancedQueries.map(query => (
              <div
                key={query.id}
                className={`query-item ${selectedQuery?.id === query.id ? 'active' : ''}`}
                onClick={() => setSelectedQuery(query)}
              >
                <div className="query-number">{query.id}</div>
                <div className="query-info">
                  <div className="query-name">{query.name}</div>
                  <div className="query-desc">{query.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="queries-main">
          {selectedQuery ? (
            <>
              <div className="query-header">
                <div>
                  <h4>Query {selectedQuery.id}: {selectedQuery.name}</h4>
                  <p>{selectedQuery.description}</p>
                  <div className="query-meta">
                    <span>Collection: {selectedQuery.collection}</span>
                    <span>Type: {selectedQuery.type}</span>
                  </div>
                </div>
                <button
                  className="execute-btn"
                  onClick={() => executeQuery(selectedQuery.id)}
                  disabled={loading}
                >
                  {loading ? <Loader size={18} className="spin" /> : <PlayCircle size={18} />}
                  Execute Query
                </button>
              </div>

              {(selectedQuery.id === 3 || selectedQuery.id === 4) && (
                <div className="query-params">
                  <label>
                    Zone ID:
                    <input
                      type="text"
                      value={params.zone_id}
                      onChange={(e) => setParams({ ...params, zone_id: e.target.value })}
                      placeholder="Z_001"
                    />
                  </label>
                </div>
              )}
              {selectedQuery.id === 4 && (
                <div className="query-params">
                  <label>
                    Hours:
                    <input
                      type="number"
                      value={params.hours}
                      onChange={(e) => setParams({ ...params, hours: parseInt(e.target.value) || 24 })}
                      min="1"
                      max="168"
                    />
                  </label>
                </div>
              )}
              {selectedQuery.id !== 3 && selectedQuery.id !== 4 && selectedQuery.id !== 9 && (
                <div className="query-params">
                  <label>
                    Limit:
                    <input
                      type="number"
                      value={params.limit}
                      onChange={(e) => setParams({ ...params, limit: parseInt(e.target.value) || 10 })}
                      min="1"
                      max="100"
                    />
                  </label>
                </div>
              )}

              {error && (
                <div className="query-error">
                  <AlertTriangle size={18} />
                  {error}
                </div>
              )}

              {results && (
                <div className="query-results">
                  <div className="results-header">
                    <h5>Results</h5>
                    <span className="results-count">{results.count || 0} records</span>
                  </div>
                  <div className="results-content">
                    <pre>{JSON.stringify(results.results || results, null, 2)}</pre>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="no-query-selected">
              <Database size={48} />
              <p>Select a query from the list to execute it</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .mongodb-queries {
          padding: 2rem;
        }
        .queries-layout {
          display: grid;
          grid-template-columns: 350px 1fr;
          gap: 2rem;
          margin-top: 2rem;
        }
        .queries-sidebar {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1.5rem;
          max-height: 80vh;
          overflow-y: auto;
        }
        .queries-sidebar h4 {
          margin-bottom: 1rem;
          color: var(--accent-primary);
        }
        .query-group {
          margin-bottom: 2rem;
        }
        .query-group h5 {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin-bottom: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .query-item {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          margin-bottom: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .query-item:hover {
          border-color: var(--accent-primary);
          background: rgba(0, 255, 136, 0.05);
        }
        .query-item.active {
          border-color: var(--accent-primary);
          background: rgba(0, 255, 136, 0.1);
        }
        .query-number {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--accent-primary);
          color: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          flex-shrink: 0;
        }
        .query-info {
          flex: 1;
        }
        .query-name {
          font-weight: 600;
          margin-bottom: 0.25rem;
        }
        .query-desc {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }
        .queries-main {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 2rem;
        }
        .query-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.5rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid var(--border-color);
        }
        .query-header h4 {
          margin-bottom: 0.5rem;
        }
        .query-header p {
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
        }
        .query-meta {
          display: flex;
          gap: 1rem;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }
        .execute-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: var(--accent-primary);
          color: #000;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .execute-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 255, 136, 0.3);
        }
        .execute-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .query-params {
          margin-bottom: 1rem;
        }
        .query-params label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
        }
        .query-params input {
          padding: 0.5rem;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          background: var(--bg-card);
          color: var(--text-primary);
          width: 150px;
        }
        .query-error {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem;
          background: rgba(255, 68, 68, 0.1);
          border: 1px solid var(--accent-danger);
          border-radius: 8px;
          color: var(--accent-danger);
          margin-bottom: 1rem;
        }
        .query-results {
          margin-top: 1.5rem;
        }
        .results-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .results-count {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }
        .results-content {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 1rem;
          max-height: 500px;
          overflow: auto;
        }
        .results-content pre {
          margin: 0;
          font-size: 0.875rem;
          color: var(--text-primary);
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        .no-query-selected {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 400px;
          color: var(--text-secondary);
        }
        .no-query-selected p {
          margin-top: 1rem;
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (max-width: 1200px) {
          .queries-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
