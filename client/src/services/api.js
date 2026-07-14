import { tokenStorage } from './storage';

async function request(path, { method = 'GET', body, token } = {}) {
  const authToken = token !== undefined ? token : tokenStorage.get();
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    const err = new Error(data?.error || `خطأ (${res.status})`);
    err.status = res.status;
    err.code = data?.code;
    throw err;
  }
  return data;
}

export const api = {
  requestOtp: (phone) => request('/auth/otp/request', { method: 'POST', body: { phone } }),
  verifyOtp: (phone, code, name) => request('/auth/otp/verify', { method: 'POST', body: { phone, code, name } }),
  me: () => request('/auth/me'),

  createWorkspace: (name) => request('/workspaces', { method: 'POST', body: { name } }),
  listWorkspaces: () => request('/workspaces'),
  joinWorkspace: (inviteCode) => request('/workspaces/join', { method: 'POST', body: { inviteCode } }),
  getWorkspace: (workspaceId) => request(`/workspaces/${workspaceId}`),

  listChannels: (workspaceId) => request(`/channels/workspaces/${workspaceId}/channels`),
  createChannel: (workspaceId, name) =>
    request(`/channels/workspaces/${workspaceId}/channels`, { method: 'POST', body: { name } }),
  getChannel: (workspaceId, channelId) => request(`/channels/workspaces/${workspaceId}/channels/${channelId}`),
  renameChannel: (workspaceId, channelId, name) =>
    request(`/channels/workspaces/${workspaceId}/channels/${channelId}`, { method: 'PATCH', body: { name } }),

  createTemporaryChannel: (name) => request('/channels/temporary', { method: 'POST', body: { name } }),
  previewQrChannel: (token) => request(`/channels/qr/${token}`, { token: null }),
  joinQrChannel: (token, guestName) =>
    request(`/channels/qr/${token}/join`, { method: 'POST', body: { guestName }, token: null }),

  listMessages: (channelId, { before, limit, token } = {}) => {
    const qs = new URLSearchParams();
    if (before) qs.set('before', before);
    if (limit) qs.set('limit', limit);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request(`/channels/${channelId}/messages${suffix}`, { token });
  },

  listMembers: (workspaceId) => request(`/admin/workspaces/${workspaceId}/members`),
  removeMember: (workspaceId, userId) =>
    request(`/admin/workspaces/${workspaceId}/members/${userId}`, { method: 'DELETE' }),

  listPlans: () => request('/plans', { token: null }),
};
