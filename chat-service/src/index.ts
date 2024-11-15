import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { connectDB } from './config/database';
import { ChatService } from './services/chat-service';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

const chatService = new ChatService();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-matchup', (matchupId: string) => {
    socket.join(`matchup:${matchupId}`);
  });

  socket.on('leave-matchup', (matchupId: string) => {
    socket.leave(`matchup:${matchupId}`);
  });

  socket.on('send-message', async (data: {
    matchup_id: string;
    content: string;
    user_id: string;
    user_name: string;
    user_avatar?: string;
  }) => {
    try {
      const message = await chatService.createMessage(data);
      io.to(`matchup:${data.matchup_id}`).emit('new-message', message);
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', 'Failed to send message');
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// REST endpoints
app.get('/api/messages/:matchupId', async (req, res) => {
  try {
    const messages = await chatService.getMessages(
      req.params.matchupId,
      50,
      req.query.before ? new Date(req.query.before as string) : undefined
    );
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

const PORT = process.env.PORT || 4000;

async function startServer() {
  await connectDB();
  httpServer.listen(PORT, () => {
    console.log(`Chat service running on port ${PORT}`);
  });
}

startServer(); 