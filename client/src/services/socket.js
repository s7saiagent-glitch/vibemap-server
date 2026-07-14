import { io } from 'socket.io-client';

export function createSocket(token) {
  return io('/', {
    path: '/socket.io',
    auth: { token },
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
    randomizationFactor: 0.5,
    transports: ['websocket', 'polling'],
  });
}
