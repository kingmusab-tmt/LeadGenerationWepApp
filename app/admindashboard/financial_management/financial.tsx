"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
  Select,
  MenuItem,
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  Search,
  FilterList,
  Refresh,
  AttachMoney,
  Receipt,
  Payment,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Cancel,
  Download,
  Visibility,
} from "@mui/icons-material";
import { useCSRFFetch } from "@/app/hooks/useCSRF";
import { useNotification } from "@/lib/useNotification";

interface Transaction {
  id: string;
  type:
    | "lead_purchase"
    | "units_purchase"
    | "seller_income"
    | "seller_payout"
    | "refund"
    | "subscription_payment";
  amount: number;
  userId: string;
  userName: string;
  status: "pending" | "completed" | "failed" | "refunded";
  createdAt: string;
  gateway: "stripe" | "manual";
  metadata?: {
    leadId?: string;
    units?: number;
    tierName?: string;
  };
}

interface Payout {
  id: string;
  sellerId: string;
  sellerName: string;
  amount: number;
  status: "pending" | "processed" | "failed";
  method: "stripe" | "bank_transfer";
  createdAt: string;
  processedAt?: string;
}

const FinancialManagement = () => {
  const csrfFetch = useCSRFFetch();
  const notify = useNotification();
  const [activeTab, setActiveTab] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactionPage, setTransactionPage] = useState(0);
  const [payoutPage, setPayoutPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [openTransactionDialog, setOpenTransactionDialog] = useState(false);
  const [openPayoutDialog, setOpenPayoutDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [refundingId, setRefundingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [transactionsRes, payoutsRes] = await Promise.all([
        fetch("/api/admin/financial/transactions"),
        fetch("/api/admin/financial/payouts"),
      ]);

      const transactionsData = await transactionsRes.json();
      const payoutsData = await payoutsRes.json();

      setTransactions(transactionsData.transactions || []);
      setPayouts(payoutsData.payouts || []);
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError("Failed to load financial data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleTransactionPageChange = (event: unknown, newPage: number) => {
    setTransactionPage(newPage);
  };

  const handlePayoutPageChange = (event: unknown, newPage: number) => {
    setPayoutPage(newPage);
  };

  const handleRowsPerPageChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setTransactionPage(0);
    setPayoutPage(0);
  };

  const handleOpenTransactionDialog = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setOpenTransactionDialog(true);
  };

  const handleCloseTransactionDialog = () => {
    setOpenTransactionDialog(false);
  };

  const handleOpenPayoutDialog = (payout: Payout) => {
    setSelectedPayout(payout);
    setOpenPayoutDialog(true);
  };

  const handleClosePayoutDialog = () => {
    setOpenPayoutDialog(false);
  };

  const handleProcessPayout = async (payoutId: string) => {
    try {
      const response = await csrfFetch(
        `/api/admin/financial/payouts/${payoutId}/process`,
        { method: "PUT" },
      );

      if (!response.ok) throw new Error("Failed to process payout");

      setPayouts(
        payouts.map((payout) =>
          payout.id === payoutId
            ? {
                ...payout,
                status: "processed",
                processedAt: new Date().toISOString(),
              }
            : payout,
        ),
      );

      if (selectedPayout?.id === payoutId) {
        setSelectedPayout({
          ...selectedPayout,
          status: "processed",
          processedAt: new Date().toISOString(),
        });
      }

      notify("Payout processed successfully", "success");
    } catch (err) {
      console.error("Failed to process payout:", err);
      notify("Failed to process payout", "error");
    }
  };

  const handleRefund = async (transactionId: string) => {
    setRefundingId(transactionId);
    try {
      const response = await csrfFetch(
        `/api/admin/financial/transactions/${transactionId}/refund`,
        { method: "POST" },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to process refund");
      }

      setTransactions(
        transactions.map((t) =>
          t.id === transactionId ? { ...t, status: "refunded" } : t,
        ),
      );

      if (selectedTransaction?.id === transactionId) {
        setSelectedTransaction({ ...selectedTransaction, status: "refunded" });
        setOpenTransactionDialog(false);
      }

      notify("Refund processed successfully", "success");
    } catch (err) {
      console.error("Failed to process refund:", err);
      notify(
        err instanceof Error ? err.message : "Failed to process refund",
        "error",
      );
    } finally {
      setRefundingId(null);
    }
  };

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch =
      transaction.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || transaction.status === statusFilter;
    const matchesType = typeFilter === "all" || transaction.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const filteredPayouts = payouts.filter((payout) => {
    const matchesSearch =
      payout.sellerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payout.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || payout.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const paginatedTransactions = filteredTransactions.slice(
    transactionPage * rowsPerPage,
    transactionPage * rowsPerPage + rowsPerPage,
  );

  const paginatedPayouts = filteredPayouts.slice(
    payoutPage * rowsPerPage,
    payoutPage * rowsPerPage + rowsPerPage,
  );

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case "lead_purchase":
        return "Lead Purchase";
      case "units_purchase":
        return "Units Purchase";
      case "seller_income":
        return "Seller Income";
      case "seller_payout":
        return "Seller Payout";
      case "refund":
        return "Refund";
      case "subscription_payment":
        return "Subscription";
      default:
        return type;
    }
  };

  const handleExport = () => {
    const data = activeTab === 0 ? filteredTransactions : filteredPayouts;
    if (data.length === 0) {
      notify("No data to export", "warning");
      return;
    }

    let csv: string;
    if (activeTab === 0) {
      csv = "ID,User,Type,Amount,Status,Date,Gateway\n";
      csv += (data as Transaction[])
        .map(
          (t) =>
            `"${t.id}","${t.userName}","${getTransactionTypeLabel(t.type)}","${t.amount.toFixed(2)}","${t.status}","${new Date(t.createdAt).toLocaleDateString()}","${t.gateway}"`,
        )
        .join("\n");
    } else {
      csv = "ID,Seller,Amount,Status,Method,Created,Processed\n";
      csv += (data as Payout[])
        .map(
          (p) =>
            `"${p.id}","${p.sellerName}","${p.amount.toFixed(2)}","${p.status}","${p.method}","${new Date(p.createdAt).toLocaleDateString()}","${p.processedAt ? new Date(p.processedAt).toLocaleDateString() : "N/A"}"`,
        )
        .join("\n");
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeTab === 0 ? "transactions" : "payouts"}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    notify("Export downloaded", "success");
  };

  const revenueSummary = useMemo(() => {
    const totalRevenue = transactions
      .filter(
        (t) =>
          t.status === "completed" &&
          (t.type === "lead_purchase" ||
            t.type === "units_purchase" ||
            t.type === "subscription_payment"),
      )
      .reduce((sum, t) => sum + t.amount, 0);

    const totalPayouts = transactions
      .filter(
        (t) =>
          t.status === "completed" &&
          (t.type === "seller_payout" || t.type === "seller_income"),
      )
      .reduce((sum, t) => sum + t.amount, 0);

    const totalRefunds = transactions
      .filter((t) => t.type === "refund")
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalRevenue,
      totalPayouts,
      totalRefunds,
      netRevenue: totalRevenue - totalPayouts - totalRefunds,
    };
  }, [transactions]);

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
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={fetchData}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Financial Management
      </Typography>

      {/* Revenue Summary Cards */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        {[
          {
            label: "Total Revenue",
            value: revenueSummary.totalRevenue,
            color: "success.main",
            icon: <TrendingUp />,
          },
          {
            label: "Total Payouts",
            value: revenueSummary.totalPayouts,
            color: "info.main",
            icon: <Payment />,
          },
          {
            label: "Total Refunds",
            value: revenueSummary.totalRefunds,
            color: "warning.main",
            icon: <TrendingDown />,
          },
          {
            label: "Net Revenue",
            value: revenueSummary.netRevenue,
            color: "primary.main",
            icon: <AttachMoney />,
          },
        ].map((card) => (
          <Paper
            key={card.label}
            sx={{ p: 2, flex: "1 1 200px", minWidth: 200 }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <Box sx={{ color: card.color }}>{card.icon}</Box>
              <Typography variant="body2" color="text.secondary">
                {card.label}
              </Typography>
            </Box>
            <Typography
              variant="h5"
              sx={{ color: card.color, fontWeight: 600 }}
            >
              ${card.value.toFixed(2)}
            </Typography>
          </Paper>
        ))}
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab
            label={
              <Badge badgeContent={transactions.length} color="primary">
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Receipt /> Transactions
                </Box>
              </Badge>
            }
          />
          <Tab
            label={
              <Badge badgeContent={payouts.length} color="primary">
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Payment /> Payouts
                </Box>
              </Badge>
            }
          />
        </Tabs>
      </Paper>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box
          sx={{
            display: "flex",
            gap: 2,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <TextField
            label={`Search ${activeTab === 0 ? "Transactions" : "Payouts"}`}
            variant="outlined"
            size="small"
            sx={{ flexGrow: 1 }}
            value={searchTerm}
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, color: "action.active" }} />,
            }}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            size="small"
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="all">All Statuses</MenuItem>
            {activeTab === 0
              ? [
                  <MenuItem key="pending" value="pending">
                    Pending
                  </MenuItem>,
                  <MenuItem key="completed" value="completed">
                    Completed
                  </MenuItem>,
                  <MenuItem key="failed" value="failed">
                    Failed
                  </MenuItem>,
                  <MenuItem key="refunded" value="refunded">
                    Refunded
                  </MenuItem>,
                ]
              : [
                  <MenuItem key="pending" value="pending">
                    Pending
                  </MenuItem>,
                  <MenuItem key="processed" value="processed">
                    Processed
                  </MenuItem>,
                  <MenuItem key="failed" value="failed">
                    Failed
                  </MenuItem>,
                ]}
          </Select>

          {activeTab === 0 && (
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              size="small"
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="lead_purchase">Lead Purchases</MenuItem>
              <MenuItem value="units_purchase">Units Purchases</MenuItem>
              <MenuItem value="seller_income">Seller Income</MenuItem>
              <MenuItem value="seller_payout">Seller Payouts</MenuItem>
              <MenuItem value="subscription_payment">Subscriptions</MenuItem>
              <MenuItem value="refund">Refunds</MenuItem>
            </Select>
          )}

          <Tooltip title="Refresh">
            <IconButton onClick={fetchData}>
              <Refresh />
            </IconButton>
          </Tooltip>

          <Button
            variant="contained"
            color="primary"
            startIcon={<Download />}
            size="small"
            onClick={handleExport}
          >
            Export
          </Button>
        </Box>
      </Paper>

      {activeTab === 0 ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Gateway</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedTransactions.length > 0 ? (
                paginatedTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{transaction.id.substring(0, 8)}...</TableCell>
                    <TableCell>{transaction.userName}</TableCell>
                    <TableCell>
                      {getTransactionTypeLabel(transaction.type)}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        {transaction.type.includes("purchase") ||
                        transaction.type === "refund" ? (
                          <TrendingDown color="error" sx={{ mr: 0.5 }} />
                        ) : (
                          <TrendingUp color="success" sx={{ mr: 0.5 }} />
                        )}
                        ${transaction.amount.toFixed(2)}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={transaction.status}
                        size="small"
                        color={
                          transaction.status === "completed"
                            ? "success"
                            : transaction.status === "failed"
                              ? "error"
                              : transaction.status === "refunded"
                                ? "warning"
                                : "default"
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={transaction.gateway}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Details">
                        <IconButton
                          onClick={() =>
                            handleOpenTransactionDialog(transaction)
                          }
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {transaction.status === "completed" && (
                        <Tooltip title="Refund">
                          <IconButton
                            onClick={() => handleRefund(transaction.id)}
                            color="warning"
                            disabled={refundingId === transaction.id}
                          >
                            <Cancel fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    No transactions found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredTransactions.length}
            rowsPerPage={rowsPerPage}
            page={transactionPage}
            onPageChange={handleTransactionPageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
          />
        </TableContainer>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Seller</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Method</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Processed</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedPayouts.length > 0 ? (
                paginatedPayouts.map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell>{payout.id.substring(0, 8)}...</TableCell>
                    <TableCell>{payout.sellerName}</TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <AttachMoney color="primary" sx={{ mr: 0.5 }} />
                        {payout.amount.toFixed(2)}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={payout.status}
                        size="small"
                        color={
                          payout.status === "processed"
                            ? "success"
                            : payout.status === "failed"
                              ? "error"
                              : "default"
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={payout.method.replace("_", " ")}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(payout.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {payout.processedAt
                        ? new Date(payout.processedAt).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Details">
                        <IconButton
                          onClick={() => handleOpenPayoutDialog(payout)}
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {payout.status === "pending" && (
                        <Tooltip title="Process Payout">
                          <IconButton
                            onClick={() => handleProcessPayout(payout.id)}
                            color="success"
                          >
                            <CheckCircle fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    No payouts found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredPayouts.length}
            rowsPerPage={rowsPerPage}
            page={payoutPage}
            onPageChange={handlePayoutPageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
          />
        </TableContainer>
      )}

      {/* Transaction Details Dialog */}
      <Dialog
        open={openTransactionDialog}
        onClose={handleCloseTransactionDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Transaction Details</DialogTitle>
        <DialogContent>
          {selectedTransaction && (
            <List>
              <ListItem>
                <ListItemText
                  primary="Transaction ID"
                  secondary={selectedTransaction.id}
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="User"
                  secondary={selectedTransaction.userName}
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="Type"
                  secondary={getTransactionTypeLabel(selectedTransaction.type)}
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="Amount"
                  secondaryTypographyProps={{ component: "div" }}
                  secondary={
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <AttachMoney sx={{ mr: 0.5 }} />
                      {selectedTransaction.amount.toFixed(2)}
                    </Box>
                  }
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="Status"
                  secondaryTypographyProps={{ component: "div" }}
                  secondary={
                    <Chip
                      label={selectedTransaction.status}
                      size="small"
                      color={
                        selectedTransaction.status === "completed"
                          ? "success"
                          : selectedTransaction.status === "failed"
                            ? "error"
                            : selectedTransaction.status === "refunded"
                              ? "warning"
                              : "default"
                      }
                    />
                  }
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="Payment Gateway"
                  secondary={selectedTransaction.gateway}
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="Date"
                  secondary={new Date(
                    selectedTransaction.createdAt,
                  ).toLocaleString()}
                />
              </ListItem>
              {selectedTransaction.metadata && (
                <>
                  <Divider />
                  <ListItem>
                    <ListItemText
                      primary="Metadata"
                      secondaryTypographyProps={{ component: "div" }}
                      secondary={
                        <Box
                          component="pre"
                          sx={{
                            whiteSpace: "pre-wrap",
                            wordWrap: "break-word",
                            fontFamily: "monospace",
                            fontSize: "0.875rem",
                            p: 1,
                            bgcolor: "background.default",
                            borderRadius: 1,
                          }}
                        >
                          {JSON.stringify(
                            selectedTransaction.metadata,
                            null,
                            2,
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                </>
              )}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          {selectedTransaction?.status === "completed" && (
            <Button
              onClick={() => handleRefund(selectedTransaction.id)}
              color="warning"
              startIcon={<Cancel />}
              disabled={refundingId === selectedTransaction.id}
            >
              {refundingId === selectedTransaction.id
                ? "Processing..."
                : "Refund"}
            </Button>
          )}
          <Button onClick={handleCloseTransactionDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Payout Details Dialog */}
      <Dialog
        open={openPayoutDialog}
        onClose={handleClosePayoutDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Payout Details</DialogTitle>
        <DialogContent>
          {selectedPayout && (
            <List>
              <ListItem>
                <ListItemText
                  primary="Payout ID"
                  secondary={selectedPayout.id}
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="Seller"
                  secondary={selectedPayout.sellerName}
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="Amount"
                  secondaryTypographyProps={{ component: "div" }}
                  secondary={
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <AttachMoney sx={{ mr: 0.5 }} />
                      {selectedPayout.amount.toFixed(2)}
                    </Box>
                  }
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="Status"
                  secondaryTypographyProps={{ component: "div" }}
                  secondary={
                    <Chip
                      label={selectedPayout.status}
                      size="small"
                      color={
                        selectedPayout.status === "processed"
                          ? "success"
                          : selectedPayout.status === "failed"
                            ? "error"
                            : "default"
                      }
                    />
                  }
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="Method"
                  secondary={selectedPayout.method.replace("_", " ")}
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="Created"
                  secondary={new Date(
                    selectedPayout.createdAt,
                  ).toLocaleString()}
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="Processed"
                  secondary={
                    selectedPayout.processedAt
                      ? new Date(selectedPayout.processedAt).toLocaleString()
                      : "Not processed yet"
                  }
                />
              </ListItem>
            </List>
          )}
        </DialogContent>
        <DialogActions>
          {selectedPayout?.status === "pending" && (
            <Button
              onClick={() => handleProcessPayout(selectedPayout.id)}
              color="success"
              startIcon={<CheckCircle />}
            >
              Process Payout
            </Button>
          )}
          <Button onClick={handleClosePayoutDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default FinancialManagement;
