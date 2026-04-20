"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Container,
  Paper,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Badge,
  List,
  ListItem,
  ListItemText,
  Divider,
  Select,
  MenuItem,
  CircularProgress,
} from "@mui/material";
import {
  Search,
  FilterList,
  Refresh,
  PlayCircle,
  Block,
  CheckCircle,
  Warning,
  Call,
  Description,
  Person,
  Email,
  Phone,
  CalendarToday,
  Business,
  FlagOutlined,
} from "@mui/icons-material";
import { useCSRFFetch } from "@/app/hooks/useCSRF";
import { useNotification } from "@/app/hooks";
import { AdminLead } from "@/types/lead";

interface CallRecord {
  id: string;
  callSid: string;
  from: string;
  to: string;
  duration: number;
  status: string;
  recordingUrl?: string;
  createdAt: string;
  buyer?: {
    id: string;
    name: string;
  };
  seller?: {
    id: string;
    name: string;
  };
  feedback?: {
    rating: boolean;
    comment?: string;
  };
}

const ContentVerification = () => {
  const csrfFetch = useCSRFFetch();
  const notify = useNotification();
  const [activeTab, setActiveTab] = useState(0);
  const [leads, setLeads] = useState<AdminLead[]>([]);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [leadPage, setLeadPage] = useState(0);
  const [callPage, setCallPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [leadStatusFilter, setLeadStatusFilter] = useState<string>("all");
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);
  const [selectedLead, setSelectedLead] = useState<AdminLead | null>(null);
  const [openCallDialog, setOpenCallDialog] = useState(false);
  const [openLeadDialog, setOpenLeadDialog] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [leadsRes, callsRes] = await Promise.all([
        fetch("/api/admin/leads"),
        fetch("/api/admin/calls"),
      ]);

      const leadsData = await leadsRes.json();
      const callsData = await callsRes.json();

      setLeads(leadsData.leads || []);
      setCalls(callsData.calls || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      notify("Failed to fetch content data", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleLeadPageChange = (event: unknown, newPage: number) => {
    setLeadPage(newPage);
  };

  const handleCallPageChange = (event: unknown, newPage: number) => {
    setCallPage(newPage);
  };

  const handleRowsPerPageChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setLeadPage(0);
    setCallPage(0);
  };

  const handleOpenCallDialog = (call: CallRecord) => {
    setSelectedCall(call);
    setOpenCallDialog(true);
  };

  const handleCloseCallDialog = () => {
    setOpenCallDialog(false);
  };

  const handleOpenLeadDialog = (lead: AdminLead) => {
    setSelectedLead(lead);
    setOpenLeadDialog(true);
  };

  const handleCloseLeadDialog = () => {
    setOpenLeadDialog(false);
  };

  const handleFlagContent = async (
    type: "lead" | "call",
    id: string,
    currentlyFlagged: boolean,
  ) => {
    try {
      const response = await csrfFetch(`/api/admin/${type}s/${id}/flag`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ flagged: !currentlyFlagged }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to ${currentlyFlagged ? "unflag" : "flag"} ${type}`,
        );
      }

      const newStatus = currentlyFlagged
        ? type === "lead"
          ? "available"
          : "completed"
        : "flagged";

      if (type === "lead") {
        setLeads(
          leads.map((lead) =>
            lead.id === id
              ? { ...lead, status: newStatus as AdminLead["status"] }
              : lead,
          ),
        );
        if (selectedLead?.id === id) {
          setSelectedLead({
            ...selectedLead,
            status: newStatus as AdminLead["status"],
          });
        }
      } else {
        setCalls(
          calls.map((call) =>
            call.id === id ? { ...call, status: newStatus } : call,
          ),
        );
        if (selectedCall?.id === id) {
          setSelectedCall({ ...selectedCall, status: newStatus });
        }
      }

      notify(
        `${type === "lead" ? "Lead" : "Call"} ${currentlyFlagged ? "unflagged" : "flagged"} successfully`,
        "success",
      );
    } catch (error) {
      console.error(`Failed to flag ${type}:`, error);
      notify(
        `Failed to ${currentlyFlagged ? "unflag" : "flag"} ${type}`,
        "error",
      );
    }
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.seller.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.fields.some((f) =>
        f.value.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    const matchesStatus =
      leadStatusFilter === "all" || lead.status === leadStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredCalls = calls.filter(
    (call) =>
      call.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.to.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.buyer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.seller?.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const paginatedLeads = filteredLeads.slice(
    leadPage * rowsPerPage,
    leadPage * rowsPerPage + rowsPerPage,
  );

  const paginatedCalls = filteredCalls.slice(
    callPage * rowsPerPage,
    callPage * rowsPerPage + rowsPerPage,
  );

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "50vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 6, mb: 4 }}>
      <Typography variant="h5" gutterBottom>
        Content Verification
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab
            label={
              <Badge badgeContent={leads.length} color="primary">
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Description /> Lead Management
                </Box>
              </Badge>
            }
          />
          <Tab
            label={
              <Badge badgeContent={calls.length} color="primary">
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Call /> Call Monitoring
                </Box>
              </Badge>
            }
          />
        </Tabs>
      </Paper>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <TextField
            label={`Search ${activeTab === 0 ? "Leads" : "Calls"}`}
            variant="outlined"
            size="small"
            fullWidth
            value={searchTerm}
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, color: "action.active" }} />,
            }}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {activeTab === 0 && (
            <Select
              value={leadStatusFilter}
              onChange={(e) => {
                setLeadStatusFilter(e.target.value);
                setLeadPage(0);
              }}
              size="small"
              sx={{ minWidth: 140 }}
              startAdornment={<FilterList fontSize="small" sx={{ mr: 1 }} />}
            >
              <MenuItem value="all">All Statuses</MenuItem>
              <MenuItem value="new">New</MenuItem>
              <MenuItem value="available">Available</MenuItem>
              <MenuItem value="sold">Sold</MenuItem>
              <MenuItem value="assigned">Assigned</MenuItem>
              <MenuItem value="flagged">Flagged</MenuItem>
            </Select>
          )}
          <Tooltip title="Refresh">
            <IconButton onClick={fetchData}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {activeTab === 0 ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Lead ID</TableCell>
                <TableCell>Seller</TableCell>
                <TableCell>Source</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Quality</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedLeads.length > 0 ? (
                paginatedLeads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>{lead.id.substring(0, 8)}...</TableCell>
                    <TableCell>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Avatar sx={{ width: 32, height: 32 }}>
                          {lead.seller.name.charAt(0)}
                        </Avatar>
                        {lead.seller.name}
                      </Box>
                    </TableCell>
                    <TableCell>{lead.source}</TableCell>
                    <TableCell>
                      <Chip
                        label={lead.status}
                        size="small"
                        color={
                          lead.status === "sold"
                            ? "success"
                            : lead.status === "flagged"
                              ? "error"
                              : "default"
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip
                        title={`AI Spam Score: ${(lead.qualityScore / 10).toFixed(1)}/10\nQuality Level: ${lead.qualityLevel}\n\nScore Range: 0-100 (Lower = Better Quality)\n\n0-40: High Quality (Clean, Legitimate)\n41-69: Medium Quality (Some Red Flags)\n70-100: Low Quality (Spam/Suspicious)`}
                      >
                        <Chip
                          label={`${(lead.qualityScore / 10).toFixed(1)}/10`}
                          size="small"
                          color={
                            lead.qualityScore <= 40
                              ? "success"
                              : lead.qualityScore <= 70
                                ? "warning"
                                : "error"
                          }
                        />
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Details">
                        <IconButton onClick={() => handleOpenLeadDialog(lead)}>
                          <Description fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip
                        title={
                          lead.status === "flagged"
                            ? "Remove Flag"
                            : "Flag as Suspicious"
                        }
                      >
                        <IconButton
                          onClick={() =>
                            handleFlagContent(
                              "lead",
                              lead.id,
                              lead.status === "flagged",
                            )
                          }
                        >
                          {lead.status === "flagged" ? (
                            <FlagOutlined color="success" fontSize="small" />
                          ) : (
                            <Warning color="warning" fontSize="small" />
                          )}
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No leads found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredLeads.length}
            rowsPerPage={rowsPerPage}
            page={leadPage}
            onPageChange={handleLeadPageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
          />
        </TableContainer>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Call ID</TableCell>
                <TableCell>From</TableCell>
                <TableCell>To</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Feedback</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedCalls.length > 0 ? (
                paginatedCalls.map((call) => (
                  <TableRow key={call.id}>
                    <TableCell>{call.callSid.substring(0, 8)}...</TableCell>
                    <TableCell>{call.from}</TableCell>
                    <TableCell>{call.to}</TableCell>
                    <TableCell>{call.duration}s</TableCell>
                    <TableCell>
                      <Chip
                        label={call.status}
                        size="small"
                        color={
                          call.status === "completed"
                            ? "success"
                            : call.status === "flagged"
                              ? "error"
                              : "default"
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(call.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {call.feedback ? (
                        call.feedback.rating ? (
                          <CheckCircle color="success" />
                        ) : (
                          <Block color="error" />
                        )
                      ) : (
                        <Typography variant="caption">No feedback</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Listen to Recording">
                        <IconButton
                          onClick={() => handleOpenCallDialog(call)}
                          disabled={!call.recordingUrl}
                        >
                          <PlayCircle
                            color={call.recordingUrl ? "primary" : "disabled"}
                            fontSize="small"
                          />
                        </IconButton>
                      </Tooltip>
                      <Tooltip
                        title={
                          call.status === "flagged"
                            ? "Remove Flag"
                            : "Flag as Suspicious"
                        }
                      >
                        <IconButton
                          onClick={() =>
                            handleFlagContent(
                              "call",
                              call.id,
                              call.status === "flagged",
                            )
                          }
                        >
                          {call.status === "flagged" ? (
                            <FlagOutlined color="success" fontSize="small" />
                          ) : (
                            <Warning color="warning" fontSize="small" />
                          )}
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    No calls found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredCalls.length}
            rowsPerPage={rowsPerPage}
            page={callPage}
            onPageChange={handleCallPageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
          />
        </TableContainer>
      )}

      {/* Lead Details Dialog */}
      <Dialog
        open={openLeadDialog}
        onClose={handleCloseLeadDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Lead Details
          <Chip
            label={selectedLead?.status}
            color={
              selectedLead?.status === "sold"
                ? "success"
                : selectedLead?.status === "flagged"
                  ? "error"
                  : "default"
            }
            sx={{ ml: 2 }}
          />
        </DialogTitle>
        <DialogContent>
          {selectedLead && (
            <>
              <Box sx={{ display: "flex", gap: 3, mb: 3 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    Seller Information
                  </Typography>
                  <List dense>
                    <ListItem>
                      <Person sx={{ mr: 1, color: "action.active" }} />
                      <ListItemText primary={selectedLead.seller.name} />
                    </ListItem>
                    {selectedLead.seller.email && (
                      <ListItem>
                        <Email sx={{ mr: 1, color: "action.active" }} />
                        <ListItemText primary={selectedLead.seller.email} />
                      </ListItem>
                    )}
                  </List>
                </Box>

                {selectedLead.buyer && (
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" gutterBottom>
                      Buyer Information
                    </Typography>
                    <List dense>
                      <ListItem>
                        <Person sx={{ mr: 1, color: "action.active" }} />
                        <ListItemText primary={selectedLead.buyer.name} />
                      </ListItem>
                      {selectedLead.buyer.email && (
                        <ListItem>
                          <Email sx={{ mr: 1, color: "action.active" }} />
                          <ListItemText primary={selectedLead.buyer.email} />
                        </ListItem>
                      )}
                    </List>
                  </Box>
                )}
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Lead Information
                </Typography>
                <List dense>
                  <ListItem>
                    <Business sx={{ mr: 1, color: "action.active" }} />
                    <ListItemText
                      primary="Source"
                      secondary={selectedLead.source}
                    />
                  </ListItem>
                  <ListItem>
                    <CalendarToday sx={{ mr: 1, color: "action.active" }} />
                    <ListItemText
                      primary="Created"
                      secondary={new Date(
                        selectedLead.createdAt,
                      ).toLocaleString()}
                    />
                  </ListItem>
                  <ListItem>
                    <CheckCircle sx={{ mr: 1, color: "action.active" }} />
                    <ListItemText
                      primary="Quality Score"
                      secondary={
                        <Tooltip
                          title={`AI Spam Score: ${(selectedLead.qualityScore / 10).toFixed(1)}/10\nQuality Level: ${selectedLead.qualityLevel}\n\nScore Range: 0-100 (Lower = Better Quality)\n\n0-40: High Quality (Clean, Legitimate)\n41-69: Medium Quality (Some Red Flags)\n70-100: Low Quality (Spam/Suspicious)`}
                        >
                          <Chip
                            label={`${(selectedLead.qualityScore / 10).toFixed(1)}/10`}
                            size="small"
                            color={
                              selectedLead.qualityScore <= 40
                                ? "success"
                                : selectedLead.qualityScore <= 70
                                  ? "warning"
                                  : "error"
                            }
                            component="span"
                          />
                        </Tooltip>
                      }
                    />
                  </ListItem>
                </List>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box>
                <Typography variant="h6" gutterBottom>
                  Lead Fields
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Field</TableCell>
                        <TableCell>Value</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedLead.fields.map((field, index) => (
                        <TableRow key={index}>
                          <TableCell>{field.label}</TableCell>
                          <TableCell>{field.value}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              if (selectedLead) {
                handleFlagContent(
                  "lead",
                  selectedLead.id,
                  selectedLead.status === "flagged",
                );
              }
            }}
            color={selectedLead?.status === "flagged" ? "success" : "warning"}
            startIcon={
              selectedLead?.status === "flagged" ? (
                <FlagOutlined />
              ) : (
                <Warning />
              )
            }
          >
            {selectedLead?.status === "flagged"
              ? "Remove Flag"
              : "Flag as Suspicious"}
          </Button>
          <Button onClick={handleCloseLeadDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Call Recording Dialog */}
      <Dialog
        open={openCallDialog}
        onClose={handleCloseCallDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Call Recording</DialogTitle>
        <DialogContent>
          {selectedCall?.recordingUrl ? (
            <Box sx={{ mt: 2 }}>
              <audio controls style={{ width: "100%" }}>
                <source src={selectedCall.recordingUrl} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1">Call Details</Typography>
                <Typography variant="body2">
                  From: {selectedCall.from}
                </Typography>
                <Typography variant="body2">To: {selectedCall.to}</Typography>
                <Typography variant="body2">
                  Duration: {selectedCall.duration} seconds
                </Typography>
                {selectedCall.feedback && (
                  <>
                    <Typography variant="body2">
                      Feedback:{" "}
                      {selectedCall.feedback.rating ? "Positive" : "Negative"}
                    </Typography>
                    {selectedCall.feedback.comment && (
                      <Typography variant="body2">
                        Comment: {selectedCall.feedback.comment}
                      </Typography>
                    )}
                  </>
                )}
              </Box>
            </Box>
          ) : (
            <Typography>No recording available for this call</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              if (selectedCall) {
                handleFlagContent(
                  "call",
                  selectedCall.id,
                  selectedCall.status === "flagged",
                );
              }
            }}
            color={selectedCall?.status === "flagged" ? "success" : "warning"}
            startIcon={
              selectedCall?.status === "flagged" ? (
                <FlagOutlined />
              ) : (
                <Warning />
              )
            }
          >
            {selectedCall?.status === "flagged"
              ? "Remove Flag"
              : "Flag as Suspicious"}
          </Button>
          <Button onClick={handleCloseCallDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ContentVerification;
