import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useI18n } from '../i18n/i18n';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';

// رابط دعوة مباشر: /workspaces/join/:code - ينضم تلقائياً إذا كان المستخدم مسجّل دخول
export function WorkspaceJoinByLinkPage() {
  const { t } = useI18n();
  const { code } = useParams();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { inviteCode: code } });
      return;
    }
    api
      .joinWorkspace(code)
      .then(({ workspace }) => navigate(`/workspaces/${workspace.id}/channels`))
      .catch((err) => setError(err.message));
  }, [code, isAuthenticated, navigate]);

  return (
    <div className="screen" style={{ justifyContent: 'center', alignItems: 'center' }}>
      {error ? <p className="error-text">{error}</p> : <p className="muted">{t('common.loading')}</p>}
    </div>
  );
}
