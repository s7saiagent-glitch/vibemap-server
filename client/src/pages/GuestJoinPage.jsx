import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useI18n } from '../i18n/i18n';
import { api } from '../services/api';
import { guestStorage } from '../services/storage';
import logoWordmark from '../assets/logo-wordmark.svg';

export function GuestJoinPage() {
  const { t } = useI18n();
  const { token } = useParams(); // qr token من الرابط
  const navigate = useNavigate();

  const [channel, setChannel] = useState(null);
  const [error, setError] = useState('');
  const [guestName, setGuestName] = useState('');
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    api
      .previewQrChannel(token)
      .then((data) => setChannel(data.channel))
      .catch(() => setError(t('guest.expired')))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleJoin(e) {
    e.preventDefault();
    setJoining(true);
    setError('');
    try {
      const data = await api.joinQrChannel(token, guestName);
      guestStorage.set({ token: data.token, channelId: data.channel.id, guestName: data.guestName });
      navigate(`/guest/${data.channel.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="screen" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <img src={logoWordmark} alt={t('app.name')} style={{ width: 200, marginBottom: 8 }} />

      {loading && <p className="muted">{t('common.loading')}</p>}

      {!loading && error && <p className="error-text">{error}</p>}

      {!loading && channel && (
        <div className="card" style={{ width: '100%' }}>
          <h4>{t('guest.title')}</h4>
          <p className="muted">{channel.name}</p>
          <form onSubmit={handleJoin}>
            <input
              type="text"
              placeholder={t('guest.name.placeholder')}
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              style={{ marginBottom: 12 }}
            />
            <button className="btn btn-primary" style={{ width: '100%' }} disabled={joining}>
              {joining ? t('common.loading') : t('guest.join')}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
