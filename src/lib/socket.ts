import { io } from 'socket.io-client';
import { getAppOrigin } from './config';

export const globalSocket = io(getAppOrigin(), {
  autoConnect: false,
});
