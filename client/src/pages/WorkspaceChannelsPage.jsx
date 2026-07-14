import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useI18n } from '../i18n/i18n';
import { api } from '../services/api';
import { Header } from '../components/Header';

export function WorkspaceChannelsPage() {
  const { t } = useI18n();
  const { workspaceId } = useParams();
  const navigate = useNavigate();

  const [workspace, setWorkspace] = useState(null);
  const [membership, setMembership] = useState(null);
  const [channels, setChannels] = useState([]);
  const [newChannelName, setNewChannelName] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  async function load() {
    const [wsData, chData] = await Promise.all([
      api.getWorkspace(workspaceId),
      api.listChannels(workspaceId),
    ]);
    setWorkspace(wsData.workspace);
    setMembership(wsData.membership);
    setChannels(chData.channels);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  async function handleCreateChannel(e) {
    e.preventDefault();
    setError('');
    try {
      await api.createChannel(workspaceId, newChannelName);
      setNewChannelName('');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  function copyInvite() {
    const link = `${window.location.origin}/workspaces/join/${workspace.invite_code}`;
    navigator.clipboard?.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!workspace) return <p className="muted" style={{ padding: 20 }}>{t('common.loading')}</p>;

  return (
    <div>
      <Header
        title={workspace.name}
        onBack={() => navigate('/')}
        right={
          membership?.role === 'admin' && (
            <button className="btn-secondary btn" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => navigate(`/workspaces/${workspaceId}/admin`)}>
              {t('admin.title')}
            </button>
          )
        }
      />
      <div className="screen">
        <div className="card">
          <div className="muted" style={{ fontSize: 13 }}>{t('workspace.inviteCode')}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
            <strong style={{ letterSpacing: 2, fontSize: 18 }}>{workspace.invite_code}</strong>
            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 13 }} onClick={copyInvite}>
              {copied ? t('common.copied') : t('common.copy')}
            </button>
          </div>
        </div>

        <h4>{t('channel.title')}</h4>
        {channels.map((c) => (
          <button
            key={c.id}
            className="card"
            style={{ textAlign: 'right', cursor: 'pointer' }}
            onClick={() => navigate(`/workspaces/${workspaceId}/channels/${c.id}`)}
          >
            {c.name}
          </button>
        ))}

        <div className="card">
          <form onSubmit={handleCreateChannel} style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder={t('channel.create.name')}
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              required
            />
            <button className="btn btn-primary">{t('channel.create')}</button>
          </form>
          {error && <p className="error-text">{error}</p>}
        </div>
      </div>
    </div>
  );
}
