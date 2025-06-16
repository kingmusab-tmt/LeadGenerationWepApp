"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
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
} from "@mui/icons-material";
import AdminDashboard from "../../layout";
import LoadingComponent from "@/app/components/generalComponent/loadingcomponent";

interface Lead {
  id: string;
  status: "new" | "available" | "sold" | "assigned" | "flagged";
  qualityScore: number;
  source: string;
  createdAt: string;
  seller: {
    id: string;
    name: string;
    email?: string;
  };
  buyer?: {
    id: string;
    name: string;
    email?: string;
  };
  fields: {
    label: string;
    value: string;
  }[];
}

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
  const { data: session } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [leadPage, setLeadPage] = useState(0);
  const [callPage, setCallPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [openCallDialog, setOpenCallDialog] = useState(false);
  const [openLeadDialog, setOpenLeadDialog] = useState(false);

  useEffect(() => {
    if (!session || session.user.role !== "admin") {
      router.push("/auth/sign-in");
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const [leadsRes, callsRes] = await Promise.all([
          fetch("/api/adminapi/leads"),
          fetch("/api/adminapi/calls"),
        ]);

        const leadsData = await leadsRes.json();
        const callsData = await callsRes.json();

        setLeads(leadsData.leads);
        setCalls(callsData.calls);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session]);

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
    event: React.ChangeEvent<HTMLInputElement>
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

  const handleOpenLeadDialog = (lead: Lead) => {
    setSelectedLead(lead);
    setOpenLeadDialog(true);
  };

  const handleCloseLeadDialog = () => {
    setOpenLeadDialog(false);
  };

  const handleFlagContent = async (type: "lead" | "call", id: string) => {
    try {
      await fetch(`/api/admin/${type}s/${id}/flag`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ flagged: true }),
      });

      if (type === "lead") {
        setLeads(
          leads.map((lead) =>
            lead.id === id ? { ...lead, status: "flagged" } : lead
          )
        );
        if (selectedLead?.id === id) {
          setSelectedLead({ ...selectedLead, status: "flagged" });
        }
      } else {
        setCalls(
          calls.map((call) =>
            call.id === id ? { ...call, status: "flagged" } : call
          )
        );
        if (selectedCall?.id === id) {
          setSelectedCall({ ...selectedCall, status: "flagged" });
        }
      }
    } catch (error) {
      console.error(`Failed to flag ${type}:`, error);
    }
  };

  const filteredLeads = leads.filter(
    (lead) =>
      lead.seller.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.fields.some((f) =>
        f.value.toLowerCase().includes(searchTerm.toLowerCase())
      )
  );

  const filteredCalls = calls.filter(
    (call) =>
      call.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.to.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.buyer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.seller?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedLeads = filteredLeads.slice(
    leadPage * rowsPerPage,
    leadPage * rowsPerPage + rowsPerPage
  );

  const paginatedCalls = filteredCalls.slice(
    callPage * rowsPerPage,
    callPage * rowsPerPage + rowsPerPage
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
        <LoadingComponent />
      </Box>
    );
  }

  return (
    <AdminDashboard>
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
              InputProps={{
                startAdornment: (
                  <Search sx={{ mr: 1, color: "action.active" }} />
                ),
              }}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Tooltip title="Refresh">
              <IconButton onClick={() => window.location.reload()}>
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
                        <Chip
                          label={`${lead.qualityScore}/10`}
                          size="small"
                          color={
                            lead.qualityScore >= 8
                              ? "success"
                              : lead.qualityScore >= 5
                              ? "warning"
                              : "error"
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Tooltip title="View Details">
                          <IconButton
                            onClick={() => handleOpenLeadDialog(lead)}
                          >
                            <Description fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Flag as Suspicious">
                          <IconButton
                            onClick={() => handleFlagContent("lead", lead.id)}
                          >
                            <Warning color="warning" fontSize="small" />
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
                        <Tooltip title="Flag as Suspicious">
                          <IconButton
                            onClick={() => handleFlagContent("call", call.id)}
                          >
                            <Warning color="warning" fontSize="small" />
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
                          selectedLead.createdAt
                        ).toLocaleString()}
                      />
                    </ListItem>
                    <ListItem>
                      <CheckCircle sx={{ mr: 1, color: "action.active" }} />
                      <ListItemText
                        primary="Quality Score"
                        secondary={
                          <Chip
                            label={`${selectedLead.qualityScore}/10`}
                            size="small"
                            color={
                              selectedLead.qualityScore >= 8
                                ? "success"
                                : selectedLead.qualityScore >= 5
                                ? "warning"
                                : "error"
                            }
                          />
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
                  handleFlagContent("lead", selectedLead.id);
                }
              }}
              color="warning"
              startIcon={<Warning />}
            >
              Flag as Suspicious
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
                  handleFlagContent("call", selectedCall.id);
                }
              }}
              color="warning"
              startIcon={<Warning />}
            >
              Flag as Suspicious
            </Button>
            <Button onClick={handleCloseCallDialog}>Close</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </AdminDashboard>
  );
};

export default ContentVerification;
