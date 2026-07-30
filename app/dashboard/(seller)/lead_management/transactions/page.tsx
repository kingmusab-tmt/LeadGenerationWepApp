"use client";
import React, { useCallback, useEffect, useState } from "react";
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
  TablePagination,
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
import { useRouter } from "next/navigation";
import { ITransaction } from "@/models/transactions";
import TransactionDetailsModal from "./transactiondetails";
import TransactionFilters from "./transactionfilter";
import { formatDate, formatTransactionValue } from "@/utils/formater";

const TransactionHistory = () => {
  const theme = useTheme();
  const router = useRouter();
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
  const [filters, setFilters] = useState<{
    type: string;
    status: string;
    dateRange: string;
    startDate?: string;
    endDate?: string;
  }>({
    type: "all",
    status: "all",
    dateRange: "all",
  });
  const [sortConfig, setSortConfig] = useState<{
    key: keyof ITransaction;
    direction: "asc" | "desc";
  }>({ key: "createdAt", direction: "desc" });
  const [page, setPage] = useState(0); // 0-based, matches TablePagination
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [total, setTotal] = useState(0);

  // Paginated + filtered server-side (see GET /api/payments/transactions) —
  // previously fetched every transaction for this seller unbounded and
  // filtered type/status entirely client-side. Date range and column sort
  // still apply client-side, scoped to whichever page is currently loaded —
  // the same tradeoff any paginated table makes.
  const fetchTransactions = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: String(page + 1),
          limit: String(rowsPerPage),
        });
        if (filters.type !== "all") params.set("type", filters.type);
        if (filters.status !== "all") params.set("status", filters.status);

        const response = await axios.get(
          `/api/payments/transactions?${params.toString()}`,
          { signal },
        );
        const data = response.data?.data;
        setTransactions(
          Array.isArray(data?.transactions) ? data.transactions : [],
        );
        setTotal(data?.pagination?.total ?? 0);
        setError(null);
      } catch (err) {
        if (axios.isCancel(err)) return;
        console.error("Error fetching transactions:", err);
        if (axios.isAxiosError(err)) {
          if (err.response?.status === 401) {
            router.push("/auth/sign-in");
            return;
          }
          setError(
            err.response?.data?.error ||
              "Failed to fetch transactions. Please try again.",
          );
        } else {
          setError("Failed to fetch transactions. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    },
    [page, rowsPerPage, filters.type, filters.status, router],
  );

  // A rapid filter/page change can let an older, slower response resolve
  // after a newer one and overwrite the table with stale data — aborting
  // the previous in-flight request whenever the dependencies change (or
  // this effect unmounts) prevents that race.
  useEffect(() => {
    const controller = new AbortController();
    fetchTransactions(controller.signal);
    return () => controller.abort();
  }, [fetchTransactions]);

  // Changing any filter re-queries or re-scopes the result set, so a stale
  // later page (from a now much-shorter result set) would otherwise show an
  // empty table with pagination still claiming more pages exist.
  useEffect(() => {
    setPage(0);
  }, [filters.type, filters.status, filters.dateRange, filters.startDate, filters.endDate]);

  // Apply date-range filter and sorting to the currently loaded page
  useEffect(() => {
    let result = [...transactions];

    if (filters.dateRange !== "all") {
      if (filters.dateRange === "custom") {
        const start = filters.startDate ? new Date(filters.startDate) : null;
        // Include the entire end day, not just midnight at its start.
        const end = filters.endDate ? new Date(filters.endDate) : null;
        if (end) end.setHours(23, 59, 59, 999);

        result = result.filter((t) => {
          const created = new Date(t.createdAt);
          if (start && created < start) return false;
          if (end && created > end) return false;
          return true;
        });
      } else {
        const now = new Date();
        const cutoffDate = new Date();

        if (filters.dateRange === "week") {
          cutoffDate.setDate(now.getDate() - 7);
        } else if (filters.dateRange === "month") {
          cutoffDate.setMonth(now.getMonth() - 1);
        }

        result = result.filter((t) => new Date(t.createdAt) >= cutoffDate);
      }
    }

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
  }, [transactions, filters.dateRange, filters.startDate, filters.endDate, sortConfig]);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSort = (key: keyof ITransaction) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleRefresh = () => {
    fetchTransactions();
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
    drawRow(
      "Amount:",
      formatTransactionValue(
        selectedTransaction.amount,
        selectedTransaction.type,
        selectedTransaction.currency,
      ),
      true,
    );
    drawRow(
      "Previous Balance:",
      formatTransactionValue(
        selectedTransaction.previousBalance,
        selectedTransaction.type,
        selectedTransaction.currency,
      ),
    );
    drawRow(
      "Current Balance:",
      formatTransactionValue(
        selectedTransaction.currentBalance,
        selectedTransaction.type,
        selectedTransaction.currency,
      ),
    );

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

  // "deposit"/"withdrawal" are not real ITransaction.type values — every row
  // fell through to the generic default icon regardless of direction. These
  // are this seller's actual transaction types, grouped by whether money
  // moved into or out of their account.
  const CREDIT_TRANSACTION_TYPES = new Set(["seller_income", "refund"]);
  const DEBIT_TRANSACTION_TYPES = new Set([
    "seller_payout",
    "subscription_payment",
    "subscription_renewal",
    "lead_purchase",
    "units_purchase",
    "call_purchase",
  ]);

  const getTypeIcon = (type: string) => {
    const size = isMobile ? "small" : "medium";
    if (CREDIT_TRANSACTION_TYPES.has(type)) {
      return <ArrowUpward color="success" fontSize={size} />;
    }
    if (DEBIT_TRANSACTION_TYPES.has(type)) {
      return <ArrowDownward color="error" fontSize={size} />;
    }
    return <Paid color="info" fontSize={size} />;
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
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center" gap={1}>
              {getTypeIcon(transaction.type)}
              <Typography variant="subtitle1" fontWeight="bold">
                {transaction.type.replace(/_/g, " ")}
              </Typography>
            </Box>
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
            {formatTransactionValue(
              transaction.amount,
              transaction.type,
              transaction.currency,
            )}
          </Typography>

          <Box display="flex" justifyContent="space-between">
            <Typography variant="body2">
              Balance:{" "}
              {formatTransactionValue(
                transaction.currentBalance,
                transaction.type,
                transaction.currency,
              )}
            </Typography>
            <IconButton
              size="small"
              onClick={(e) => handleMenuClick(e, transaction)}
              aria-label="Transaction actions"
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
      <TableCell align="right">
        {formatTransactionValue(transaction.amount, transaction.type, transaction.currency)}
      </TableCell>
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
          aria-label="Transaction actions"
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
      <TableCell align="right">
        {formatTransactionValue(transaction.amount, transaction.type, transaction.currency)}
      </TableCell>
      <TableCell>
        <Chip
          label={transaction.status}
          color={getStatusColor(transaction.status)}
          size="small"
        />
      </TableCell>
      <TableCell align="right">
        {formatTransactionValue(transaction.currentBalance, transaction.type, transaction.currency)}
      </TableCell>
      <TableCell>
        <IconButton
          size="small"
          onClick={(e) => handleMenuClick(e, transaction)}
          aria-label="Transaction actions"
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
                          aria-label="Sort by date"
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

        {total > 0 && (
          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
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
