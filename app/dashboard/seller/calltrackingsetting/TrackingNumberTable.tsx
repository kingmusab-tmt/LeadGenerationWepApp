import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Checkbox,
  IconButton,
  Menu,
  MenuItem,
  Box,
  TextField,
  InputAdornment,
  Chip,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
  Alert,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import SearchIcon from "@mui/icons-material/Search";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import { TrackingNumber } from "@/types/trackingNumbers";

interface TrackingNumbersTableProps {
  numbers: TrackingNumber[];
  onRemoveNumber: (phoneNumber: string) => void;
  onEditNumber: (number: TrackingNumber) => void;
}

export default function TrackingNumbersTable({
  numbers,
  onRemoveNumber,
  onEditNumber,
}: TrackingNumbersTableProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedNumber, setSelectedNumber] = useState<TrackingNumber | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const [selectedNumbers, setSelectedNumbers] = useState<Set<string>>(
    new Set(),
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | string[] | null>(
    null,
  );
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({
    open: false,
    message: "",
  });

  // Filter numbers
  const filteredNumbers = useMemo(() => {
    const list = Array.isArray(numbers) ? numbers : [];
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(
      (n) =>
        n.phoneNumber.toLowerCase().includes(q) ||
        n.industry?.toLowerCase().includes(q) ||
        n.forwardingType?.toLowerCase().includes(q),
    );
  }, [numbers, search]);

  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    number: TrackingNumber,
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedNumber(number);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedNumber(null);
  };

  const handleEdit = () => {
    if (selectedNumber) {
      onEditNumber(selectedNumber);
      handleMenuClose();
    }
  };

  // Delete with confirmation
  const handleRemoveClick = () => {
    if (selectedNumber) {
      setDeleteTarget(selectedNumber.phoneNumber);
      setDeleteDialogOpen(true);
      handleMenuClose();
    }
  };

  const handleBulkDeleteClick = () => {
    if (selectedNumbers.size > 0) {
      setDeleteTarget(Array.from(selectedNumbers));
      setDeleteDialogOpen(true);
    }
  };

  const handleConfirmDelete = () => {
    if (deleteTarget) {
      if (Array.isArray(deleteTarget)) {
        deleteTarget.forEach((num) => onRemoveNumber(num));
        setSelectedNumbers(new Set());
      } else {
        onRemoveNumber(deleteTarget);
        setSelectedNumbers((prev) => {
          const next = new Set(prev);
          next.delete(deleteTarget);
          return next;
        });
      }
    }
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
  };

  // Copy to clipboard
  const handleCopy = (phoneNumber: string) => {
    navigator.clipboard.writeText(phoneNumber);
    setSnackbar({ open: true, message: `Copied ${phoneNumber}` });
  };

  // Bulk selection
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedNumbers(new Set(filteredNumbers.map((n) => n.phoneNumber)));
    } else {
      setSelectedNumbers(new Set());
    }
  };

  const handleSelectOne = (phoneNumber: string, checked: boolean) => {
    setSelectedNumbers((prev) => {
      const next = new Set(prev);
      if (checked) next.add(phoneNumber);
      else next.delete(phoneNumber);
      return next;
    });
  };

  const allSelected =
    filteredNumbers.length > 0 &&
    filteredNumbers.every((n) => selectedNumbers.has(n.phoneNumber));
  const someSelected =
    filteredNumbers.some((n) => selectedNumbers.has(n.phoneNumber)) &&
    !allSelected;

  // Determine status based on forwarding config
  const getStatus = (num: TrackingNumber) => {
    const hasForwarding =
      num.forwardingType === "direct" ||
      (num.forwardingType === "single_multiple" &&
        num.forwardingNumbers &&
        num.forwardingNumbers.length > 0) ||
      (num.forwardingType === "specific_lead" &&
        num.leadBuyers &&
        num.leadBuyers.length > 0);
    return hasForwarding;
  };

  return (
    <>
      {/* Toolbar */}
      <Box
        sx={{
          display: "flex",
          gap: 1.5,
          alignItems: "center",
          mb: 2,
          flexWrap: "wrap",
        }}
      >
        <TextField
          size="small"
          placeholder="Search numbers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 200, flex: "1 1 200px" }}
        />
        {selectedNumbers.size > 0 && (
          <Button
            size="small"
            color="error"
            variant="outlined"
            startIcon={<DeleteIcon />}
            onClick={handleBulkDeleteClick}
          >
            Remove {selectedNumbers.size} Selected
          </Button>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ ml: "auto" }}>
          {filteredNumbers.length} number
          {filteredNumbers.length !== 1 ? "s" : ""}
        </Typography>
      </Box>

      {filteredNumbers.length === 0 ? (
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ textAlign: "center", py: 4 }}
        >
          {search
            ? "No numbers match your search."
            : "No tracking numbers available."}
        </Typography>
      ) : (
        <Table size="small" sx={{ overflowX: "auto" }}>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  size="small"
                />
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Phone Number</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Industry</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Forwarding</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Response</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Record</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Reconnect</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Caller ID</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Whisper</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Message</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredNumbers.map((num) => {
              const isActive = getStatus(num);
              return (
                <TableRow
                  key={num.phoneNumber}
                  hover
                  selected={selectedNumbers.has(num.phoneNumber)}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedNumbers.has(num.phoneNumber)}
                      onChange={(e) =>
                        handleSelectOne(num.phoneNumber, e.target.checked)
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      <Typography
                        variant="body2"
                        sx={{ fontFamily: "monospace" }}
                      >
                        {num.phoneNumber}
                      </Typography>
                      <Tooltip title="Copy number">
                        <IconButton
                          size="small"
                          onClick={() => handleCopy(num.phoneNumber)}
                        >
                          <ContentCopyIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={isActive ? <CheckCircleIcon /> : <CancelIcon />}
                      label={isActive ? "Active" : "Not Configured"}
                      color={isActive ? "success" : "default"}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{num.industry || "—"}</TableCell>
                  <TableCell>
                    <Chip
                      label={
                        num.forwardingType === "direct"
                          ? "Direct"
                          : num.forwardingType === "single_multiple"
                            ? "Multiple"
                            : num.forwardingType === "specific_lead"
                              ? "Specific"
                              : num.forwardingType || "—"
                      }
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Checkbox
                      checked={num.requireResponse}
                      disabled
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Checkbox checked={num.recordCall} disabled size="small" />
                  </TableCell>
                  <TableCell>
                    <Checkbox
                      checked={num.reconnectCaller}
                      disabled
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Checkbox
                      checked={num.passCallerId}
                      disabled
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Checkbox
                      checked={!!num.callWhisper}
                      disabled
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Checkbox
                      checked={!!num.welcomeMessage}
                      disabled
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      onClick={(e) => handleMenuOpen(e, num)}
                      aria-label="actions"
                      size="small"
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>Edit</MenuItem>
        <MenuItem onClick={handleRemoveClick} sx={{ color: "error.main" }}>
          Remove
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Confirm Removal</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {Array.isArray(deleteTarget)
              ? `Are you sure you want to remove ${deleteTarget.length} tracking number${deleteTarget.length !== 1 ? "s" : ""}? This action cannot be undone.`
              : `Are you sure you want to remove ${deleteTarget}? This will release the number and stop all call forwarding.`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>

      {/* Copy Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={2000}
        onClose={() => setSnackbar({ open: false, message: "" })}
      >
        <Alert
          severity="success"
          onClose={() => setSnackbar({ open: false, message: "" })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
