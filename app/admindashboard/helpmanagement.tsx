"use client";
import React, { useState } from "react";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  TextField,
  Button,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemText,
  IconButton,
  CircularProgress,
  Chip,
  Paper,
  Alert,
  Avatar,
  ListItemAvatar,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { Delete, Add, PlayCircle, Edit } from "@mui/icons-material";
import axios from "axios";

interface Video {
  _id: string;
  title: string;
  description: string;
  url: string;
  duration?: string;
  category?: string;
}

interface FAQ {
  _id: string;
  question: string;
  answer: string;
  category?: string;
}

const HelpManagement = () => {
  const [tabValue, setTabValue] = useState(0);
  const [videos, setVideos] = useState<Video[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<Video | FAQ | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Form states
  const [videoForm, setVideoForm] = useState({
    title: "",
    description: "",
    url: "",
    duration: "",
    category: "",
  });

  const [faqForm, setFaqForm] = useState({
    question: "",
    answer: "",
    category: "",
  });

  const fetchVideos = async () => {
    try {
      const response = await axios.get("/api/help/videos");
      setVideos(response.data);
    } catch (err) {
      setError("Failed to fetch videos");
    }
  };

  const fetchFaqs = async () => {
    try {
      const response = await axios.get("/api/help/faqs");
      setFaqs(response.data);
    } catch (err) {
      setError("Failed to fetch FAQs");
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleVideoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem && "_id" in editingItem) {
        await axios.put(`/api/help/videos?id=${editingItem._id}`, videoForm);
      } else {
        await axios.post("/api/help/videos", videoForm);
      }
      resetVideoForm();
      fetchVideos();
      setEditingItem(null);
    } catch (err) {
      setError("Failed to save video");
    }
  };

  const handleFaqSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem && "_id" in editingItem) {
        await axios.put(`/api/help/faqs?id=${editingItem._id}`, faqForm);
      } else {
        await axios.post("/api/help/faqs", faqForm);
      }
      resetFaqForm();
      fetchFaqs();
      setEditingItem(null);
    } catch (err) {
      setError("Failed to save FAQ");
    }
  };

  const deleteVideo = async (id: string) => {
    try {
      await axios.delete(`/api/help/videos?id=${id}`);
      fetchVideos();
    } catch (err) {
      setError("Failed to delete video");
    }
  };

  const deleteFaq = async (id: string) => {
    try {
      await axios.delete(`/api/help/faqs?id=${id}`);
      fetchFaqs();
    } catch (err) {
      setError("Failed to delete FAQ");
    }
  };

  const editItem = (item: Video | FAQ) => {
    setEditingItem(item);
    if ("title" in item) {
      // It's a video
      setVideoForm({
        title: item.title,
        description: item.description,
        url: item.url,
        duration: item.duration || "",
        category: item.category || "",
      });
    } else {
      // It's an FAQ
      setFaqForm({
        question: item.question,
        answer: item.answer,
        category: item.category || "",
      });
    }
    setEditDialogOpen(true);
  };

  const resetVideoForm = () => {
    setVideoForm({
      title: "",
      description: "",
      url: "",
      duration: "",
      category: "",
    });
  };

  const resetFaqForm = () => {
    setFaqForm({
      question: "",
      answer: "",
      category: "",
    });
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditingItem(null);
    if (tabValue === 0) resetVideoForm();
    else resetFaqForm();
  };

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchVideos(), fetchFaqs()]);
      } catch (err) {
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Help Content Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="Video Tutorials" />
        <Tab label="FAQs" />
      </Tabs>

      {loading ? (
        <Box display="flex" justifyContent="center">
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {/* Form Column - Left on large screens, full width on small */}
          <Grid item xs={12} md={5} lg={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {tabValue === 0
                    ? editingItem
                      ? "Edit Video"
                      : "Add New Video"
                    : editingItem
                    ? "Edit FAQ"
                    : "Add New FAQ"}
                </Typography>
                {tabValue === 0 ? (
                  <Box
                    component="form"
                    onSubmit={handleVideoSubmit}
                    sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                  >
                    <TextField
                      label="Title"
                      value={videoForm.title}
                      onChange={(e) =>
                        setVideoForm({ ...videoForm, title: e.target.value })
                      }
                      required
                      fullWidth
                    />
                    <TextField
                      label="Description"
                      value={videoForm.description}
                      onChange={(e) =>
                        setVideoForm({
                          ...videoForm,
                          description: e.target.value,
                        })
                      }
                      multiline
                      rows={3}
                      fullWidth
                    />
                    <TextField
                      label="YouTube URL"
                      value={videoForm.url}
                      onChange={(e) =>
                        setVideoForm({ ...videoForm, url: e.target.value })
                      }
                      required
                      fullWidth
                    />
                    <TextField
                      label="Duration"
                      value={videoForm.duration}
                      onChange={(e) =>
                        setVideoForm({ ...videoForm, duration: e.target.value })
                      }
                      fullWidth
                    />
                    <TextField
                      label="Category"
                      value={videoForm.category}
                      onChange={(e) =>
                        setVideoForm({ ...videoForm, category: e.target.value })
                      }
                      fullWidth
                    />
                    <Box display="flex" gap={2}>
                      <Button
                        type="submit"
                        variant="contained"
                        startIcon={<Add />}
                      >
                        {editingItem ? "Update" : "Add"} Video
                      </Button>
                      {editingItem && (
                        <Button
                          variant="outlined"
                          onClick={() => {
                            setEditingItem(null);
                            resetVideoForm();
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                    </Box>
                  </Box>
                ) : (
                  <Box
                    component="form"
                    onSubmit={handleFaqSubmit}
                    sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                  >
                    <TextField
                      label="Question"
                      value={faqForm.question}
                      onChange={(e) =>
                        setFaqForm({ ...faqForm, question: e.target.value })
                      }
                      required
                      fullWidth
                    />
                    <TextField
                      label="Answer"
                      value={faqForm.answer}
                      onChange={(e) =>
                        setFaqForm({ ...faqForm, answer: e.target.value })
                      }
                      multiline
                      rows={3}
                      required
                      fullWidth
                    />
                    <TextField
                      label="Category"
                      value={faqForm.category}
                      onChange={(e) =>
                        setFaqForm({ ...faqForm, category: e.target.value })
                      }
                      fullWidth
                    />
                    <Box display="flex" gap={2}>
                      <Button
                        type="submit"
                        variant="contained"
                        startIcon={<Add />}
                      >
                        {editingItem ? "Update" : "Add"} FAQ
                      </Button>
                      {editingItem && (
                        <Button
                          variant="outlined"
                          onClick={() => {
                            setEditingItem(null);
                            resetFaqForm();
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* List Column - Right on large screens, full width on small */}
          <Grid item xs={12} md={7} lg={8}>
            <Typography variant="h6" gutterBottom>
              {tabValue === 0 ? "Existing Videos" : "Existing FAQs"}
            </Typography>
            {tabValue === 0 ? (
              <List sx={{ width: "100%" }}>
                {videos.map((video) => (
                  <Paper key={video._id} elevation={2} sx={{ mb: 2 }}>
                    <ListItem
                      secondaryAction={
                        <Box>
                          <IconButton
                            edge="end"
                            onClick={() => editItem(video)}
                            color="primary"
                            sx={{ mr: 1 }}
                          >
                            <Edit />
                          </IconButton>
                          <IconButton
                            edge="end"
                            onClick={() => deleteVideo(video._id)}
                            color="error"
                          >
                            <Delete />
                          </IconButton>
                        </Box>
                      }
                    >
                      <ListItemAvatar>
                        <Avatar>
                          <PlayCircle />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={video.title}
                        secondary={
                          <>
                            <Typography
                              variant="body2"
                              component="span"
                              display="block"
                              gutterBottom
                            >
                              {video.description}
                            </Typography>
                            <Box display="flex" gap={1} mt={1}>
                              {video.category && (
                                <Chip label={video.category} size="small" />
                              )}
                              {video.duration && (
                                <Chip label={video.duration} size="small" />
                              )}
                            </Box>
                          </>
                        }
                      />
                    </ListItem>
                  </Paper>
                ))}
              </List>
            ) : (
              <List sx={{ width: "100%" }}>
                {faqs.map((faq) => (
                  <Paper key={faq._id} elevation={2} sx={{ mb: 2 }}>
                    <ListItem
                      secondaryAction={
                        <Box>
                          <IconButton
                            edge="end"
                            onClick={() => editItem(faq)}
                            color="primary"
                            sx={{ mr: 1 }}
                          >
                            <Edit />
                          </IconButton>
                          <IconButton
                            edge="end"
                            onClick={() => deleteFaq(faq._id)}
                            color="error"
                          >
                            <Delete />
                          </IconButton>
                        </Box>
                      }
                    >
                      <ListItemText
                        primary={faq.question}
                        secondary={
                          <>
                            <Typography variant="body2" gutterBottom>
                              {faq.answer}
                            </Typography>
                            {faq.category && (
                              <Chip label={faq.category} size="small" />
                            )}
                          </>
                        }
                      />
                    </ListItem>
                  </Paper>
                ))}
              </List>
            )}
          </Grid>
        </Grid>
      )}

      {/* Edit Dialog (for mobile view) */}
      <Dialog
        open={editDialogOpen}
        onClose={handleCloseEditDialog}
        fullScreen={window.innerWidth < 600}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{tabValue === 0 ? "Edit Video" : "Edit FAQ"}</DialogTitle>
        <DialogContent>
          {tabValue === 0 ? (
            <Box
              component="form"
              sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}
            >
              <TextField
                label="Title"
                value={videoForm.title}
                onChange={(e) =>
                  setVideoForm({ ...videoForm, title: e.target.value })
                }
                required
                fullWidth
              />
              <TextField
                label="Description"
                value={videoForm.description}
                onChange={(e) =>
                  setVideoForm({
                    ...videoForm,
                    description: e.target.value,
                  })
                }
                multiline
                rows={3}
                fullWidth
              />
              <TextField
                label="YouTube URL"
                value={videoForm.url}
                onChange={(e) =>
                  setVideoForm({ ...videoForm, url: e.target.value })
                }
                required
                fullWidth
              />
              <TextField
                label="Duration"
                value={videoForm.duration}
                onChange={(e) =>
                  setVideoForm({ ...videoForm, duration: e.target.value })
                }
                fullWidth
              />
              <TextField
                label="Category"
                value={videoForm.category}
                onChange={(e) =>
                  setVideoForm({ ...videoForm, category: e.target.value })
                }
                fullWidth
              />
            </Box>
          ) : (
            <Box
              component="form"
              sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}
            >
              <TextField
                label="Question"
                value={faqForm.question}
                onChange={(e) =>
                  setFaqForm({ ...faqForm, question: e.target.value })
                }
                required
                fullWidth
              />
              <TextField
                label="Answer"
                value={faqForm.answer}
                onChange={(e) =>
                  setFaqForm({ ...faqForm, answer: e.target.value })
                }
                multiline
                rows={3}
                required
                fullWidth
              />
              <TextField
                label="Category"
                value={faqForm.category}
                onChange={(e) =>
                  setFaqForm({ ...faqForm, category: e.target.value })
                }
                fullWidth
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>Cancel</Button>
          <Button
            onClick={tabValue === 0 ? handleVideoSubmit : handleFaqSubmit}
            variant="contained"
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HelpManagement;
