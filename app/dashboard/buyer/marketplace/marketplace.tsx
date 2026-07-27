"use client";
import React, { useEffect, useState } from "react";
import axios from "@/lib/axiosInstance";
import {
  Paper,
  Typography,
  Button,
  Select,
  MenuItem,
  Pagination,
  Modal,
  Box,
  SelectChangeEvent,
  Snackbar,
  Alert,
  IconButton,
  Menu,
  Tabs,
  Tab,
  Card,
  CardContent,
  Chip,
  Divider,
  Badge,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Grid,
  CircularProgress,
} from "@mui/material";
import { Container } from "@mui/material";
import {
  Download,
  MoreVert,
  Visibility,
  ShoppingCart,
  Person,
} from "@mui/icons-material";
import { MarketplaceLead as Lead } from "@/types/lead";

const BuyerLeads: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortOrder, setSortOrder] = useState<
    | "newest-purchased"
    | "oldest-purchased"
    | "newest-available"
    | "oldest-available"
  >("newest-available");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<
    "success" | "error" | "info"
  >("info");
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"available" | "purchased">(
    "available",
  );
  const [totalLeads, setTotalLeads] = useState(0);

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        setLoading(true);
        const response = await axios.get("/api/buyers/fetchleadforbuyer", {
          params: {
            sort: sortOrder,
            page,
            limit: rowsPerPage,
            status: activeTab === "purchased" ? "sold" : "available",
          },
        });
        setLeads(response.data.data);
        setTotalLeads(response.data.pagination.total);
      } catch (error) {
        console.error("Error fetching leads:", error);
        showSnackbar("Error fetching leads", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, [page, rowsPerPage, sortOrder, activeTab]);

  const handlePurchase = async (leadId: string, unitCost: number) => {
    setPurchaseLoading(true);
    try {
      const response = await axios.post("/api/buyers/buyerpurchaselead", {
        leadId,
        unitCost,
      });
      showSnackbar(response.data.message, "success");
      // Refresh the leads after purchase
      const refreshedResponse = await axios.get(
        "/api/buyers/fetchleadforbuyer",
        {
          params: {
            sort: sortOrder,
            page,
            limit: rowsPerPage,
            status: "available",
          },
        },
      );
      setLeads(refreshedResponse.data.data);
      setTotalLeads(refreshedResponse.data.pagination.total);
    } catch (error: unknown) {
      console.error("Error purchasing lead:", error);
      // The API's error helper responds with { error: "..." }, not
      // { message: "..." } — this previously only ever checked .message,
      // so every real reason (insufficient balance, lead no longer
      // available, etc.) silently fell through to the generic fallback.
      const responseData =
        typeof error === "object" && error !== null && "response" in error
          ? (
              error as {
                response?: { data?: { error?: string; message?: string } };
              }
            ).response?.data
          : undefined;
      const errorMessage =
        responseData?.error || responseData?.message || "Failed to purchase lead.";
      showSnackbar(errorMessage, "error");
    } finally {
      setPurchaseLoading(false);
    }
  };

  const handleViewDetails = (lead: Lead) => {
    setSelectedLead(lead);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedLead(null);
  };

  const handleChangePage = (
    event: React.ChangeEvent<unknown>,
    newPage: number,
  ) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: SelectChangeEvent<number>) => {
    setRowsPerPage(Number(event.target.value));
    setPage(1);
  };

  const handleSortChange = (
    event: SelectChangeEvent<
      | "newest-purchased"
      | "oldest-purchased"
      | "newest-available"
      | "oldest-available"
    >,
  ) => {
    setSortOrder(
      event.target.value as
        | "newest-purchased"
        | "oldest-purchased"
        | "newest-available"
        | "oldest-available",
    );
    setPage(1);
  };

  const showSnackbar = (
    message: string,
    severity: "success" | "error" | "info",
  ) => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  const handleDownloadLead = (lead: Lead) => {
    let leadData = "";

    lead.fields.forEach((field) => {
      if (typeof field.value === "string") {
        leadData += `${field.label}: ${field.value}\n`;
      } else {
        Object.entries(field.value).forEach(([key, value]) => {
          leadData += `${key}: ${value}\n`;
        });
      }
    });

    const blob = new Blob([leadData], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `lead-${lead._id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleMenuClick = (
    event: React.MouseEvent<HTMLElement>,
    leadId: string,
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedLeadId(leadId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedLeadId(null);
  };

  const handleTabChange = (
    event: React.SyntheticEvent,
    newValue: "available" | "purchased",
  ) => {
    setActiveTab(newValue);
    setPage(1);
  };

  const renderFieldValue = (field: {
    id: string;
    label: string;
    value: string | Record<string, string>;
  }) => {
    if (typeof field.value === "string") {
      return (
        <div key={field.id}>
          <strong>{field.label}:</strong>{" "}
          {typeof field.value === "string"
            ? field.value
            : JSON.stringify(field.value)}
        </div>
      );
    } else {
      return Object.entries(field.value).map(([key, value]) => (
        <div key={`${field.id}-${key}`}>
          <strong>{key}:</strong> {value}
        </div>
      ));
    }
  };

  const getPrimaryFields = (lead: Lead) => {
    // Find name, email, phone fields if they exist
    const nameField = lead.fields.find(
      (f) =>
        f.label.toLowerCase().includes("name") ||
        f.id.toLowerCase().includes("name"),
    );
    const emailField = lead.fields.find(
      (f) =>
        f.label.toLowerCase().includes("email") ||
        f.id.toLowerCase().includes("email"),
    );
    const phoneField = lead.fields.find(
      (f) =>
        f.label.toLowerCase().includes("phone") ||
        f.id.toLowerCase().includes("phone"),
    );

    return {
      name: nameField
        ? typeof nameField.value === "string"
          ? nameField.value
          : ""
        : "",
      email: emailField
        ? typeof emailField.value === "string"
          ? emailField.value
          : ""
        : "",
      phone: phoneField
        ? typeof phoneField.value === "string"
          ? phoneField.value
          : ""
        : "",
    };
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container sx={{ mt: 8, mb: 4 }}>
      <Typography
        variant="h5"
        gutterBottom
        sx={{ fontWeight: "bold", mb: 3, color: "primary.main" }}
      >
        Lead Marketplace
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="lead tabs"
        >
          <Tab
            label={
              <Badge badgeContent={totalLeads} color="primary" showZero>
                Available Leads
              </Badge>
            }
            value="available"
          />
          <Tab label="Purchased Leads" value="purchased" />
        </Tabs>
      </Box>

      {/* Filters and Pagination Controls */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          mb: 2,
          alignItems: "center",
        }}
      >
        <Select
          value={sortOrder}
          onChange={handleSortChange}
          size="small"
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="newest-purchased">Newly Purchased</MenuItem>
          <MenuItem value="oldest-purchased">Oldest Purchased</MenuItem>
          <MenuItem value="newest-available">Newest Available</MenuItem>
          <MenuItem value="oldest-available">Oldest Available</MenuItem>
        </Select>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography variant="body2">Show:</Typography>
          <Select
            value={rowsPerPage}
            onChange={handleChangeRowsPerPage}
            size="small"
            sx={{ minWidth: 100 }}
          >
            <MenuItem value={5}>5 per page</MenuItem>
            <MenuItem value={10}>10 per page</MenuItem>
            <MenuItem value={20}>20 per page</MenuItem>
            <MenuItem value={50}>50 per page</MenuItem>
          </Select>
        </Box>
      </Box>

      {activeTab === "available" ? (
        <Grid container spacing={3}>
          {leads
            .filter((lead) => lead.status === "available")
            .map((lead) => {
              const primaryFields = getPrimaryFields(lead);
              return (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={lead._id}>
                  <Card
                    sx={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <CardContent>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          mb: 1,
                        }}
                      >
                        <Typography variant="h6" component="div">
                          {primaryFields.name || "Lead #" + lead._id.slice(-4)}
                        </Typography>
                        <Chip
                          label={`${lead.unit} units`}
                          color="primary"
                          size="small"
                        />
                      </Box>

                      {/* Dynamically render first 3 fields (excluding name) */}
                      {lead.fields
                        .filter(
                          (field) =>
                            !field.label.toLowerCase().includes("name") &&
                            typeof field.value === "string",
                        )
                        .slice(0, 3)
                        .map((field) => (
                          <Typography
                            key={field.id}
                            variant="body2"
                            color="text.secondary"
                            sx={{ mb: 1 }}
                          >
                            <strong>{field.label}:</strong>{" "}
                            {typeof field.value === "string"
                              ? field.value
                              : JSON.stringify(field.value)}
                          </Typography>
                        ))}

                      <Divider sx={{ my: 1 }} />

                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 1,
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          Posted:{" "}
                          {new Date(lead.createdAt).toLocaleDateString()}
                        </Typography>
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<Visibility />}
                            onClick={() => handleViewDetails(lead)}
                          >
                            Details
                          </Button>
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<ShoppingCart />}
                            onClick={() => handlePurchase(lead._id, lead.unit)}
                            disabled={purchaseLoading}
                          >
                            {purchaseLoading ? (
                              <CircularProgress size={24} color="inherit" />
                            ) : (
                              "Purchase"
                            )}
                          </Button>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
        </Grid>
      ) : (
        <List>
          {leads
            .filter((lead) => lead.status === "sold")
            .map((lead) => {
              const primaryFields = getPrimaryFields(lead);
              return (
                <Paper key={lead._id} sx={{ mb: 2 }}>
                  <ListItem
                    secondaryAction={
                      <IconButton
                        edge="end"
                        onClick={(e) => handleMenuClick(e, lead._id)}
                      >
                        <MoreVert />
                      </IconButton>
                    }
                  >
                    <ListItemAvatar>
                      <Avatar>
                        <Person />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        primaryFields.name || "Lead #" + lead._id.slice(-4)
                      }
                      secondary={
                        <>
                          <Box component="span" sx={{ display: "block" }}>
                            Purchased:{" "}
                            {new Date(
                              lead.soldTo?.[0]?.createdAt || lead.createdAt,
                            ).toLocaleString()}
                          </Box>
                          <Box component="span" sx={{ display: "block" }}>
                            Cost: {lead.unit} units
                          </Box>
                        </>
                      }
                    />
                  </ListItem>

                  <Menu
                    anchorEl={anchorEl}
                    open={selectedLeadId === lead._id}
                    onClose={handleMenuClose}
                  >
                    <MenuItem
                      onClick={() => {
                        handleViewDetails(lead);
                        handleMenuClose();
                      }}
                      sx={{ display: "flex", alignItems: "center", gap: 1 }}
                    >
                      <Visibility fontSize="small" /> View Details
                    </MenuItem>
                    <MenuItem
                      onClick={() => {
                        handleDownloadLead(lead);
                        handleMenuClose();
                      }}
                      sx={{ display: "flex", alignItems: "center", gap: 1 }}
                    >
                      <Download fontSize="small" /> Download
                    </MenuItem>
                  </Menu>
                </Paper>
              );
            })}
        </List>
      )}

      {/* Pagination */}
      {leads.length > 0 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
          <Pagination
            count={Math.ceil(totalLeads / rowsPerPage)}
            page={page}
            onChange={handleChangePage}
            color="primary"
            showFirstButton
            showLastButton
          />
        </Box>
      )}

      {/* Modal for Viewing Details */}
      <Modal open={modalOpen} onClose={handleCloseModal}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: { xs: "90%", sm: "80%", md: "600px" },
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 3,
            borderRadius: 2,
            maxHeight: "90vh",
            overflowY: "auto",
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ fontWeight: "bold" }}>
            Lead Details
          </Typography>

          {selectedLead && (
            <>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                {selectedLead.fields
                  .filter(
                    (field) =>
                      // For available leads: hide email, phone, address fields until purchased
                      selectedLead.status === "sold" ||
                      ![
                        "email",
                        "phone",
                        "address",
                        "postcode",
                        "city",
                        "state",
                      ].some((forbidden) =>
                        field.label.toLowerCase().includes(forbidden),
                      ),
                  )
                  .map((field) => (
                    <Grid size={{ xs: 12, sm: 6 }} key={field.id}>
                      {renderFieldValue(field)}
                    </Grid>
                  ))}
              </Grid>

              {/* Show locked message for contact info on available leads */}
              {selectedLead.status === "available" && (
                <Box
                  sx={{
                    backgroundColor: "#fff3cd",
                    border: "1px solid #ffc107",
                    borderRadius: 1,
                    p: 2,
                    mb: 2,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    🔒 <strong>Contact information is hidden</strong> until you
                    purchase this lead. Purchase to see full details including
                    email, phone, and address.
                  </Typography>
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              <Box
                sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                  component="div"
                >
                  <strong>Status:</strong>{" "}
                  <Chip
                    label={selectedLead.status}
                    size="small"
                    color={
                      selectedLead.status === "available"
                        ? "primary"
                        : "success"
                    }
                    sx={{ ml: 1 }}
                  />
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Created:</strong>{" "}
                  {new Date(selectedLead.createdAt).toLocaleString()}
                </Typography>
              </Box>
            </>
          )}

          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
            <Button
              variant="contained"
              onClick={handleCloseModal}
              sx={{ minWidth: 100 }}
            >
              Close
            </Button>
          </Box>
        </Box>
      </Modal>

      {/* Snackbar for Notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbarSeverity}
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default BuyerLeads;
