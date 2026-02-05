"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Grid,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from "@mui/material";
import {
  Download,
  MoreVert,
  Visibility,
  Refresh,
  ArrowUpward,
  ArrowDownward,
  Paid,
} from "@mui/icons-material";
import { useMediaQuery } from "@mui/material";
import { ITransaction } from "@/models/transactions";
import TransactionDetailsModal from "./transactiondetails";
import TransactionFilters from "./transactionfilter";
import { formatCurrency, formatDate } from "@/utils/formater";

const TransactionHistory = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));
  const [transactions, setTransactions] = useState<ITransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<
    ITransaction[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] =
    useState<ITransaction | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [filters, setFilters] = useState({
    type: "all",
    status: "all",
    dateRange: "all",
  });
  const [sortConfig, setSortConfig] = useState<{
    key: keyof ITransaction;
    direction: "asc" | "desc";
  }>({ key: "createdAt", direction: "desc" });

  // Fetch transactions
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const response = await axios.get("/api/payments/transactions");
        setTransactions(response.data.data);
        setFilteredTransactions(response.data.data);
      } catch (err) {
        setError("Failed to fetch transactions");
        console.error("Error fetching transactions:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  // Apply filters and sorting
  useEffect(() => {
    let result = [...transactions];

    // Apply type filter
    if (filters.type !== "all") {
      result = result.filter((t) => t.type === filters.type);
    }

    // Apply status filter
    if (filters.status !== "all") {
      result = result.filter((t) => t.status === filters.status);
    }

    // Apply date range filter
    if (filters.dateRange !== "all") {
      const now = new Date();
      const cutoffDate = new Date();

      if (filters.dateRange === "week") {
        cutoffDate.setDate(now.getDate() - 7);
      } else if (filters.dateRange === "month") {
        cutoffDate.setMonth(now.getMonth() - 1);
      }

      result = result.filter((t) => new Date(t.createdAt) >= cutoffDate);
    }

    // Apply sorting
    result.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });

    setFilteredTransactions(result);
  }, [transactions, filters, sortConfig]);

  const handleSort = (key: keyof ITransaction) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleRefresh = () => {
    setLoading(true);
    axios
      .get("/api/payments/transactions")
      .then((response) => {
        setTransactions(response.data.data);
        setFilteredTransactions(response.data.data);
      })
      .catch((err) => {
        setError("Failed to refresh transactions");
      })
      .finally(() => setLoading(false));
  };

  const handleMenuClick = (
    event: React.MouseEvent<HTMLElement>,
    transaction: ITransaction,
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedTransaction(transaction);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleViewDetails = () => {
    setModalOpen(true);
    handleMenuClose();
  };

  const handleDownload = async () => {
    if (!selectedTransaction) return;

    // Create canvas
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Responsive canvas sizing
    const canvasWidth = isMobile ? 400 : 800;
    const canvasHeight = isMobile ? 500 : 600;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Canvas styling
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000000";
    ctx.font = isMobile ? "14px Arial" : "20px Arial";
    ctx.textAlign = "left";

    // Base transaction details
    let transactionDetails = `
    Transaction ID: ${selectedTransaction._id}
    Type: ${selectedTransaction.type}
    Amount: ${selectedTransaction.amount} ${selectedTransaction.currency}
    Status: ${selectedTransaction.status}
    Date: ${new Date(selectedTransaction.createdAt).toLocaleString()}
    Payment Gateway: ${selectedTransaction.paymentGateway || "N/A"}
  `;

    // Add metadata based on transaction type
    switch (selectedTransaction.type) {
      case "lead_purchase":
        transactionDetails += `
        Lead ID: ${selectedTransaction.metadata.leadId || "N/A"}
        Buyer ID: ${selectedTransaction.metadata.buyerId || "N/A"}
      `;
        break;

      case "units_purchase":
        transactionDetails += `
        Units Purchased: ${selectedTransaction.metadata.unitsPurchased || "N/A"}
        Buyer ID: ${selectedTransaction.metadata.buyerId || "N/A"}
      `;
        break;

      case "seller_income":
        transactionDetails += `
        Seller ID: ${selectedTransaction.metadata.sellerId || "N/A"}
        Payout ID: ${selectedTransaction.metadata.payoutId || "N/A"}
      `;
        break;

      case "seller_payout":
        transactionDetails += `
        Seller ID: ${selectedTransaction.metadata.sellerId || "N/A"}
        Payout ID: ${selectedTransaction.metadata.payoutId || "N/A"}
      `;
        break;

      case "refund":
        transactionDetails += `
        Refund Reason: ${selectedTransaction.metadata.refundReason || "N/A"}
        ${
          selectedTransaction.metadata.buyerId
            ? `Buyer ID: ${selectedTransaction.metadata.buyerId}`
            : ""
        }
        ${
          selectedTransaction.metadata.sellerId
            ? `Seller ID: ${selectedTransaction.metadata.sellerId}`
            : ""
        }
      `;
        break;

      case "subscription_payment":
      case "subscription_renewal":
        transactionDetails += `
        Subscription Plan: ${
          selectedTransaction.metadata.subscriptionPlan || "N/A"
        }
        Duration: ${selectedTransaction.metadata.subscriptionDuration || "N/A"}
        Tier: ${selectedTransaction.metadata.tierName || "N/A"}
        User Email: ${selectedTransaction.metadata.userEmail || "N/A"}
      `;
        break;

      case "admin_adjustment":
        transactionDetails += `
        Admin Note: ${selectedTransaction.metadata.adminNote || "N/A"}
        User: ${selectedTransaction.metadata.userEmail || "N/A"}
      `;
        break;
    }

    // Add balance information
    transactionDetails += `
    Previous Balance: ${selectedTransaction.previousBalance}
    Current Balance: ${selectedTransaction.currentBalance}
  `;

    // Draw text on canvas with responsive positioning
    const lines = transactionDetails.split("\n");
    const lineHeight = isMobile ? 20 : 30;
    let y = isMobile ? 30 : 50;
    const x = isMobile ? 20 : 50;

    lines.forEach((line) => {
      if (line.trim()) {
        // Handle text wrapping for mobile
        if (isMobile && line.length > 40) {
          const chunks = line.match(/.{1,40}/g) || [];
          chunks.forEach((chunk) => {
            ctx.fillText(chunk.trim(), x, y);
            y += lineHeight;
          });
        } else {
          ctx.fillText(line.trim(), x, y);
          y += lineHeight;
        }
      }
    });

    // Add border
    ctx.strokeStyle = "#dddddd";
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    // Convert to JPG and download
    canvas.toBlob(
      (blob) => {
        if (!blob) return;

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `transaction-${selectedTransaction._id}.jpg`;
        link.click();
        URL.revokeObjectURL(url);
      },
      "image/jpeg",
      0.9,
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "deposit":
        return (
          <ArrowDownward
            color="success"
            fontSize={isMobile ? "small" : "medium"}
          />
        );
      case "withdrawal":
        return (
          <ArrowUpward color="error" fontSize={isMobile ? "small" : "medium"} />
        );
      default:
        return <Paid color="info" fontSize={isMobile ? "small" : "medium"} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "success";
      case "pending":
        return "warning";
      case "failed":
        return "error";
      default:
        return "default";
    }
  };

  const renderMobileTransaction = (transaction: ITransaction) => (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Stack spacing={1}>
          <Box display="flex" justifyContent="space-between">
            <Typography variant="subtitle1" fontWeight="bold">
              {transaction.type}
            </Typography>
            <Chip
              label={transaction.status}
              color={getStatusColor(transaction.status)}
              size="small"
            />
          </Box>

          <Typography variant="body2">
            {formatDate(transaction.createdAt)}
          </Typography>

          <Typography variant="body1" fontWeight="bold">
            {formatCurrency(transaction.amount)}
          </Typography>

          <Box display="flex" justifyContent="space-between">
            <Typography variant="body2">
              Balance: {formatCurrency(transaction.currentBalance)}
            </Typography>
            <IconButton
              size="small"
              onClick={(e) => handleMenuClick(e, transaction)}
            >
              <MoreVert fontSize="small" />
            </IconButton>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );

  const renderTabletTransaction = (transaction: ITransaction) => (
    <TableRow key={transaction._id} hover>
      <TableCell>{formatDate(transaction.createdAt)}</TableCell>
      <TableCell>
        <Box display="flex" alignItems="center" gap={1}>
          {getTypeIcon(transaction.type)}
          {transaction.type.replace(/_/g, " ")}
        </Box>
      </TableCell>
      <TableCell align="right">{formatCurrency(transaction.amount)}</TableCell>
      <TableCell>
        <Chip
          label={transaction.status}
          color={getStatusColor(transaction.status)}
          size="small"
        />
      </TableCell>
      <TableCell align="right">
        <IconButton
          size="small"
          onClick={(e) => handleMenuClick(e, transaction)}
        >
          <MoreVert fontSize="small" />
        </IconButton>
      </TableCell>
    </TableRow>
  );

  const renderDesktopTransaction = (transaction: ITransaction) => (
    <TableRow key={transaction._id} hover>
      <TableCell>{formatDate(transaction.createdAt)}</TableCell>
      <TableCell>
        <Box display="flex" alignItems="center" gap={1}>
          {getTypeIcon(transaction.type)}
          {transaction.type.replace(/_/g, " ")}
        </Box>
      </TableCell>
      <TableCell align="right">{formatCurrency(transaction.amount)}</TableCell>
      <TableCell>
        <Chip
          label={transaction.status}
          color={getStatusColor(transaction.status)}
          size="small"
        />
      </TableCell>
      <TableCell align="right">
        {formatCurrency(transaction.currentBalance)}
      </TableCell>
      <TableCell>
        <IconButton
          size="small"
          onClick={(e) => handleMenuClick(e, transaction)}
        >
          <MoreVert fontSize="small" />
        </IconButton>
      </TableCell>
    </TableRow>
  );

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 2, p: isMobile ? 1 : 2 }}>
        <Card variant="outlined">
          <CardContent>
            <Typography color="error" variant="h6" gutterBottom>
              Error Loading Transactions
            </Typography>
            <Typography>{error}</Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={handleRefresh}
              startIcon={<Refresh />}
              sx={{ mt: 2 }}
              size={isMobile ? "small" : "medium"}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </Container>
    );
  }

  if (loading && transactions.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ mt: 2, p: isMobile ? 1 : 2 }}>
        <Skeleton variant="rectangular" height={400} />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 3, mb: 4, p: isMobile ? 1 : 2 }}>
      <Stack spacing={isMobile ? 2 : 3}>
        <Box
          display="flex"
          flexDirection={isMobile ? "column" : "row"}
          justifyContent="space-between"
          alignItems={isMobile ? "flex-start" : "center"}
          gap={isMobile ? 2 : 0}
        >
          <Typography
            variant={isMobile ? "h5" : "h5"}
            component="h1"
            sx={{ mt: 4, mb: 1, fontWeight: "bold", color: "primary.main" }}
          >
            Transaction History
          </Typography>
          <Box
            display="flex"
            flexDirection={isMobile ? "column" : "row"}
            alignItems={isMobile ? "stretch" : "center"}
            gap={1}
            width={isMobile ? "100%" : "auto"}
          >
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={handleRefresh}
              size={isMobile ? "small" : "medium"}
              fullWidth={isMobile}
            >
              {isMobile ? "Refresh" : "Refresh Transactions"}
            </Button>
            <TransactionFilters
              filters={filters}
              onFilterChange={setFilters}
              isMobile={isMobile}
            />
          </Box>
        </Box>

        {filteredTransactions.length === 0 ? (
          <Card variant="outlined">
            <CardContent>
              <Typography align="center" color="textSecondary">
                No transactions found matching your filters
              </Typography>
            </CardContent>
          </Card>
        ) : isMobile ? (
          <Stack spacing={2}>
            {filteredTransactions.map((transaction) =>
              renderMobileTransaction(transaction),
            )}
          </Stack>
        ) : isTablet ? (
          <Paper elevation={2} sx={{ overflow: "hidden" }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date/Time</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredTransactions.map((transaction) =>
                    renderTabletTransaction(transaction),
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        ) : (
          <Paper elevation={2} sx={{ overflow: "hidden" }}>
            <TableContainer>
              <Table size="medium">
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        Date/Time
                        <IconButton
                          size="small"
                          onClick={() => handleSort("createdAt")}
                        >
                          {sortConfig.key === "createdAt" &&
                          sortConfig.direction === "asc" ? (
                            <ArrowUpward fontSize="small" />
                          ) : (
                            <ArrowDownward fontSize="small" />
                          )}
                        </IconButton>
                      </Box>
                    </TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Balance</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredTransactions.map((transaction) =>
                    renderDesktopTransaction(transaction),
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "right",
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "right",
          }}
        >
          <MenuItem onClick={handleViewDetails}>
            <Visibility fontSize="small" sx={{ mr: 1 }} /> View Details
          </MenuItem>
          <MenuItem onClick={handleDownload}>
            <Download fontSize="small" sx={{ mr: 1 }} /> Download Receipt
          </MenuItem>
        </Menu>

        <TransactionDetailsModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          transaction={selectedTransaction}
        />
      </Stack>
    </Container>
  );
};

export default TransactionHistory;
