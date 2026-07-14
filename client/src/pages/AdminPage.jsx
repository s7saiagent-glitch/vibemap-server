import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useI18n } from '../i18n/i18n';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { Header } from '../components/Header';
import { MemberList } from '../components/MemberList';

export function AdminPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { workspaceId } = useParams();
  const navigate = useNavigate();

  const [members, setMembers] = useState([]);
  const [channels, setChannels] = useState([]);
  const [renaming, setRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const [membersData, channelsData] = await Promise.all([
      api.listMembers(workspaceId),
      api.listChannels(workspaceId),
    ]);
    setMembers(membersData.members);
    setChannels(channelsData.channels);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  async function handleRemove(userId) {
    setError('');
    try {
      await api.removeMember(workspaceId, userId);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  function startRename(channel) {
    setRenaming(channel.id);
    setRenameValue(channel.name);
  }

  async function submitRename(e) {
    e.preventDefault();
    try {
      await api.renameChannel(workspaceId, renaming, renameValue);
      setRenaming(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <Header title={t('admin.title')} onBack={() => navigate(`/workspaces/${workspaceId}/channels`)} />
      <div className="screen">
        <div className="card">
          <h4>{t('admin.members')}</h4>
          <MemberList
            members={members}
            renderAction={(m) =>
              m.user_id !== user.id && (
                <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => handleRemove(m.user_id)}>
                  {t('admin.removeMember')}
                </button>
              )
            }
          />
        </div>

        <div className="card">
          <h4>{t('admin.channels')}</h4>
          {channels.map((c) => (
            <div key={c.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--color-night-border)' }}>
              {renaming === c.id ? (
                <form onSubmit={submitRename} style={{ display: 'flex', gap: 8 }}>
                  <input type="text" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
                  <button className="btn btn-primary" style={{ padding: '6px 12px' }}>{t('common.save')}</button>
                  <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px' }} onClick={() => setRenaming(null)}>
                    {t('common.cancel')}
                  </button>
                </form>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{c.name}</span>
                  <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => startRename(c)}>
                    {t('channel.rename')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {error && <p className="error-text">{error}</p>}
      </div>
    </div>
  );
}
