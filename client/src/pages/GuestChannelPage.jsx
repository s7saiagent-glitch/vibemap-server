import { useNavigate, useParams } from 'react-router-dom';
import { useI18n } from '../i18n/i18n';
import { guestStorage } from '../services/storage';
import { Header } from '../components/Header';
import { ChannelView } from '../components/ChannelView';

export function GuestChannelPage() {
  const { t } = useI18n();
  const { channelId } = useParams();
  const navigate = useNavigate();
  const guest = guestStorage.get();

  if (!guest || guest.channelId !== channelId) {
    return (
      <div className="screen">
        <p className="error-text">{t('guest.expired')}</p>
        <button className="btn btn-secondary" onClick={() => navigate('/')}>{t('common.back')}</button>
      </div>
    );
  }

  return (
    <div>
      <Header title={guest.guestName} onBack={() => navigate('/')} />
      <ChannelView token={guest.token} channelId={channelId} historyToken={guest.token} />
    </div>
  );
}
