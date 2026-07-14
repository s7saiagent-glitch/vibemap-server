import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Header } from '../components/Header';
import { ChannelView } from '../components/ChannelView';

// قناة مؤقتة يدخلها مستخدم مسجّل دخول (منشئ القناة أو من يملك الرابط)
export function AdHocChannelPage() {
  const { channelId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  return (
    <div>
      <Header onBack={() => navigate('/')} />
      <ChannelView token={token} channelId={channelId} />
    </div>
  );
}
