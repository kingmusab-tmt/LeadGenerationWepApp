import React, { useState } from "react";
import {
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  IconButton,
  Box,
  TablePagination,
  useMediaQuery,
  useTheme,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Select,
  FormControl,
  InputLabel,
  Chip,
} from "@mui/material";
import {
  Edit,
  Delete,
  Favorite,
  FavoriteBorder,
  FileDownload,
  FileUpload,
  Add,
  MoreVert,
  ArrowUpward,
  ArrowDownward,
  FilterList,
} from "@mui/icons-material";

interface Lead {
  _id: string;
  userId: string;
  fields: Array<{ id: string; label: string; value: string }>;
  createdAt: string;
  status: "new" | "available" | "sold" | "assigned";
  distributionMethod: "manual" | "round_robin" | "marketplace";
  exclusive: boolean;
  shared: boolean;
  shareNumber: number;
  unit: number;
  isManual: boolean;
}

interface LeadListProps {
  leads: Lead[];
  onDeleteLead: (leadId: string) => void;
  onToggleFavorite: (leadId: string) => void;
  onEditLead: (lead: Lead) => void;
  onExportCSV: () => void;
  handleOpenDialog: () => void;
  onImportCSV: (event: React.ChangeEvent<HTMLInputElement>) => void;
  fieldLabels: string[];
}

const statusColors = {
  new: "primary",
  available: "success",
  sold: "warning",
  assigned: "info",
} as const;

