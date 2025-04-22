"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Skeleton,
  Button,
  useMediaQuery,
  Theme,
  IconButton,
  Menu,
  MenuItem,
  Snackbar,
  Alert,
  Modal,
  Box,
  Select,
  FormControl,
  InputLabel,
  SelectChangeEvent,
} from "@mui/material";
import { Download, MoreVert, Visibility } from "@mui/icons-material";
import { Container } from "@mui/material";

interface Transaction {
  _id: string;
  type: string;
  amount: number;
  previousBalance: number;
  currentBalance: number;
  status: string;
  createdAt: string;
  metadata: {
    leadId?: string;
    unitsPurchased?: number;
    sellerId?: string;
    buyerId?: string;
    refund?: boolean;
    payoutId?: string;
    refundReason?: string;
    adminNote?: string;
    subscriptionId?: string;
    subscriptionPlan?: string;
    subscriptionDuration?: string;
  };
}

const TransactionHistory: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<
    Transaction[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<
    "success" | "error" | "info"
  >("info");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const isMobile = useMediaQuery((theme: Theme) =>
    theme.breakpoints.down("sm")
  );

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await axios.get("/api/transactions");

        // Log the response to debug
        console.log("API Response:", response);

        // Ensure the response has the expected structure
        if (response.data && Array.isArray(response.data.data)) {
          setTransactions(response.data.data);
          setFilteredTransactions(response.data.data); // Initialize filtered transactions
        } else {
          console.error("Unexpected API response structure:", response.data);
          showSnackbar(
            "Failed to fetch transactions: Invalid data format",
            "error"
          );
        }
      } catch (error) {
        console.error("Error fetching transactions:", error);
        showSnackbar("Error fetching transactions", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  useEffect(() => {
    // Filter transactions based on the selected type
    if (filterType === "all") {
      setFilteredTransactions(transactions);
    } else {
      setFilteredTransactions(
        transactions.filter((transaction) => transaction.type === filterType)
      );
    }
  }, [filterType, transactions]);

  const showSnackbar = (
    message: string,
    severity: "success" | "error" | "info"
  ) => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  const handleMenuClick = (
    event: React.MouseEvent<HTMLElement>,
    transaction: Transaction
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedTransaction(transaction);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedTransaction(null);
  };

  const handleViewDetails = () => {
    if (selectedTransaction) {
      setModalOpen(true);
    }
    handleMenuClose();
  };

  const handleDownload = () => {
    if (selectedTransaction) {
      // Create a string with all transaction details
      const transactionDetails = `
        Transaction ID: ${selectedTransaction._id}
        Type: ${selectedTransaction.type}
        Amount: ${selectedTransaction.amount}
        Previous Balance: ${selectedTransaction.previousBalance}
        Current Balance: ${selectedTransaction.currentBalance}
        Status: ${selectedTransaction.status}
        Date: ${new Date(selectedTransaction.createdAt).toLocaleString()}
        Metadata:
          Lead ID: ${selectedTransaction.metadata.leadId || "N/A"}
          Units Purchased: ${
            selectedTransaction.metadata.unitsPurchased || "N/A"
          }
          Seller ID: ${selectedTransaction.metadata.sellerId || "N/A"}
          Buyer ID: ${selectedTransaction.metadata.buyerId || "N/A"}
          Refund: ${selectedTransaction.metadata.refund || "N/A"}
          Payout ID: ${selectedTransaction.metadata.payoutId || "N/A"}
          Refund Reason: ${selectedTransaction.metadata.refundReason || "N/A"}
          Admin Note: ${selectedTransaction.metadata.adminNote || "N/A"}
          Subscription ID: ${
            selectedTransaction.metadata.subscriptionId || "N/A"
          }
          Subscription Plan: ${
            selectedTransaction.metadata.subscriptionPlan || "N/A"
          }
          Subscription Duration: ${
            selectedTransaction.metadata.subscriptionDuration || "N/A"
          }
      `;
      const blob = new Blob([transactionDetails], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `transaction-${selectedTransaction._id}.txt`;
      link.click();
      URL.revokeObjectURL(url);
      showSnackbar("Transaction details downloaded", "success");
    }
    handleMenuClose();
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  const handleFilterChange = (event: SelectChangeEvent<string>) => {
    setFilterType(event.target.value);
  };

  if (loading) {
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

  if (transactions.length === 0) {
    return (
      <Typography variant="body1" align="center" sx={{ mt: 10 }}>
        No transactions available.
      </Typography>
    );
  }

  return (
    <Container sx={{ mt: 6 }}>
      <Typography variant="h6" align="center" sx={{ mb: 2 }}>
        Transaction History
      </Typography>
      {/* Filter by Transaction Type */}
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Filter by Type</InputLabel>
        <Select
          value={filterType}
          onChange={handleFilterChange}
          label="Filter by Type"
        >
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="seller_income">Seller Income</MenuItem>
          <MenuItem value="seller_payout">Seller Payout</MenuItem>
          <MenuItem value="refund">Refund</MenuItem>
          <MenuItem value="admin_adjustment">Admin Adjustment</MenuItem>
          <MenuItem value="subscription_payment">Subscription Payment</MenuItem>
          <MenuItem value="subscription_renewal">Subscription Renewal</MenuItem>
          <MenuItem value="subscription_cancellation">
            Subscription Cancellation
          </MenuItem>
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
            {filteredTransactions.map((transaction) => (
              <TableRow key={transaction._id}>
                <TableCell>
                  {new Date(transaction.createdAt).toLocaleString()}
                </TableCell>
                <TableCell>{transaction.type}</TableCell>
                <TableCell>${transaction.previousBalance}</TableCell>
                <TableCell>${transaction.currentBalance}</TableCell>
                <TableCell>{transaction.status}</TableCell>
                <TableCell>
                  <IconButton
                    onClick={(e) => handleMenuClick(e, transaction)}
                    aria-label="actions"
                  >
                    <MoreVert />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Three-Dot Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleViewDetails}>
          <Visibility fontSize="small" sx={{ mr: 1 }} /> View Details
        </MenuItem>
        <MenuItem onClick={handleDownload}>
          <Download fontSize="small" sx={{ mr: 1 }} /> Download
        </MenuItem>
      </Menu>

      {/* Modal for Viewing Details */}
      <Modal open={modalOpen} onClose={handleCloseModal}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: isMobile ? "90%" : 400,
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 4,
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
                <strong>Type:</strong> {selectedTransaction.type}
              </Typography>
              <Typography>
                <strong>Amount:</strong> ${selectedTransaction.amount}
              </Typography>
              <Typography>
                <strong>Previous Balance:</strong> $
                {selectedTransaction.previousBalance}
              </Typography>
              <Typography>
                <strong>Current Balance:</strong> $
                {selectedTransaction.currentBalance}
              </Typography>
              <Typography>
                <strong>Status:</strong> {selectedTransaction.status}
              </Typography>
              <Typography>
                <strong>Date:</strong>{" "}
                {new Date(selectedTransaction.createdAt).toLocaleString()}
              </Typography>
              <Typography>
                <strong>Metadata:</strong>
                <pre>
                  {JSON.stringify(selectedTransaction.metadata, null, 2)}
                </pre>
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

      {/* Snackbar for Notifications */}
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
    </Container>
  );
};

export default TransactionHistory;
