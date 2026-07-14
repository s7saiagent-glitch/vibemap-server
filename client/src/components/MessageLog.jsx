import { useI18n } from '../i18n/i18n';

function initials(name) {
  return (name || '?').trim().slice(0, 1).toUpperCase();
}

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function MessageLog({ messages }) {
  const { t } = useI18n();

  if (!messages.length) {
    return <p className="muted" style={{ textAlign: 'center', padding: '24px 0' }}>{t('channel.noMessages')}</p>;
  }

  return (
    <div>
      {messages.map((m) => (
        <div className="message-item" key={m.id}>
          <div className="avatar-dot">{initials(m.senderName)}</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <strong>{m.senderName}{m.isGuest ? ' (ضيف)' : ''}</strong>
              <span className="muted">{formatTime(m.createdAt)}</span>
            </div>
            <audio
              controls
              preload="none"
              src={m.audioBlobUrl || m.audioUrl}
              style={{ width: '100%', height: 32, marginTop: 4 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
