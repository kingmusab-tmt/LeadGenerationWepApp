"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  CircularProgress,
  MenuItem,
  TextField,
  Grid,
  Card,
  CardContent,
  Typography,
  IconButton,
} from "@mui/material";
import {
  Download as DownloadIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import Link from "next/link";
import { toast } from "react-toastify";
import { useCSRFFetch } from "@/app/hooks/useCSRF";

interface Invoice {
  _id: string;
  invoiceNumber: string;
  buyerName?: string;
  total: number;
  status: string;
  invoiceDate: string;
  dueDate: string;
  isPaid: boolean;
}

interface InvoiceStats {
  totalInvoices: number;
  paidInvoices: number;
  draftInvoices: number;
  sentInvoices: number;
  totalRevenue: number;
  pendingRevenue: number;
}

export default function InvoicesPage() {
  const fetchWithCSRF = useCSRFFetch();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const query = filterStatus ? `?status=${filterStatus}` : "";
      const res = await fetch(`/api/invoices${query}`);
      const data = await res.json();
      if (res.ok) {
        setInvoices(data.invoices);
      }
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    void (async () => {
      await fetchInvoices();
      await fetchStats();
    })();
  }, [filterStatus, fetchInvoices]);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/invoices/stats");
      const data = await res.json();
      if (res.ok) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleDownload = (invoiceId: string) => {
    window.location.href = `/api/invoices/${invoiceId}/pdf`;
  };

  const handleDelete = async () => {
    if (!selectedInvoice) return;

    try {
      const res = await fetchWithCSRF(`/api/invoices/${selectedInvoice._id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Invoice deleted successfully");
        setDeleteDialogOpen(false);
        fetchInvoices();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to delete invoice");
      }
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast.error("Failed to delete invoice");
    }
  };

  const getStatusColor = (
    status: string,
  ): "success" | "warning" | "error" | "info" | "default" => {
    switch (status) {
      case "paid":
        return "success";
      case "sent":
      case "viewed":
        return "info";
      case "draft":
        return "default";
      case "overdue":
        return "error";
      default:
        return "default";
    }
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="500px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" mb={3}>
        <Typography variant="h4">Invoices</Typography>
        <Link href="/dashboard/invoices/new">
          <Button variant="contained" color="primary">
            New Invoice
          </Button>
        </Link>
      </Box>

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={2} mb={3}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Invoices
                </Typography>
                <Typography variant="h5">{stats.totalInvoices}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Paid
                </Typography>
                <Typography variant="h5">{stats.paidInvoices}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Revenue
                </Typography>
                <Typography variant="h5">
                  ${stats.totalRevenue.toFixed(2)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Pending
                </Typography>
                <Typography variant="h5">
                  ${stats.pendingRevenue.toFixed(2)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filter */}
      <Box mb={2}>
        <TextField
          select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          label="Filter by Status"
          size="small"
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="draft">Draft</MenuItem>
          <MenuItem value="sent">Sent</MenuItem>
          <MenuItem value="paid">Paid</MenuItem>
          <MenuItem value="overdue">Overdue</MenuItem>
        </TextField>
      </Box>

      {/* Invoices Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell sx={{ fontWeight: "bold" }}>Invoice #</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Client</TableCell>
              <TableCell sx={{ fontWeight: "bold" }} align="right">
                Amount
              </TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Status</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Date</TableCell>
              <TableCell sx={{ fontWeight: "bold" }} align="center">
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                  <Typography color="textSecondary">
                    No invoices found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((invoice) => (
                <TableRow key={invoice._id}>
                  <TableCell>
                    <Link href={`/dashboard/invoices/${invoice._id}`}>
                      {invoice.invoiceNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{invoice.buyerName || "N/A"}</TableCell>
                  <TableCell align="right">
                    ${invoice.total.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={invoice.status}
                      color={getStatusColor(invoice.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(invoice.invoiceDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => handleDownload(invoice._id)}
                      title="Download PDF"
                    >
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                    <Link
                      href={`/dashboard/invoices/${invoice._id}/edit`}
                    >
                      <IconButton size="small" title="Edit">
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Link>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedInvoice(invoice);
                        setDeleteDialogOpen(true);
                      }}
                      title="Delete"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Delete Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Invoice?</DialogTitle>
        <DialogContent>
          Are you sure you want to delete invoice{" "}
          {selectedInvoice?.invoiceNumber}? This action cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
