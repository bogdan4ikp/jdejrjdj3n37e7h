import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server } from "socket.io";

async function startServer() {
  const app = express();
  const server = createServer(app);
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    // increase maxHttpBufferSize for larger initial metadata if needed, though we use DataChannel for big files.
    maxHttpBufferSize: 1e7
  });
  const PORT = 3000;

  // Store users in rooms
  const rooms = new Map<string, Set<string>>();
  const users = new Map<string, any>();
  
  // Global presence for friends feature
  const onlineUsers = new Map<string, { socketId: string, profile: any }>();

  io.on('connection', (socket) => {
    // Global Presence
    socket.on('register', (userId, profile) => {
      onlineUsers.set(userId, { socketId: socket.id, profile });
      socket.join('global-presence');
      io.to('global-presence').emit('user-online', userId, profile);
      
      const onlineList = Array.from(onlineUsers.entries()).map(([id, data]) => ({ id, profile: data.profile }));
      socket.emit('online-users', onlineList);
    });

    socket.on('request-session', (targetUserId, roomId, fromProfile) => {
      const target = onlineUsers.get(targetUserId);
      if (target) {
        io.to(target.socketId).emit('session-requested', roomId, fromProfile);
      }
    });

    socket.on('accept-session', (targetUserId, roomId) => {
      const target = onlineUsers.get(targetUserId);
      if (target) {
        io.to(target.socketId).emit('session-accepted', roomId);
      }
    });

    socket.on('reject-session', (targetUserId) => {
      const target = onlineUsers.get(targetUserId);
      if (target) {
        io.to(target.socketId).emit('session-rejected');
      }
    });

    // Rooms
    socket.on('join-room', (roomId, user) => {
      socket.join(roomId);
      users.set(socket.id, user);
      
      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Set());
      }
      rooms.get(roomId)!.add(socket.id);

      // Notify others in the room
      socket.to(roomId).emit('user-joined', socket.id, user);

      // Send the current users to the newly joined user
      const peers = Array.from(rooms.get(roomId)!)
        .filter(id => id !== socket.id)
        .map(id => ({ id, user: users.get(id) }));
      
      socket.emit('room-peers', peers);
    });

    socket.on('disconnect', () => {
      // Cleanup global presence
      let disconnectedUserId = null;
      for (const [userId, data] of onlineUsers.entries()) {
        if (data.socketId === socket.id) {
          disconnectedUserId = userId;
          onlineUsers.delete(userId);
          break;
        }
      }
      if (disconnectedUserId) {
        io.to('global-presence').emit('user-offline', disconnectedUserId);
      }

      // Cleanup rooms
      for (const [roomId, roomUsers] of rooms.entries()) {
        if (roomUsers.has(socket.id)) {
          roomUsers.delete(socket.id);
          if (roomUsers.size === 0) {
            rooms.delete(roomId);
          }
          socket.to(roomId).emit('user-left', socket.id);
        }
      }
      users.delete(socket.id);
    });

    socket.on('offer', (targetId, offer) => {
      socket.to(targetId).emit('offer', socket.id, offer, users.get(socket.id));
    });

    socket.on('answer', (targetId, answer) => {
      socket.to(targetId).emit('answer', socket.id, answer);
    });

    socket.on('ice-candidate', (targetId, candidate) => {
      socket.to(targetId).emit('ice-candidate', socket.id, candidate);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
