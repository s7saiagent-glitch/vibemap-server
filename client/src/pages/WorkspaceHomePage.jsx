import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/i18n';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { Header } from '../components/Header';

export function WorkspaceHomePage() {
  const { t } = useI18n();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try {
      const data = await api.listWorkspaces();
      setWorkspaces(data.workspaces);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      const { workspace } = await api.createWorkspace(newName);
      setNewName('');
      navigate(`/workspaces/${workspace.id}/channels`);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleJoin(e) {
    e.preventDefault();
    setError('');
    try {
      const { workspace } = await api.joinWorkspace(joinCode);
      setJoinCode('');
      navigate(`/workspaces/${workspace.id}/channels`);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <Header
        title={t('workspace.title')}
        right={
          <button className="btn-secondary btn" style={{ padding: '4px 10px', fontSize: 12 }} onClick={logout}>
            خروج
          </button>
        }
      />
      <div className="screen">
        {loading && <p className="muted">{t('common.loading')}</p>}

        {!loading && workspaces.length === 0 && <p className="muted">{t('workspace.empty')}</p>}

        {workspaces.map((w) => (
          <button
            key={w.id}
            className="card"
            style={{ textAlign: 'right', cursor: 'pointer' }}
            onClick={() => navigate(`/workspaces/${w.id}/channels`)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>{w.name}</strong>
              <span className={`badge ${w.plan_id === 2 ? 'badge-paid' : 'badge-free'}`}>
                {w.plan_id === 2 ? t('workspace.plan.paid') : t('workspace.plan.free')}
              </span>
            </div>
          </button>
        ))}

        <div className="card">
          <h4>{t('workspace.create')}</h4>
          <form onSubmit={handleCreate}>
            <input
              type="text"
              placeholder={t('workspace.create.name')}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              style={{ marginBottom: 10 }}
            />
            <button className="btn btn-primary" style={{ width: '100%' }}>{t('common.continue')}</button>
          </form>
        </div>

        <div className="card">
          <h4>{t('workspace.join')}</h4>
          <form onSubmit={handleJoin}>
            <input
              type="text"
              placeholder={t('workspace.join.code')}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              required
              style={{ marginBottom: 10 }}
            />
            <button className="btn btn-secondary" style={{ width: '100%' }}>{t('common.continue')}</button>
          </form>
        </div>

        {error && <p className="error-text">{error}</p>}

        <button className="btn btn-secondary" onClick={() => navigate('/temporary/new')}>
          {t('channel.temporary.create')}
        </button>
      </div>
    </div>
  );
}
