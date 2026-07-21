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
  Select,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  Stack,
  Card,
  CardContent,
  Box,
} from "@mui/material";
import { Download, MoreVert, Visibility } from "@mui/icons-material";
import { Container } from "@mui/material";
import TransactionDetailsModal from "./transactiondetails";

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
    sellerName?: string;
    sellerEmail?: string;
    buyerId?: string;
    buyerName?: string;
    buyerEmail?: string;
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
    theme.breakpoints.down("sm"),
  );

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await axios.get("/api/buyers/fetchTransactions");

        // Log the response to debug
        //("API Response:", response);

        // Ensure the response has the expected structure
        if (response.data && Array.isArray(response.data.data)) {
          setTransactions(response.data.data);
          setFilteredTransactions(response.data.data); // Initialize filtered transactions
        } else {
          console.error("Unexpected API response structure:", response.data);
          showSnackbar(
            "Failed to fetch transactions: Invalid data format",
            "error",
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
        transactions.filter((transaction) => transaction.type === filterType),
      );
    }
  }, [filterType, transactions]);

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

  const handleMenuClick = (
    event: React.MouseEvent<HTMLElement>,
    transaction: Transaction,
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedTransaction(transaction);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleViewDetails = () => {
    if (selectedTransaction) {
      setModalOpen(true);
    }
    setAnchorEl(null);
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

    // Amount Section
    drawSectionHeader("Amount");
    drawRow("Amount:", `$${selectedTransaction.amount.toFixed(2)}`, true);
    drawRow("Previous Balance:", `${selectedTransaction.previousBalance}`);
    drawRow("Current Balance:", `${selectedTransaction.currentBalance}`);

    // Metadata Section based on transaction type
    drawSectionHeader("Additional Information");

    switch (selectedTransaction.type) {
      case "lead_purchase": {
        drawRow("Lead ID:", selectedTransaction.metadata.leadId || "N/A");
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
      case "units_purchase": {
        drawRow(
          "Units Purchased:",
          String(selectedTransaction.metadata.unitsPurchased || "N/A"),
        );
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
      case "refund": {
        drawRow(
          "Refund Reason:",
          selectedTransaction.metadata.refundReason || "N/A",
        );
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
        break;
      }
      case "admin_adjustment": {
        drawRow("Admin Note:", selectedTransaction.metadata.adminNote || "N/A");
        break;
      }
      default: {
        if (selectedTransaction.metadata.leadId) {
          drawRow("Lead ID:", selectedTransaction.metadata.leadId);
        }
        if (selectedTransaction.metadata.unitsPurchased) {
          drawRow(
            "Units:",
            String(selectedTransaction.metadata.unitsPurchased),
          );
        }
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
    showSnackbar("Receipt downloaded successfully", "success");
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
    <Container sx={{ mt: 10 }}>
      <Typography
        variant="h6"
        align="center"
        sx={{ mt: 5, mb: 1, fontWeight: "bold", color: "primary.main" }}
      >
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
          <MenuItem value="lead_purchase">Lead Purchase</MenuItem>
          <MenuItem value="units_purchase">Units Purchase</MenuItem>
          <MenuItem value="refund">Refund</MenuItem>
          <MenuItem value="admin_adjustment">Admin Adjustment</MenuItem>
        </Select>
      </FormControl>
      {isMobile ? (
        <Stack spacing={1.5}>
          {filteredTransactions.map((transaction) => (
            <Card key={transaction._id} variant="outlined">
              <CardContent sx={{ "&:last-child": { pb: 2 } }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {transaction.type.replace(/_/g, " ")}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(transaction.createdAt).toLocaleString()}
                    </Typography>
                  </Box>
                  <IconButton
                    onClick={(e) => handleMenuClick(e, transaction)}
                    aria-label="actions"
                    size="small"
                  >
                    <MoreVert />
                  </IconButton>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mt: 1.5,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {transaction.previousBalance} &rarr;{" "}
                    {transaction.currentBalance}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {transaction.status}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : (
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
                  <TableCell>{transaction.previousBalance}</TableCell>
                  <TableCell>{transaction.currentBalance}</TableCell>
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
      )}

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

      {/* Transaction Details Modal */}
      <TransactionDetailsModal
        open={modalOpen}
        onClose={handleCloseModal}
        transaction={selectedTransaction}
      />

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
