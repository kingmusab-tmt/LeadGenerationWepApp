"use client";
import React, { useState } from "react";
import Chatbot from "../components/Chatbot";
import { ILead } from "@/models/leads";
import { IBuyer } from "@/models/leadbuyers";
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Avatar,
  LinearProgress,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Badge,
  Tooltip,
  IconButton,
  Alert,
  Snackbar,
} from "@mui/material";
import {
  AssignmentInd as AssignmentIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Email as EmailIcon,
  CheckCircle as CheckCircleIcon,
  WatchLater as WatchLaterIcon,
  Equalizer as StatsIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";

interface AssignedLead extends ILead {
  buyer?: IBuyer;
  assignment?: ILead["assignedTo"][0];
}

export default function Home() {
  const [qualifiedLeads, setQualifiedLeads] = useState<AssignedLead[]>([]);
  const [currentLead, setCurrentLead] = useState<Partial<ILead> | null>(null);
  const [assignments, setAssignments] = useState<
    (ILead["assignedTo"][0] & { leadId?: string })[]
  >([]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "info" | "warning",
  });

  const handleLeadUpdate = (lead: Partial<ILead>) => {
    setCurrentLead(lead);
  };

  const handleQualificationComplete = async (lead: ILead) => {
    try {
      const response = await fetch("/api/lead-assignment/round-robin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead }),
      });

      const result = await response.json();

      if (result.success) {
        const assignedLead: AssignedLead = {
          ...JSON.parse(JSON.stringify(lead)),
          buyer: result.buyer,
          assignment: result.assignment,
        };

        setQualifiedLeads((prev) => [...prev, assignedLead]);
        setAssignments((prev) => [
          ...prev,
          { ...result.assignment, leadId: lead.id },
        ]);

        setSnackbar({
          open: true,
          message: `Lead assigned to ${result.buyer.name} from ${result.buyer.company}`,
          severity: "success",
        });
      } else {
        setQualifiedLeads((prev) => [...prev, lead]);
        setSnackbar({
          open: true,
          message: "Lead qualified but not assigned yet",
          severity: "info",
        });
      }
    } catch (error) {
      console.error("Error assigning lead:", error);
      setQualifiedLeads((prev) => [...prev, lead]);
      setSnackbar({
        open: true,
        message: "Error assigning lead, but qualification was saved",
        severity: "error",
      });
    }
  };

  const resetQualifiedLeads = () => {
    setQualifiedLeads([]);
    setAssignments([]);
    setSnackbar({
      open: true,
      message: "Qualified leads list has been reset",
      severity: "info",
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  return (
    <Box sx={{ backgroundColor: "background.default", minHeight: "100vh" }}>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 4,
          }}
        >
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            Lead Management Platform
          </Typography>
          <Tooltip title="Reset qualified leads">
            <IconButton
              onClick={resetQualifiedLeads}
              color="primary"
              sx={{ backgroundColor: "action.selected" }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <Grid container spacing={3}>
          {/* Current Lead Info */}
          <Grid item xs={12} md={4}>
            <Paper
              elevation={3}
              sx={{
                p: 3,
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box display="flex" alignItems="center" mb={2}>
                <AssignmentIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" component="h2">
                  Current Lead
                </Typography>
              </Box>

              {currentLead ? (
                <Box sx={{ flex: 1 }}>
                  <Box display="flex" alignItems="center" mb={1.5}>
                    <PersonIcon color="action" sx={{ mr: 1.5, fontSize: 20 }} />
                    <Typography variant="body1">
                      <Box component="span" fontWeight="500">
                        Name:
                      </Box>{" "}
                      {currentLead.name || "Not provided"}
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center" mb={1.5}>
                    <EmailIcon color="action" sx={{ mr: 1.5, fontSize: 20 }} />
                    <Typography variant="body1">
                      <Box component="span" fontWeight="500">
                        Email:
                      </Box>{" "}
                      {currentLead.email || "Not provided"}
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center" mb={2}>
                    <BusinessIcon
                      color="action"
                      sx={{ mr: 1.5, fontSize: 20 }}
                    />
                    <Typography variant="body1">
                      <Box component="span" fontWeight="500">
                        Company:
                      </Box>{" "}
                      {currentLead.company || "Not provided"}
                    </Typography>
                  </Box>
                  <Box mb={2}>
                    <Typography variant="body1" gutterBottom>
                      <Box component="span" fontWeight="500">
                        Score:
                      </Box>{" "}
                      {currentLead.qualificationScore || 0}/100
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={currentLead.qualificationScore || 0}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: "divider",
                        "& .MuiLinearProgress-bar": {
                          borderRadius: 4,
                        },
                      }}
                    />
                  </Box>
                </Box>
              ) : (
                <Box
                  sx={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Typography color="text.secondary">
                    No active conversation
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Qualified Leads */}
          <Grid item xs={12} md={4}>
            <Paper
              elevation={3}
              sx={{
                p: 3,
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box display="flex" alignItems="center" mb={2}>
                <Badge
                  badgeContent={qualifiedLeads.length}
                  color="primary"
                  sx={{ mr: 1.5 }}
                >
                  <CheckCircleIcon color="primary" />
                </Badge>
                <Typography variant="h6" component="h2">
                  Qualified Leads
                </Typography>
              </Box>

              <List sx={{ flex: 1, overflow: "auto", py: 0 }}>
                {qualifiedLeads.length > 0 ? (
                  qualifiedLeads.map((lead) => (
                    <React.Fragment key={lead.id}>
                      <ListItem
                        sx={{
                          mb: 1,
                          p: 1.5,
                          border: "1px solid",
                          borderColor: "divider",
                          borderRadius: 1,
                          "&:hover": { backgroundColor: "action.hover" },
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: "primary.main" }}>
                            {lead.name?.charAt(0).toUpperCase() || "?"}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography variant="subtitle2" component="div">
                              {lead.name || "Unnamed Lead"}
                            </Typography>
                          }
                          secondary={
                            <>
                              <Typography
                                variant="body2"
                                color="text.primary"
                                component="span"
                              >
                                {lead.company}
                              </Typography>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  mt: 0.5,
                                  gap: 1,
                                }}
                              >
                                <Chip
                                  label={`${lead.qualificationScore}/100`}
                                  size="small"
                                  color={
                                    (lead.qualificationScore || 0) >= 75
                                      ? "success"
                                      : (lead.qualificationScore || 0) >= 50
                                      ? "warning"
                                      : "error"
                                  }
                                  sx={{ height: 24 }}
                                />
                                {lead.buyer ? (
                                  <Chip
                                    icon={<PersonIcon fontSize="small" />}
                                    label={`Assigned to ${lead.buyer.name}`}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                    sx={{ height: 24 }}
                                  />
                                ) : (
                                  <Chip
                                    icon={<WatchLaterIcon fontSize="small" />}
                                    label="Awaiting assignment"
                                    size="small"
                                    color="default"
                                    variant="outlined"
                                    sx={{ height: 24 }}
                                  />
                                )}
                              </Box>
                            </>
                          }
                        />
                      </ListItem>
                    </React.Fragment>
                  ))
                ) : (
                  <Box
                    sx={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Typography color="text.secondary">
                      No qualified leads yet
                    </Typography>
                  </Box>
                )}
              </List>
            </Paper>
          </Grid>

          {/* Assignment Statistics */}
          <Grid item xs={12} md={4}>
            <Paper
              elevation={3}
              sx={{
                p: 3,
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box display="flex" alignItems="center" mb={2}>
                <StatsIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" component="h2">
                  Assignment Stats
                </Typography>
              </Box>

              <Box sx={{ flex: 1 }}>
                <List>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Typography fontWeight="500">Total Assigned</Typography>
                      }
                      secondary={assignments.length}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Typography fontWeight="500">Success Rate</Typography>
                      }
                      secondary={
                        qualifiedLeads.length > 0
                          ? `${Math.round(
                              (assignments.length / qualifiedLeads.length) * 100
                            )}%`
                          : "0%"
                      }
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Typography fontWeight="500">Average Score</Typography>
                      }
                      secondary={
                        qualifiedLeads.length > 0
                          ? Math.round(
                              qualifiedLeads.reduce(
                                (sum, lead) =>
                                  sum + (lead.qualificationScore || 0),
                                0
                              ) / qualifiedLeads.length
                            )
                          : 0
                      }
                    />
                  </ListItem>
                </List>

                {assignments.length > 0 && (
                  <Box mt={3}>
                    <Typography
                      variant="subtitle1"
                      gutterBottom
                      fontWeight="500"
                    >
                      Recent Assignments
                    </Typography>
                    <List dense>
                      {assignments.slice(-3).map((assignment) => {
                        const lead = qualifiedLeads.find(
                          (l) => l.id === assignment.leadId
                        );
                        return (
                          <ListItem key={assignment.id} sx={{ py: 0.5 }}>
                            <ListItemText
                              primary={
                                <Typography variant="body2">
                                  {lead?.name || "Unknown Lead"}
                                </Typography>
                              }
                              secondary={
                                lead?.buyer ? (
                                  <Typography variant="caption">
                                    Assigned to {lead.buyer.name} (
                                    {lead.buyer.company})
                                  </Typography>
                                ) : (
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    Unassigned
                                  </Typography>
                                )
                              }
                            />
                          </ListItem>
                        );
                      })}
                    </List>
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      {/* Chatbot Component */}
      <Chatbot
        onLeadUpdate={handleLeadUpdate}
        onQualificationComplete={handleQualificationComplete}
      />

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
