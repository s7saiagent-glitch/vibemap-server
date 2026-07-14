import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { useI18n } from '../i18n/i18n';
import { api } from '../services/api';
import { Header } from '../components/Header';

export function NewTemporaryChannelPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [channel, setChannel] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  const joinUrl = channel ? `${window.location.origin}/join/${channel.qr_token}` : '';

  useEffect(() => {
    if (!joinUrl) return;
    QRCode.toDataURL(joinUrl, { margin: 1, width: 240, color: { dark: '#0E1B2C', light: '#F7F3EC' } }).then(setQrDataUrl);
  }, [joinUrl]);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      const data = await api.createTemporaryChannel(name);
      setChannel(data.channel);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  function copyLink() {
    navigator.clipboard?.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div>
      <Header title={t('channel.temporary.create')} onBack={() => navigate('/')} />
      <div className="screen">
        {!channel && (
          <div className="card">
            <p className="muted">{t('channel.temporary.hint')}</p>
            <form onSubmit={handleCreate}>
              <input
                type="text"
                placeholder={t('channel.create.name')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ marginBottom: 12 }}
              />
              <button className="btn btn-primary" style={{ width: '100%' }} disabled={creating}>
                {creating ? t('common.loading') : t('common.continue')}
              </button>
            </form>
            {error && <p className="error-text">{error}</p>}
          </div>
        )}

        {channel && (
          <div className="card" style={{ textAlign: 'center' }}>
            <h4>{channel.name}</h4>
            {qrDataUrl && <img src={qrDataUrl} alt="QR" style={{ borderRadius: 12, margin: '12px auto' }} />}
            <p className="muted" style={{ wordBreak: 'break-all' }}>{joinUrl}</p>
            <button className="btn btn-secondary" onClick={copyLink} style={{ marginBottom: 10 }}>
              {copied ? t('common.copied') : t('common.copy')}
            </button>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => navigate(`/c/${channel.id}`)}>
              {t('common.continue')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
