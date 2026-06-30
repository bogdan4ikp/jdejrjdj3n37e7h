import { io } from 'socket.io-client';

export const globalSocket = io(window.location.origin, {
  autoConnect: false,
});
