"use client";
import React, { useState, useEffect, useRef } from "react";
import { Message } from "@/types/chatbot";
import { ILead } from "@/models/leads";
import {
  Box,
  Paper,
  Typography,
  IconButton,
  TextField,
  Button,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  Badge,
  CircularProgress,
  Slide,
  Fade,
  Tooltip,
  LinearProgress,
} from "@mui/material";
import {
  Send as SendIcon,
  KeyboardArrowDown as MinimizeIcon,
  Chat as ChatIcon,
  Person as PersonIcon,
  SmartToy as BotIcon,
  Close as CloseIcon,
} from "@mui/icons-material";

interface ChatbotProps {
  onLeadUpdate?: (lead: Partial<ILead>) => void;
  onQualificationComplete?: (lead: ILead) => void;
  className?: string;
}

const Chatbot: React.FC<ChatbotProps> = ({
  onLeadUpdate,
  onQualificationComplete,
  className = "",
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId] = useState(
    () => `conv_${Date.now()}_${Math.random()}`,
  );
  const [leadData, setLeadData] = useState<Partial<ILead>>({});
  const [isMinimized, setIsMinimized] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize conversation with welcome message
    setMessages([
      {
        id: "1",
        type: "bot",
        content:
          "Hi! I'm here to help you find the right solution. What's your name?",
        timestamp: new Date(),
      },
    ]);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chatbot/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId,
          message: inputValue,
          leadData,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.response) {
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: "bot",
          content: result.response,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, botMessage]);
      }

      if (result.leadUpdate) {
        const updatedLead = { ...leadData, ...result.leadUpdate };
        setLeadData(updatedLead);
        onLeadUpdate?.(updatedLead);

        // Check if qualification is complete
        if (result.leadUpdate.aiQualityScore >= 70 && !result.nextQuestion) {
          onQualificationComplete?.(updatedLead as ILead);
          // Add completion message
          setMessages((prev) => [
            ...prev,
            {
              id: `complete-${Date.now()}`,
              type: "bot",
              content:
                "Thank you! Your information has been submitted and we'll be in touch shortly.",
              timestamp: new Date(),
            },
          ]);
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        content:
          "Sorry, I'm having trouble processing your request. Please try again later.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const resetConversation = () => {
    setMessages([
      {
        id: "1",
        type: "bot",
        content:
          "Hi! I'm here to help you find the right solution. What's your name?",
        timestamp: new Date(),
      },
    ]);
    setLeadData({});
  };

  if (isMinimized) {
    return (
      <Fade in={isMinimized}>
        <Box
          sx={{
            position: "fixed",
            bottom: 16,
            right: 16,
            zIndex: 1300,
          }}
        >
          <Badge
            badgeContent={messages.length > 1 ? messages.length - 1 : 0}
            color="primary"
            overlap="circular"
          >
            <Tooltip title="Chat with our assistant">
              <IconButton
                onClick={() => setIsMinimized(false)}
                sx={{
                  backgroundColor: "primary.main",
                  color: "primary.contrastText",
                  "&:hover": {
                    backgroundColor: "primary.dark",
                    transform: "scale(1.1)",
                  },
                  width: 56,
                  height: 56,
                  transition: "all 0.2s ease",
                  boxShadow: 3,
                }}
                size="large"
              >
                <ChatIcon />
              </IconButton>
            </Tooltip>
          </Badge>
        </Box>
      </Fade>
    );
  }

  return (
    <Slide direction="up" in={!isMinimized} mountOnEnter unmountOnExit>
      <Paper
        elevation={10}
        sx={{
          position: "fixed",
          bottom: 16,
          right: 16,
          width: 380,
          height: 500,
          display: "flex",
          flexDirection: "column",
          zIndex: 1300,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <Box
          sx={{
            backgroundColor: "primary.main",
            color: "primary.contrastText",
            p: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "relative",
          }}
        >
          <Box>
            <Typography variant="subtitle1" fontWeight="bold">
              Lead Qualification Assistant
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <LinearProgress
                variant="determinate"
                value={leadData.aiQualityScore || 0}
                sx={{
                  width: 100,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: "rgba(255,255,255,0.3)",
                  "& .MuiLinearProgress-bar": {
                    borderRadius: 3,
                  },
                }}
              />
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                {leadData.aiQualityScore || 0}/100
              </Typography>
            </Box>
          </Box>
          <Box>
            <Tooltip title="Reset conversation">
              <IconButton
                onClick={resetConversation}
                size="small"
                sx={{ color: "primary.contrastText", mr: 1 }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Minimize">
              <IconButton
                onClick={() => setIsMinimized(true)}
                size="small"
                sx={{ color: "primary.contrastText" }}
              >
                <MinimizeIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Messages */}
        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            p: 2,
            bgcolor: "background.paper",
            "&::-webkit-scrollbar": {
              width: "6px",
            },
            "&::-webkit-scrollbar-track": {
              background: "transparent",
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: "rgba(0,0,0,0.2)",
              borderRadius: "3px",
            },
          }}
        >
          <List sx={{ p: 0 }}>
            {messages.map((message) => (
              <React.Fragment key={message.id}>
                <ListItem
                  sx={{
                    justifyContent:
                      message.type === "user" ? "flex-end" : "flex-start",
                    px: 1,
                    py: 1.5,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection:
                        message.type === "user" ? "row-reverse" : "row",
                      alignItems: "flex-start",
                      maxWidth: "85%",
                      gap: 1,
                    }}
                  >
                    <ListItemAvatar
                      sx={{
                        minWidth: "auto",
                      }}
                    >
                      <Avatar
                        sx={{
                          width: 32,
                          height: 32,
                          bgcolor:
                            message.type === "user"
                              ? "primary.main"
                              : "secondary.main",
                        }}
                      >
                        {message.type === "user" ? (
                          <PersonIcon fontSize="small" />
                        ) : (
                          <BotIcon fontSize="small" />
                        )}
                      </Avatar>
                    </ListItemAvatar>
                    <Paper
                      elevation={1}
                      sx={{
                        p: 1.5,
                        borderRadius:
                          message.type === "user"
                            ? "18px 4px 18px 18px"
                            : "4px 18px 18px 18px",
                        bgcolor:
                          message.type === "user" ? "primary.main" : "grey.100",
                        color:
                          message.type === "user"
                            ? "primary.contrastText"
                            : "text.primary",
                        wordBreak: "break-word",
                      }}
                    >
                      <Typography variant="body2" sx={{ lineHeight: 1.4 }}>
                        {message.content}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          display: "block",
                          textAlign: "right",
                          opacity: 0.7,
                          mt: 0.5,
                          lineHeight: 1,
                          color:
                            message.type === "user"
                              ? "rgba(255,255,255,0.7)"
                              : "text.secondary",
                        }}
                      >
                        {message.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Typography>
                    </Paper>
                  </Box>
                </ListItem>
              </React.Fragment>
            ))}
            {isLoading && (
              <ListItem sx={{ justifyContent: "flex-start", px: 1, py: 1.5 }}>
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: "secondary.main",
                    }}
                  >
                    <BotIcon fontSize="small" />
                  </Avatar>
                  <Paper
                    elevation={1}
                    sx={{
                      p: 1.5,
                      borderRadius: "4px 18px 18px 18px",
                      bgcolor: "grey.100",
                    }}
                  >
                    <CircularProgress size={16} color="inherit" />
                  </Paper>
                </Box>
              </ListItem>
            )}
            <div ref={messagesEndRef} />
          </List>
        </Box>

        {/* Input */}
        <Box
          sx={{
            p: 2,
            borderTop: 1,
            borderColor: "divider",
            bgcolor: "background.default",
          }}
        >
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={isLoading}
              multiline
              maxRows={3}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 4,
                  bgcolor: "background.paper",
                  alignItems: "center",
                },
              }}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={sendMessage}
              disabled={isLoading || !inputValue.trim()}
              sx={{
                minWidth: "auto",
                width: 40,
                height: 40,
                borderRadius: "50%",
              }}
            >
              <SendIcon fontSize="small" />
            </Button>
          </Box>
        </Box>
      </Paper>
    </Slide>
  );
};

export default Chatbot;
// Note: This code is a React component for a chatbot interface that allows users to interact with a lead qualification assistant. It includes features like message history, user input handling, and integration with a backend API for processing messages and updating lead data.
// The component uses Material-UI for styling and layout, and it supports both minimized and expanded states. The chatbot can handle user messages, display bot responses, and manage lead qualification data. It also includes a reset function to clear the conversation and start over.
