import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/i18n';
import { api } from '../services/api';
import { useChannelSocket } from '../hooks/useChannelSocket';
import { PTTButton } from './PTTButton';
import { MessageLog } from './MessageLog';

const CONNECTION_LABEL_KEY = {
  connecting: 'channel.connecting',
  reconnecting: 'channel.reconnecting',
  disconnected: 'channel.reconnecting',
};

export function ChannelView({ token, channelId, channelName, historyToken }) {
  const { t } = useI18n();
  const { connectionState, members, speaker, liveMessages, pttStart, pttStop, sendAudio } = useChannelSocket({
    token,
    channelId,
  });

  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .listMessages(channelId, { token: historyToken ?? token })
      .then((data) => {
        if (!cancelled) setHistory(data.messages);
      })
      .finally(() => !cancelled && setLoadingHistory(false));
    return () => {
      cancelled = true;
    };
  }, [channelId, token, historyToken]);

  const knownLiveIds = new Set(liveMessages.map((m) => m.id));
  const combined = [...history.filter((m) => !knownLiveIds.has(m.id)), ...liveMessages];

  async function handleRecorded({ blob, mimeType, durationMs }) {
    await sendAudio({ blob, mimeType, durationMs });
  }

  const isConnected = connectionState === 'connected';

  return (
    <div className="screen">
      {!isConnected && (
        <p className="muted" style={{ textAlign: 'center' }}>{t(CONNECTION_LABEL_KEY[connectionState] || 'channel.connecting')}</p>
      )}

      <div className="speaking-banner">
        {speaker ? t('channel.speaking', { name: speaker.name }) : ' '}
      </div>

      <PTTButton disabled={!isConnected} onPressStart={pttStart} onPressEnd={pttStop} onRecorded={handleRecorded} />

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <strong>{t('channel.members')}</strong>
          <span className="muted">{members.length}</span>
        </div>
        <div className="muted" style={{ fontSize: 13 }}>
          {members.map((m) => m.name || m.guest_name || m.senderName).join(' · ') || '—'}
        </div>
      </div>

      <div className="card" style={{ flex: 1, overflowY: 'auto' }}>
        {loadingHistory ? <p className="muted">{t('common.loading')}</p> : <MessageLog messages={combined} />}
      </div>
    </div>
  );
}
