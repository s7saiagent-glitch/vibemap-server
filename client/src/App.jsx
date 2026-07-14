import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { LoginPage } from './pages/LoginPage';
import { WorkspaceHomePage } from './pages/WorkspaceHomePage';
import { WorkspaceChannelsPage } from './pages/WorkspaceChannelsPage';
import { WorkspaceJoinByLinkPage } from './pages/WorkspaceJoinByLinkPage';
import { ChannelPage } from './pages/ChannelPage';
import { AdminPage } from './pages/AdminPage';
import { NewTemporaryChannelPage } from './pages/NewTemporaryChannelPage';
import { AdHocChannelPage } from './pages/AdHocChannelPage';
import { GuestJoinPage } from './pages/GuestJoinPage';
import { GuestChannelPage } from './pages/GuestChannelPage';

function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <div className="app-shell">
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route path="/join/:token" element={<GuestJoinPage />} />
        <Route path="/guest/:channelId" element={<GuestChannelPage />} />

        <Route path="/" element={<RequireAuth><WorkspaceHomePage /></RequireAuth>} />
        <Route path="/workspaces/join/:code" element={<WorkspaceJoinByLinkPage />} />
        <Route path="/workspaces/:workspaceId/channels" element={<RequireAuth><WorkspaceChannelsPage /></RequireAuth>} />
        <Route path="/workspaces/:workspaceId/channels/:channelId" element={<RequireAuth><ChannelPage /></RequireAuth>} />
        <Route path="/workspaces/:workspaceId/admin" element={<RequireAuth><AdminPage /></RequireAuth>} />

        <Route path="/temporary/new" element={<RequireAuth><NewTemporaryChannelPage /></RequireAuth>} />
        <Route path="/c/:channelId" element={<RequireAuth><AdHocChannelPage /></RequireAuth>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
