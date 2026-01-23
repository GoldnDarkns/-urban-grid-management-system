import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, Plus, Edit2, Trash2, Save, X, AlertCircle, 
  CheckCircle, Code, FileText, Search, Filter
} from 'lucide-react';
import { queriesAPI } from '../services/api';
import { useAppMode } from '../utils/useAppMode';

export default function AdminQueries() {
  const { mode } = useAppMode();
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'basic',
    collection: 'zones'
  });

  useEffect(() => {
    if (mode !== 'sim') {
      setError('Query management is only available in Simulated mode. Please switch to Simulated mode.');
      setLoading(false);
      return;
    }
    loadQueries();
  }, [mode]);

  const loadQueries = async () => {
    try {
      setLoading(true);
      const response = await queriesAPI.listQueries();
      setQueries(response.data.queries || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load queries');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      setError(null);
      const response = await queriesAPI.createQuery(formData);
      if (response.data.error) {
        setError(response.data.error);
        return;
      }
      setSuccess(`Query "${formData.name}" created successfully!`);
      setShowCreateForm(false);
      setFormData({ name: '', description: '', type: 'basic', collection: 'zones' });
      await loadQueries();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create query');
    }
  };

  const handleUpdate = async (queryId) => {
    try {
      setError(null);
      const updateData = {};
      if (formData.name) updateData.name = formData.name;
      if (formData.description) updateData.description = formData.description;
      if (formData.type) updateData.type = formData.type;
      if (formData.collection) updateData.collection = formData.collection;
      
      const response = await queriesAPI.updateQuery(queryId, updateData);
      if (response.data.error) {
        setError(response.data.error);
        return;
      }
      setSuccess(`Query ${queryId} updated successfully!`);
      setEditingId(null);
      setFormData({ name: '', description: '', type: 'basic', collection: 'zones' });
      await loadQueries();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update query');
    }
  };

  const handleDelete = async (queryId) => {
    if (!confirm(`Are you sure you want to delete query ${queryId}?`)) return;
    
    try {
      setError(null);
      const response = await queriesAPI.deleteQuery(queryId);
      if (response.data.error) {
        setError(response.data.error);
        return;
      }
      setSuccess(`Query ${queryId} deleted successfully!`);
      await loadQueries();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete query');
    }
  };

  const startEdit = (query) => {
    setEditingId(query.id);
    setFormData({
      name: query.name,
      description: query.description,
      type: query.type,
      collection: query.collection
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ name: '', description: '', type: 'basic', collection: 'zones' });
  };

  const filteredQueries = queries.filter(q => {
    const matchesSearch = q.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         q.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || q.type === filterType;
    return matchesSearch && matchesFilter;
  });

  if (mode !== 'sim') {
    return (
      <div className="admin-queries-page container page">
        <motion.div
          className="error-banner"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AlertCircle size={24} />
          <div>
            <h2>Query Management Unavailable</h2>
            <p>MongoDB query editing is only available in <strong>Simulated</strong> mode.</p>
            <p>Please switch to Simulated mode using the mode switcher in the navbar.</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="admin-queries-page container page">
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="header-content">
          <h1>
            <Database size={32} />
            MongoDB Query Management
          </h1>
          <p>Admin panel for managing MongoDB queries (Simulated dataset only)</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          <Plus size={18} />
          {showCreateForm ? 'Cancel' : 'New Query'}
        </button>
      </motion.div>

      {error && (
        <motion.div
          className="alert alert-error"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
        >
          <AlertCircle size={20} />
          {error}
        </motion.div>
      )}

      {success && (
        <motion.div
          className="alert alert-success"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
        >
          <CheckCircle size={20} />
          {success}
        </motion.div>
      )}

      {/* Create Form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            className="create-form-card"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <h3>Create New Query</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Query Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Zones with High Demand"
                />
              </div>
              <div className="form-group">
                <label>Collection *</label>
                <select
                  value={formData.collection}
                  onChange={(e) => setFormData({ ...formData, collection: e.target.value })}
                >
                  <option value="zones">zones</option>
                  <option value="meter_readings">meter_readings</option>
                  <option value="air_climate_readings">air_climate_readings</option>
                  <option value="grid_edges">grid_edges</option>
                  <option value="alerts">alerts</option>
                  <option value="constraint_events">constraint_events</option>
                  <option value="households">households</option>
                </select>
              </div>
              <div className="form-group">
                <label>Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="basic">Basic</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <div className="form-group full-width">
                <label>Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what this query does..."
                  rows={3}
                />
              </div>
            </div>
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setShowCreateForm(false)}>
                <X size={18} />
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleCreate}>
                <Save size={18} />
                Create Query
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search queries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-buttons">
          <button
            className={filterType === 'all' ? 'active' : ''}
            onClick={() => setFilterType('all')}
          >
            All ({queries.length})
          </button>
          <button
            className={filterType === 'basic' ? 'active' : ''}
            onClick={() => setFilterType('basic')}
          >
            Basic ({queries.filter(q => q.type === 'basic').length})
          </button>
          <button
            className={filterType === 'advanced' ? 'active' : ''}
            onClick={() => setFilterType('advanced')}
          >
            Advanced ({queries.filter(q => q.type === 'advanced').length})
          </button>
        </div>
      </div>

      {/* Queries List */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner" />
        </div>
      ) : (
        <div className="queries-grid">
          {filteredQueries.map((query) => (
            <motion.div
              key={query.id}
              className="query-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: query.id * 0.05 }}
            >
              {editingId === query.id ? (
                <div className="edit-form">
                  <div className="form-group">
                    <label>Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Type</label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      >
                        <option value="basic">Basic</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Collection</label>
                      <input
                        type="text"
                        value={formData.collection}
                        onChange={(e) => setFormData({ ...formData, collection: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="edit-actions">
                    <button className="btn btn-secondary" onClick={cancelEdit}>
                      <X size={16} />
                      Cancel
                    </button>
                    <button className="btn btn-primary" onClick={() => handleUpdate(query.id)}>
                      <Save size={16} />
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="query-header">
                    <div className="query-id">#{query.id}</div>
                    <div className="query-type-badge">{query.type}</div>
                  </div>
                  <h3>{query.name}</h3>
                  <p className="query-description">{query.description}</p>
                  <div className="query-meta">
                    <span className="meta-item">
                      <Database size={14} />
                      {query.collection}
                    </span>
                  </div>
                  <div className="query-actions">
                    <button
                      className="btn-icon"
                      onClick={() => startEdit(query)}
                      title="Edit query"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      className="btn-icon danger"
                      onClick={() => handleDelete(query.id)}
                      title="Delete query"
                      disabled={query.id <= 10}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  {query.id <= 10 && (
                    <div className="query-note">
                      <AlertCircle size={12} />
                      Default query (cannot be deleted)
                    </div>
                  )}
                </>
              )}
            </motion.div>
          ))}
        </div>
      )}

      <style>{`
        .admin-queries-page {
          padding: 2rem;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .page-header h1 {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .error-banner {
          display: flex;
          gap: 1rem;
          padding: 2rem;
          background: rgba(255, 68, 102, 0.1);
          border: 1px solid var(--accent-danger);
          border-radius: 12px;
          color: var(--accent-danger);
        }

        .error-banner svg {
          flex-shrink: 0;
        }

        .alert {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
        }

        .alert-error {
          background: rgba(255, 68, 102, 0.1);
          border: 1px solid var(--accent-danger);
          color: var(--accent-danger);
        }

        .alert-success {
          background: rgba(0, 255, 136, 0.1);
          border: 1px solid var(--accent-primary);
          color: var(--accent-primary);
        }

        .create-form-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 2rem;
          margin-bottom: 2rem;
          overflow: hidden;
        }

        .create-form-card h3 {
          margin-bottom: 1.5rem;
          color: var(--accent-primary);
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group.full-width {
          grid-column: 1 / -1;
        }

        .form-group label {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 0.75rem;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          background: var(--bg-secondary);
          color: var(--text-primary);
          font-family: var(--font-mono);
          font-size: 0.875rem;
        }

        .form-group textarea {
          resize: vertical;
          min-height: 80px;
        }

        .form-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
        }

        .filters-bar {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
          align-items: center;
          flex-wrap: wrap;
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          flex: 1;
          min-width: 250px;
        }

        .search-box input {
          flex: 1;
          border: none;
          background: transparent;
          color: var(--text-primary);
          font-size: 0.875rem;
        }

        .search-box input:focus {
          outline: none;
        }

        .filter-buttons {
          display: flex;
          gap: 0.5rem;
        }

        .filter-buttons button {
          padding: 0.75rem 1.25rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.875rem;
        }

        .filter-buttons button:hover {
          border-color: var(--accent-secondary);
          color: var(--accent-secondary);
        }

        .filter-buttons button.active {
          background: var(--accent-primary);
          border-color: var(--accent-primary);
          color: #000;
        }

        .queries-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.5rem;
        }

        .query-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1.5rem;
          transition: all 0.3s ease;
        }

        .query-card:hover {
          border-color: var(--accent-primary);
          box-shadow: 0 4px 20px rgba(0, 255, 136, 0.1);
          transform: translateY(-2px);
        }

        .query-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .query-id {
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: var(--accent-primary);
          font-weight: 700;
        }

        .query-type-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          background: rgba(0, 212, 255, 0.2);
          color: var(--accent-secondary);
        }

        .query-card h3 {
          margin-bottom: 0.75rem;
          color: var(--text-primary);
          font-size: 1.1rem;
        }

        .query-description {
          color: var(--text-secondary);
          font-size: 0.875rem;
          margin-bottom: 1rem;
          line-height: 1.5;
        }

        .query-meta {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border-color);
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          color: var(--text-secondary);
          font-family: var(--font-mono);
        }

        .query-actions {
          display: flex;
          gap: 0.5rem;
          justify-content: flex-end;
        }

        .btn-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 6px;
          border: 1px solid var(--border-color);
          background: var(--bg-secondary);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-icon:hover:not(:disabled) {
          border-color: var(--accent-secondary);
          color: var(--accent-secondary);
          background: rgba(0, 212, 255, 0.1);
        }

        .btn-icon.danger:hover:not(:disabled) {
          border-color: var(--accent-danger);
          color: var(--accent-danger);
          background: rgba(255, 68, 102, 0.1);
        }

        .btn-icon:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .query-note {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 1rem;
          padding: 0.5rem;
          background: rgba(255, 170, 0, 0.1);
          border-radius: 6px;
          font-size: 0.75rem;
          color: var(--accent-warning);
        }

        .edit-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .edit-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
          margin-top: 0.5rem;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          border: none;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.875rem;
        }

        .btn-primary {
          background: var(--accent-primary);
          color: #000;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 255, 136, 0.3);
        }

        .btn-secondary {
          background: var(--bg-secondary);
          color: var(--text-primary);
          border: 1px solid var(--border-color);
        }

        .btn-secondary:hover {
          border-color: var(--accent-secondary);
          color: var(--accent-secondary);
        }

        @media (max-width: 768px) {
          .queries-grid {
            grid-template-columns: 1fr;
          }
          .form-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
