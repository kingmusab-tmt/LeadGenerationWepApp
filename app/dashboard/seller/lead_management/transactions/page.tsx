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
  IconButton,
  Menu,
  MenuItem,
  Paper,
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
      .catch(() => {
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

    // Get user details from stored metadata (captured at transaction time)
    const getSellerDisplay = () => ({
      name: selectedTransaction.metadata.sellerName || "N/A",
      email: selectedTransaction.metadata.sellerEmail || "N/A",
    });

    const getBuyerDisplay = () => ({
      name: selectedTransaction.metadata.buyerName || "N/A",
      email: selectedTransaction.metadata.buyerEmail || "N/A",
    });

    // Create canvas
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Canvas dimensions
    const canvasWidth = isMobile ? 450 : 700;
    const canvasHeight = isMobile ? 650 : 750;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Header background
    ctx.fillStyle = "#1976d2";
    ctx.fillRect(0, 0, canvas.width, isMobile ? 100 : 120);

    // Load and draw logo
    const logo = new Image();
    logo.crossOrigin = "anonymous";
    logo.src = "/BRIXCOT.webp";

    await new Promise<void>((resolve) => {
      logo.onload = () => resolve();
      logo.onerror = () => resolve();
      setTimeout(() => resolve(), 2000);
    });

    const logoSize = isMobile ? 60 : 80;
    const logoX = (canvasWidth - logoSize) / 2;
    const logoY = isMobile ? 10 : 10;

    if (logo.complete && logo.naturalWidth > 0) {
      ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
    }

    // Receipt title
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${isMobile ? "16px" : "20px"} Arial`;
    ctx.textAlign = "center";
    ctx.fillText("TRANSACTION RECEIPT", canvasWidth / 2, isMobile ? 85 : 105);

    // Content area
    const startY = isMobile ? 120 : 140;
    const padding = isMobile ? 20 : 40;
    const labelX = padding;
    const valueX = isMobile ? 160 : 220;
    const lineHeight = isMobile ? 24 : 30;
    let currentY = startY;

    const drawRow = (label: string, value: string, isHeader = false) => {
      ctx.textAlign = "left";
      ctx.fillStyle = "#666666";
      ctx.font = `${isMobile ? "12px" : "14px"} Arial`;
      ctx.fillText(label, labelX, currentY);

      ctx.fillStyle = isHeader ? "#1976d2" : "#333333";
      ctx.font = `${isHeader ? "bold " : ""}${isMobile ? "12px" : "14px"} Arial`;
      ctx.fillText(value, valueX, currentY);
      currentY += lineHeight;
    };

    const drawSectionHeader = (title: string) => {
      currentY += 10;
      ctx.fillStyle = "#1976d2";
      ctx.font = `bold ${isMobile ? "13px" : "15px"} Arial`;
      ctx.textAlign = "left";
      ctx.fillText(title, labelX, currentY);
      currentY += 8;
      ctx.strokeStyle = "#e0e0e0";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(labelX, currentY);
      ctx.lineTo(canvasWidth - padding, currentY);
      ctx.stroke();
      currentY += 15;
    };

    // Transaction Info Section
    drawSectionHeader("Transaction Details");
    drawRow(
      "Transaction ID:",
      selectedTransaction._id.slice(-12).toUpperCase(),
      true,
    );
    drawRow("Type:", selectedTransaction.type.replace(/_/g, " ").toUpperCase());
    drawRow("Status:", selectedTransaction.status.toUpperCase());
    drawRow("Date:", new Date(selectedTransaction.createdAt).toLocaleString());
    drawRow("Payment Gateway:", selectedTransaction.paymentGateway || "N/A");

    // Amount Section
    drawSectionHeader("Amount");
    const currencySymbol =
      selectedTransaction.currency === "usd"
        ? "$"
        : selectedTransaction.currency?.toUpperCase() || "";
    drawRow(
      "Amount:",
      `${currencySymbol}${selectedTransaction.amount.toFixed(2)}`,
      true,
    );
    drawRow("Previous Balance:", `${selectedTransaction.previousBalance}`);
    drawRow("Current Balance:", `${selectedTransaction.currentBalance}`);

    // Metadata Section based on transaction type
    drawSectionHeader("Additional Information");

    switch (selectedTransaction.type) {
      case "lead_purchase": {
        drawRow(
          "Lead ID:",
          String(selectedTransaction.metadata.leadId || "N/A"),
        );
        const buyer = getBuyerDisplay();
        drawRow("Buyer Name:", buyer.name);
        drawRow("Buyer Email:", buyer.email);
        break;
      }
      case "units_purchase": {
        drawRow(
          "Units Purchased:",
          String(selectedTransaction.metadata.unitsPurchased || "N/A"),
        );
        const buyer = getBuyerDisplay();
        drawRow("Buyer Name:", buyer.name);
        drawRow("Buyer Email:", buyer.email);
        break;
      }
      case "seller_income":
      case "seller_payout": {
        const seller = getSellerDisplay();
        drawRow("Seller Name:", seller.name);
        drawRow("Seller Email:", seller.email);
        drawRow("Payout ID:", selectedTransaction.metadata.payoutId || "N/A");
        break;
      }
      case "refund": {
        drawRow(
          "Refund Reason:",
          selectedTransaction.metadata.refundReason || "N/A",
        );
        if (
          selectedTransaction.metadata.buyerName ||
          selectedTransaction.metadata.buyerEmail
        ) {
          const buyer = getBuyerDisplay();
          drawRow("Buyer Name:", buyer.name);
          drawRow("Buyer Email:", buyer.email);
        }
        if (
          selectedTransaction.metadata.sellerName ||
          selectedTransaction.metadata.sellerEmail
        ) {
          const seller = getSellerDisplay();
          drawRow("Seller Name:", seller.name);
          drawRow("Seller Email:", seller.email);
        }
        break;
      }
      case "subscription_payment":
      case "subscription_renewal": {
        drawRow(
          "Subscription Plan:",
          selectedTransaction.metadata.subscriptionPlan || "N/A",
        );
        drawRow(
          "Duration:",
          selectedTransaction.metadata.subscriptionDuration || "N/A",
        );
        drawRow("Tier:", selectedTransaction.metadata.tierName || "N/A");
        drawRow("User Email:", selectedTransaction.metadata.userEmail || "N/A");
        break;
      }
      case "admin_adjustment": {
        drawRow("Admin Note:", selectedTransaction.metadata.adminNote || "N/A");
        drawRow("User Email:", selectedTransaction.metadata.userEmail || "N/A");
        break;
      }
    }

    // Footer
    currentY = canvasHeight - 50;
    ctx.fillStyle = "#f5f5f5";
    ctx.fillRect(0, currentY - 10, canvasWidth, 60);

    ctx.fillStyle = "#888888";
    ctx.font = `${isMobile ? "10px" : "12px"} Arial`;
    ctx.textAlign = "center";
    ctx.fillText(
      "Thank you for your business!",
      canvasWidth / 2,
      currentY + 10,
    );
    ctx.fillText(
      `Generated on ${new Date().toLocaleDateString()}`,
      canvasWidth / 2,
      currentY + 28,
    );

    // Border
    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, canvasWidth - 2, canvasHeight - 2);

    // Convert to PNG and download
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `receipt-${selectedTransaction._id.slice(-8)}.png`;
        link.click();
        URL.revokeObjectURL(url);
      },
      "image/png",
      1.0,
    );
    handleMenuClose();
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
          gap={isMobile ? 2 : 2}
          flexWrap="wrap"
        >
          <Typography
            variant="h5"
            component="h1"
            sx={{ fontWeight: "bold", color: "primary.main" }}
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
