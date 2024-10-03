import { useState, useEffect, useRef } from "react";
import io, { Socket } from "socket.io-client";
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";

interface Message {
  id: string;
  user: string;
  text: string;
}

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [socket, setSocket] = useState<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Connect to the WebSocket server
    const newSocket = io("http://localhost:3001");
    setSocket(newSocket);

    // Clean up on component unmount
    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (socket) {
      // Listen for incoming messages
      socket.on("message", (message: Message) => {
        setMessages((prevMessages) => [...prevMessages, message]);
      });
    }
  }, [socket]);

  useEffect(() => {
    // Scroll to bottom of messages
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim() && socket) {
      const newMessage: Message = {
        id: Date.now().toString(),
        user: "User", // Replace with actual user name or ID
        text: inputMessage.trim(),
      };
      socket.emit("message", newMessage);
      setInputMessage("");
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "50vh",
        maxWidth: 600,
        margin: "auto",
      }}
    >
      <Paper
        elevation={3}
        sx={{
          flex: 1,
          overflow: "auto",
          p: 2,
          mb: 2,
          backgroundColor: "grey.900", // Dark background
          color: "common.white", // Light text color for contrast
        }}
      >
        <List>
          {messages.map((message) => (
            <ListItem key={message.id}>
              <ListItemText
                primary={
                  <Typography variant="subtitle2" color="primary.light">
                    {message.user}
                  </Typography>
                }
                secondary={
                  <Typography color="text.secondary" sx={{ color: "grey.400" }}>
                    {message.text}
                  </Typography>
                }
              />
            </ListItem>
          ))}
        </List>
        <div ref={messagesEndRef} />
      </Paper>
      <Box component="form" onSubmit={sendMessage} sx={{ display: "flex" }}>
        <TextField
          fullWidth
          variant="outlined"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Type a message..."
          sx={{ mr: 1 }}
        />
        <Button type="submit" variant="contained" endIcon={<SendIcon />}>
          Send
        </Button>
      </Box>
    </Box>
  );
};

export default Chat;
