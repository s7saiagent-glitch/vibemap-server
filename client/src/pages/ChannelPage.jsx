import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { Header } from '../components/Header';
import { ChannelView } from '../components/ChannelView';

export function ChannelPage() {
  const { workspaceId, channelId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [channel, setChannel] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getChannel(workspaceId, channelId)
      .then((data) => setChannel(data.channel))
      .catch((err) => setError(err.message));
  }, [workspaceId, channelId]);

  if (error) return <p className="error-text" style={{ padding: 20 }}>{error}</p>;
  if (!channel) return <p className="muted" style={{ padding: 20 }}>...</p>;

  return (
    <div>
      <Header title={channel.name} onBack={() => navigate(`/workspaces/${workspaceId}/channels`)} />
      <ChannelView token={token} channelId={channelId} channelName={channel.name} />
    </div>
  );
}
