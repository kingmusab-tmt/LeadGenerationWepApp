"use client";
import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  TextField,
  Button,
  Card,
  CardContent,
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Delete,
  Add,
  PlayCircle,
  Edit,
  OndemandVideo,
} from "@mui/icons-material";
import { useCSRFFetch } from "@/app/hooks/useCSRF";
import { useNotification } from "@/app/hooks";

interface Video {
  _id: string;
  title: string;
  description: string;
  url: string;
  duration?: string;
  category?: string;
  targetAudience?: "buyer" | "seller" | "both";
}

interface FAQ {
  _id: string;
  question: string;
  answer: string;
  category?: string;
  targetAudience?: "buyer" | "seller" | "both";
}

const getYouTubeEmbedUrl = (url: string): string | null => {
  try {
    if (!url) return null;
    const match = url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/,
    );
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  } catch {
    return null;
  }
};

interface HelpFormProps {
  tabValue: number;
  videoForm: {
    title: string;
    description: string;
    url: string;
    duration: string;
    category: string;
    targetAudience: "buyer" | "seller" | "both";
  };
  faqForm: {
    question: string;
    answer: string;
    category: string;
    targetAudience: "buyer" | "seller" | "both";
  };
  editingItem: Video | FAQ | null;
  onVideoFormChange: (form: HelpFormProps["videoForm"]) => void;
  onFaqFormChange: (form: HelpFormProps["faqForm"]) => void;
  onVideoSubmit: (e: React.FormEvent) => void;
  onFaqSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

const HelpForm: React.FC<HelpFormProps> = ({
  tabValue,
  videoForm,
  faqForm,
  editingItem,
  onVideoFormChange,
  onFaqFormChange,
  onVideoSubmit,
  onFaqSubmit,
  onCancel,
}) => {
  if (tabValue === 0) {
    return (
      <Box
        component="form"
        onSubmit={onVideoSubmit}
        sx={{ display: "flex", flexDirection: "column", gap: 2 }}
      >
        <TextField
          label="Title"
          value={videoForm.title}
          onChange={(e) =>
            onVideoFormChange({ ...videoForm, title: e.target.value })
          }
          required
          fullWidth
        />
        <TextField
          label="Description"
          value={videoForm.description}
          onChange={(e) =>
            onVideoFormChange({ ...videoForm, description: e.target.value })
          }
          multiline
          rows={3}
          fullWidth
        />
        <TextField
          label="YouTube URL"
          value={videoForm.url}
          onChange={(e) =>
            onVideoFormChange({ ...videoForm, url: e.target.value })
          }
          required
          fullWidth
        />
        <TextField
          label="Duration"
          value={videoForm.duration}
          onChange={(e) =>
            onVideoFormChange({ ...videoForm, duration: e.target.value })
          }
          fullWidth
        />
        <TextField
          label="Category"
          value={videoForm.category}
          onChange={(e) =>
            onVideoFormChange({ ...videoForm, category: e.target.value })
          }
          fullWidth
        />
        <FormControl fullWidth>
          <InputLabel>Target Audience</InputLabel>
          <Select
            value={videoForm.targetAudience}
            onChange={(e) =>
              onVideoFormChange({
                ...videoForm,
                targetAudience: e.target.value as "buyer" | "seller" | "both",
              })
            }
            label="Target Audience"
          >
            <MenuItem value="buyer">Buyer</MenuItem>
            <MenuItem value="seller">Seller</MenuItem>
            <MenuItem value="both">Both</MenuItem>
          </Select>
        </FormControl>
        <Box display="flex" gap={2}>
          <Button type="submit" variant="contained" startIcon={<Add />}>
            {editingItem ? "Update" : "Add"} Video
          </Button>
          {editingItem && (
            <Button variant="outlined" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </Box>
      </Box>
    );
  }

  return (
    <Box
      component="form"
      onSubmit={onFaqSubmit}
      sx={{ display: "flex", flexDirection: "column", gap: 2 }}
    >
      <TextField
        label="Question"
        value={faqForm.question}
        onChange={(e) =>
          onFaqFormChange({ ...faqForm, question: e.target.value })
        }
        required
        fullWidth
      />
      <TextField
        label="Answer"
        value={faqForm.answer}
        onChange={(e) =>
          onFaqFormChange({ ...faqForm, answer: e.target.value })
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
          onFaqFormChange({ ...faqForm, category: e.target.value })
        }
        fullWidth
      />
      <FormControl fullWidth>
        <InputLabel>Target Audience</InputLabel>
        <Select
          value={faqForm.targetAudience}
          onChange={(e) =>
            onFaqFormChange({
              ...faqForm,
              targetAudience: e.target.value as "buyer" | "seller" | "both",
            })
          }
          label="Target Audience"
        >
          <MenuItem value="buyer">Buyer</MenuItem>
          <MenuItem value="seller">Seller</MenuItem>
          <MenuItem value="both">Both</MenuItem>
        </Select>
      </FormControl>
      <Box display="flex" gap={2}>
        <Button type="submit" variant="contained" startIcon={<Add />}>
          {editingItem ? "Update" : "Add"} FAQ
        </Button>
        {editingItem && (
          <Button variant="outlined" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </Box>
    </Box>
  );
};

const HelpManagement = () => {
  const csrfFetch = useCSRFFetch();
  const notify = useNotification();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [tabValue, setTabValue] = useState(0);
  const [videos, setVideos] = useState<Video[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<Video | FAQ | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);

  // Form states
  const [videoForm, setVideoForm] = useState({
    title: "",
    description: "",
    url: "",
    duration: "",
    category: "",
    targetAudience: "both" as "buyer" | "seller" | "both",
  });

  const [faqForm, setFaqForm] = useState({
    question: "",
    answer: "",
    category: "",
    targetAudience: "both" as "buyer" | "seller" | "both",
  });

  const fetchVideos = async () => {
    try {
      const response = await fetch("/api/help/videos");
      if (!response.ok) throw new Error("Failed to fetch videos");
      const data = await response.json();
      setVideos(data);
    } catch (err) {
      setError("Failed to fetch videos");
    }
  };

  const fetchFaqs = async () => {
    try {
      const response = await fetch("/api/help/faqs");
      if (!response.ok) throw new Error("Failed to fetch FAQs");
      const data = await response.json();
      setFaqs(data);
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
        await csrfFetch(`/api/help/videos?id=${editingItem._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(videoForm),
        });
      } else {
        await csrfFetch("/api/help/videos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(videoForm),
        });
      }
      resetVideoForm();
      fetchVideos();
      setEditingItem(null);
      setEditDialogOpen(false);
      notify(editingItem ? "Video updated" : "Video added", "success");
    } catch (err) {
      setError("Failed to save video");
    }
  };

  const handleFaqSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem && "_id" in editingItem) {
        await csrfFetch(`/api/help/faqs?id=${editingItem._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(faqForm),
        });
      } else {
        await csrfFetch("/api/help/faqs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(faqForm),
        });
      }
      resetFaqForm();
      fetchFaqs();
      setEditingItem(null);
      setEditDialogOpen(false);
      notify(editingItem ? "FAQ updated" : "FAQ added", "success");
    } catch (err) {
      setError("Failed to save FAQ");
    }
  };

  const deleteVideo = async (id: string) => {
    try {
      await csrfFetch(`/api/help/videos?id=${id}`, { method: "DELETE" });
      fetchVideos();
      notify("Video deleted", "success");
    } catch (err) {
      setError("Failed to delete video");
    }
  };

  const deleteFaq = async (id: string) => {
    try {
      await csrfFetch(`/api/help/faqs?id=${id}`, { method: "DELETE" });
      fetchFaqs();
      notify("FAQ deleted", "success");
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
        targetAudience: item.targetAudience || "both",
      });
    } else {
      // It's an FAQ
      setFaqForm({
        question: item.question,
        answer: item.answer,
        category: item.category || "",
        targetAudience: item.targetAudience || "both",
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
      targetAudience: "both",
    });
  };

  const resetFaqForm = () => {
    setFaqForm({
      question: "",
      answer: "",
      category: "",
      targetAudience: "both",
    });
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditingItem(null);
    if (tabValue === 0) resetVideoForm();
    else resetFaqForm();
  };

  useEffect(() => {
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
      <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
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
          <Grid size={{ xs: 12, md: 5, lg: 4 }}>
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
                <HelpForm
                  tabValue={tabValue}
                  videoForm={videoForm}
                  faqForm={faqForm}
                  editingItem={editingItem}
                  onVideoFormChange={setVideoForm}
                  onFaqFormChange={setFaqForm}
                  onVideoSubmit={handleVideoSubmit}
                  onFaqSubmit={handleFaqSubmit}
                  onCancel={() => {
                    setEditingItem(null);
                    if (tabValue === 0) resetVideoForm();
                    else resetFaqForm();
                  }}
                />
              </CardContent>
            </Card>
          </Grid>

          {/* List Column - Right on large screens, full width on small */}
          <Grid size={{ xs: 12, md: 7, lg: 8 }}>
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
                            onClick={() => {
                              const embedUrl = getYouTubeEmbedUrl(video.url);
                              if (embedUrl) setPreviewVideoUrl(embedUrl);
                              else notify("Invalid YouTube URL", "warning");
                            }}
                            color="default"
                            sx={{ mr: 0.5 }}
                          >
                            <OndemandVideo />
                          </IconButton>
                          <IconButton
                            edge="end"
                            onClick={() => editItem(video)}
                            color="primary"
                            sx={{ mr: 0.5 }}
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
                        secondaryTypographyProps={{ component: "div" }}
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
                              {video.targetAudience && (
                                <Chip
                                  label={`For: ${video.targetAudience.charAt(0).toUpperCase() + video.targetAudience.slice(1)}`}
                                  size="small"
                                  color={
                                    video.targetAudience === "buyer"
                                      ? "primary"
                                      : video.targetAudience === "seller"
                                        ? "secondary"
                                        : "default"
                                  }
                                />
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
                        secondaryTypographyProps={{ component: "div" }}
                        secondary={
                          <>
                            <Typography variant="body2" gutterBottom>
                              {faq.answer}
                            </Typography>
                            <Box display="flex" gap={1} mt={1}>
                              {faq.category && (
                                <Chip label={faq.category} size="small" />
                              )}
                              {faq.targetAudience && (
                                <Chip
                                  label={`For: ${faq.targetAudience.charAt(0).toUpperCase() + faq.targetAudience.slice(1)}`}
                                  size="small"
                                  color={
                                    faq.targetAudience === "buyer"
                                      ? "primary"
                                      : faq.targetAudience === "seller"
                                        ? "secondary"
                                        : "default"
                                  }
                                />
                              )}
                            </Box>
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

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={handleCloseEditDialog}
        fullScreen={isMobile}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{tabValue === 0 ? "Edit Video" : "Edit FAQ"}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <HelpForm
              tabValue={tabValue}
              videoForm={videoForm}
              faqForm={faqForm}
              editingItem={editingItem}
              onVideoFormChange={setVideoForm}
              onFaqFormChange={setFaqForm}
              onVideoSubmit={(e) => {
                handleVideoSubmit(e);
                handleCloseEditDialog();
              }}
              onFaqSubmit={(e) => {
                handleFaqSubmit(e);
                handleCloseEditDialog();
              }}
              onCancel={handleCloseEditDialog}
            />
          </Box>
        </DialogContent>
      </Dialog>

      {/* Video Preview Dialog */}
      <Dialog
        open={!!previewVideoUrl}
        onClose={() => setPreviewVideoUrl(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Video Preview</DialogTitle>
        <DialogContent>
          {previewVideoUrl && (
            <Box
              sx={{
                position: "relative",
                paddingTop: "56.25%",
                width: "100%",
              }}
            >
              <iframe
                src={previewVideoUrl}
                title="Video Preview"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  border: "none",
                }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewVideoUrl(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HelpManagement;
