import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Skeleton,
  Snackbar,
  Button,
  Modal,
  Alert,
  Chip,
  SelectChangeEvent,
} from "@mui/material";
import { MoreVert } from "@mui/icons-material";
import axios from "axios";

interface LeadPurchaseHistoryProps {
  id: string;
}

interface Transaction {
  _id: string;
  type: string;
  amount: number;
  previousBalance: number;
  currentBalance: number;
  currency?: string;
  status: string;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  lead_purchase: "Lead Purchase",
  call_purchase: "Call Purchase",
  units_purchase: "Units Purchase",
  refund: "Refund",
  admin_adjustment: "Admin Adjustment",
};

function formatCurrency(amount: number, currency?: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: (currency || "USD").toUpperCase(),
    }).format(amount);
  } catch {
    // Intl throws on an unrecognized currency code — fall back rather than crash.
    return `${amount} ${currency || ""}`.trim();
  }
}

function statusColor(
  status: string,
): "success" | "warning" | "error" | "default" {
  switch (status?.toLowerCase()) {
    case "completed":
      return "success";
    case "pending":
      return "warning";
    case "failed":
      return "error";
    case "refunded":
      return "warning";
    default:
      return "default";
  }
}

const LeadPurchaseHistory: React.FC<LeadPurchaseHistoryProps> = ({ id }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0); // 0-based, matches TablePagination
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<
    "success" | "error" | "info"
  >("info");
  const [filterType, setFilterType] = useState("all");
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const showSnackbar = useCallback(
    (message: string, severity: "success" | "error" | "info") => {
      setSnackbarMessage(message);
      setSnackbarSeverity(severity);
      setSnackbarOpen(true);
    },
    [],
  );

  // Paginated + filtered server-side (see GET /api/payments/transactions) —
  // previously this fetched every transaction for the buyer unbounded and
  // filtered by type entirely client-side.
  useEffect(() => {
    let cancelled = false;

    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          buyerId: id,
          page: String(page + 1),
          limit: String(rowsPerPage),
        });
        if (filterType !== "all") params.set("type", filterType);

        const response = await axios.get(
          `/api/payments/transactions?${params.toString()}`,
        );

        if (cancelled) return;

        const data = response.data?.data;
        if (data && Array.isArray(data.transactions)) {
          setTransactions(data.transactions);
          setTotal(data.pagination?.total ?? data.transactions.length);
          setLoadError(null);
        } else {
          console.error("Unexpected API response structure:", response.data);
          setLoadError("Failed to load transaction history.");
          showSnackbar(
            "Failed to fetch transactions: Invalid data format",
            "error",
          );
        }
      } catch (error) {
        if (cancelled) return;
        console.error("Error fetching transactions:", error);
        // Previously a fetch error left transactions as [], which rendered
        // identically to "this buyer genuinely has zero purchases" once the
        // snackbar auto-hid — no persistent indicator that anything failed.
        setLoadError("Couldn't load transaction history. Please try again.");
        showSnackbar("Error fetching transactions", "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTransactions();
    return () => {
      cancelled = true;
    };
  }, [id, page, rowsPerPage, filterType, showSnackbar]);

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  const handleFilterChange = (event: SelectChangeEvent<string>) => {
    setFilterType(event.target.value as string);
    setPage(0);
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleMenuClick = (
    _event: React.MouseEvent<HTMLButtonElement>,
    transaction: Transaction,
  ) => {
    setSelectedTransaction(transaction);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  if (loading && transactions.length === 0) {
    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Previous Balance</TableCell>
              <TableCell>Current Balance</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Skeleton variant="text" width="80%" />
                </TableCell>
                <TableCell>
                  <Skeleton variant="text" width="60%" />
                </TableCell>
                <TableCell>
                  <Skeleton variant="text" width="70%" />
                </TableCell>
                <TableCell>
                  <Skeleton variant="text" width="70%" />
                </TableCell>
                <TableCell>
                  <Skeleton variant="text" width="50%" />
                </TableCell>
                <TableCell>
                  <Skeleton variant="rectangular" width={40} height={30} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  if (loadError) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {loadError}
      </Alert>
    );
  }

  if (total === 0) {
    return (
      <Typography variant="body1" align="center" sx={{ mt: 10 }}>
        No transactions available.
      </Typography>
    );
  }

  return (
    <Box>
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Filter by Type</InputLabel>
        <Select
          value={filterType}
          onChange={handleFilterChange}
          label="Filter by Type"
        >
          <MenuItem value="all">All</MenuItem>
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Previous Balance</TableCell>
              <TableCell>Current Balance</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow key={transaction._id}>
                <TableCell>
                  {new Date(transaction.createdAt).toLocaleString()}
                </TableCell>
                <TableCell>
                  {TYPE_LABELS[transaction.type] || transaction.type}
                </TableCell>
                <TableCell>{transaction.previousBalance} units</TableCell>
                <TableCell>{transaction.currentBalance} units</TableCell>
                <TableCell>
                  <Chip
                    label={transaction.status}
                    size="small"
                    color={statusColor(transaction.status)}
                    variant="outlined"
                    sx={{ textTransform: "capitalize" }}
                  />
                </TableCell>
                <TableCell>
                  <IconButton
                    onClick={(e) => handleMenuClick(e, transaction)}
                    aria-label="View transaction details"
                  >
                    <MoreVert />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50]}
        />
      </TableContainer>

      <Modal open={modalOpen} onClose={handleCloseModal}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: { xs: "90%", sm: 450 },
            maxHeight: "80vh",
            overflow: "auto",
            p: 4,
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 24,
          }}
        >
          <Typography variant="h6" gutterBottom>
            Transaction Details
          </Typography>
          {selectedTransaction && (
            <div>
              <Typography>
                <strong>ID:</strong> {selectedTransaction._id}
              </Typography>
              <Typography>
                <strong>Type:</strong>{" "}
                {TYPE_LABELS[selectedTransaction.type] ||
                  selectedTransaction.type}
              </Typography>
              <Typography>
                <strong>Amount:</strong>{" "}
                {formatCurrency(
                  selectedTransaction.amount,
                  selectedTransaction.currency,
                )}
              </Typography>
              <Typography>
                <strong>Previous Balance:</strong>{" "}
                {selectedTransaction.previousBalance} units
              </Typography>
              <Typography>
                <strong>Current Balance:</strong>{" "}
                {selectedTransaction.currentBalance} units
              </Typography>
              <Typography>
                <strong>Status:</strong> {selectedTransaction.status}
              </Typography>
              <Typography>
                <strong>Date:</strong>{" "}
                {new Date(selectedTransaction.createdAt).toLocaleString()}
              </Typography>
            </div>
          )}
          <Button
            variant="contained"
            color="primary"
            onClick={handleCloseModal}
            sx={{ mt: 2 }}
          >
            Close
          </Button>
        </Box>
      </Modal>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default LeadPurchaseHistory;
