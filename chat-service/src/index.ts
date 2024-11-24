import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { connectDB } from './config/database';
import { ChatService } from './services/chat-service';
import { RateLimiterMemory } from 'rate-limiter-flexible';

const app = express();
const httpServer = createServer(app);

// Define allowed origins
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:3000',
  'https://www.antiballsniffer.club',
  'https://antiballsniffer.club',
  'https://www.introducingfirst.io',
  'https://introducingfirst.io',
  'https://www.merab.gay',
  'https://merab.gay'
];

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type']
  }
});

// Create rate limiter - 15 messages per minute per user with some burst allowance
const rateLimiter = new RateLimiterMemory({
  points: 15,
  duration: 60,
  blockDuration: 60,
});

// Update Express CORS configuration as well
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

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
      // Check rate limit for this user
      await rateLimiter.consume(data.user_id);

      const message = await chatService.createMessage(data);
      io.to(`matchup:${data.matchup_id}`).emit('new-message', message);
    } catch (error) {
      console.error('Error sending message:', error);
      // If it's a rate limit error
      if (error.remainingPoints !== undefined) {
        const secondsBeforeNext = Math.ceil(error.msBeforeNext / 1000);
        socket.emit('error', `Message rate limit reached. Please wait ${secondsBeforeNext} seconds before sending another message.`);
      } else {
        socket.emit('error', 'Failed to send message');
      }
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