const LeadList: React.FC<LeadListProps> = ({
  leads,
  onDeleteLead,
  onToggleFavorite,
  onEditLead,
  onExportCSV,
  onImportCSV,
  handleOpenDialog,
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [viewDetailsModalOpen, setViewDetailsModalOpen] = useState(false);
  const [nameSort, setNameSort] = useState<"asc" | "desc" | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleMenuClick = (
    event: React.MouseEvent<HTMLElement>,
    lead: Lead
  ) => {
    //("Menu Clicked - Selected Lead:", lead);
    setAnchorEl(event.currentTarget);
    setSelectedLead(lead);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleViewDetails = () => {
    if (!selectedLead || !selectedLead.fields) {
      return;
    }
    setViewDetailsModalOpen(true);
  };

  const handleCloseViewDetailsModal = () => {
    setViewDetailsModalOpen(false);
  };

  const getNameField = (fields: Array<{ label: string; value: string }>) => {
    const nameRegex = /name|full name|first name|last name/i;
    const field = fields.find((f) => nameRegex.test(f.label));
    return field ? field.value : "—";
  };

  const getNumberField = (fields: Array<{ label: string; value: string }>) => {
    const numberRegex = /mobile|phone|number|contact/i;
    const field = fields.find((f) => numberRegex.test(f.label));
    return field ? field.value : "—";
  };

  const getEmailField = (fields: Array<{ label: string; value: string }>) => {
    const emailRegex = /email|e-mail/i;
    const field = fields.find((f) => emailRegex.test(f.label));
    return field ? field.value : "—";
  };

  const toggleNameSort = () => {
    setNameSort(nameSort === "asc" ? "desc" : "asc");
  };

  const handleStatusFilterChange = (event: any) => {
    setStatusFilter(event.target.value);
    setPage(0);
  };

  const filteredLeads = leads.filter(
    (lead) => statusFilter === "all" || lead.status === statusFilter
  );

  const sortedLeads = [...filteredLeads].sort((a, b) => {
    if (!nameSort) return 0;

    const nameA = getNameField(a.fields).toLowerCase();
    const nameB = getNameField(b.fields).toLowerCase();

    if (nameSort === "asc") {
      return nameA.localeCompare(nameB);
    } else {
      return nameB.localeCompare(nameA);
    }
  });

  const displayedLeads = sortedLeads.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Container
      sx={{
        width: isMobile ? "95vw" : "100vw",
        mt: isMobile ? "4rem" : "6rem",
      }}
    >
      <Typography variant="h5" gutterBottom sx={{ mb: 4 }}>
        Lead Management
      </Typography>

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 2,
          flexDirection: isMobile ? "column" : "row",
          gap: isMobile ? 2 : 0,
        }}
      >
        {/* <Button
          variant="contained"
          color="primary"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
          fullWidth={isMobile}
        >
          Add Lead
        </Button> */}
        <Button
          variant="contained"
          color="primary"
          startIcon={<FileDownload />}
          onClick={onExportCSV}
          fullWidth={isMobile}
        >
          Export CSV
        </Button>
        <input
          type="file"
          accept=".csv"
          onChange={onImportCSV}
          style={{ display: "none" }}
          id="csv-upload"
        />
        <label htmlFor="csv-upload">
          <Button
            variant="contained"
            color="info"
            startIcon={<FileUpload />}
            component="span"
            fullWidth={isMobile}
          >
            Import CSV
          </Button>
        </label>
      </Box>

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 2,
          flexDirection: isMobile ? "column" : "row",
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <FilterList color="action" />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={handleStatusFilterChange}
              label="Status"
            >
              <MenuItem value="all">All Statuses</MenuItem>
              <MenuItem value="new">New</MenuItem>
              <MenuItem value="available">Available</MenuItem>
              <MenuItem value="sold">Sold</MenuItem>
              <MenuItem value="assigned">Assigned</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      <Box
        sx={{
          width: "100%",
          overflowX: "auto",
          maxHeight: "60vh",
          overflowY: "auto",
        }}
      >
        <TableContainer component={Paper}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      cursor: "pointer",
                    }}
                    onClick={toggleNameSort}
                  >
                    Name
                    {nameSort === "asc" && <ArrowUpward fontSize="small" />}
                    {nameSort === "desc" && <ArrowDownward fontSize="small" />}
                  </Box>
                </TableCell>
                <TableCell>Number</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Exclusive</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayedLeads.map((lead) => (
                <TableRow key={lead._id}>
                  <TableCell>{getNameField(lead.fields)}</TableCell>
                  <TableCell>{getNumberField(lead.fields)}</TableCell>
                  <TableCell>{getEmailField(lead.fields)}</TableCell>
                  <TableCell>
                    <Chip
                      label={lead.status}
                      color={statusColors[lead.status]}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton onClick={() => onToggleFavorite(lead._id)}>
                      {lead.exclusive ? (
                        <Favorite color="error" />
                      ) : (
                        <FavoriteBorder />
                      )}
                    </IconButton>
                  </TableCell>
                  <TableCell>
                    <IconButton
                      aria-label="more"
                      aria-controls="lead-menu"
                      aria-haspopup="true"
                      onClick={(e) => handleMenuClick(e, lead)}
                    >
                      <MoreVert />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={filteredLeads.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />

      <Menu
        id="lead-menu"
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => {
            if (selectedLead) onEditLead(selectedLead);
            handleMenuClose();
          }}
        >
          <Edit />
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedLead) onDeleteLead(selectedLead._id);
            handleMenuClose();
          }}
        >
          <Delete />
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedLead) {
              handleViewDetails();
              handleMenuClose();
            }
          }}
        >
          View
        </MenuItem>
      </Menu>

      <Dialog
        open={viewDetailsModalOpen}
        onClose={handleCloseViewDetailsModal}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Lead Details</DialogTitle>
        <DialogContent>
          {selectedLead ? (
            <>
              <DialogContentText>
                <strong>Status:</strong>{" "}
                <Chip
                  label={selectedLead.status}
                  color={statusColors[selectedLead.status]}
                  size="small"
                />
              </DialogContentText>
              {selectedLead.fields.map((field) => (
                <DialogContentText key={field.id}>
                  <strong>{field.label}:</strong> {field.value}
                </DialogContentText>
              ))}
            </>
          ) : (
            <DialogContentText>No details available.</DialogContentText>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseViewDetailsModal} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default LeadList;
