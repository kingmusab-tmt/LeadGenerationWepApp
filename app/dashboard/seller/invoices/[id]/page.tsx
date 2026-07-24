"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Paper,
  Menu,
} from "@mui/material";
import {
  Download as DownloadIcon,
  MoreVert as MoreVertIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import Link from "next/link";
import { useCSRFFetch } from "@/app/hooks/useCSRF";

interface Invoice {
  _id: string;
  invoiceNumber: string;
  buyerName?: string;
  buyerEmail?: string;
  total: number;
  subtotal: number;
  tax: number;
  status: string;
  invoiceDate: string;
  dueDate: string;
  isPaid: boolean;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  notes?: string;
  currency: string;
  taxRate?: number;
  discountPercent?: number;
  discount?: number;
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [markPaidDialogOpen, setMarkPaidDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("stripe");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const fetchWithCSRF = useCSRFFetch();

  const fetchInvoice = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/invoices/${id}`);
      const data = await res.json();
      if (res.ok) {
        setInvoice(data);
      } else {
        toast.error("Failed to load invoice");
      }
    } catch (error) {
      console.error("Error fetching invoice:", error);
      toast.error("Failed to load invoice");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchInvoice();
  }, [id, fetchInvoice]);

  const handleSendInvoice = async () => {
    try {
      const res = await fetchWithCSRF(
        `/api/invoices/${id}/actions?action=send`,
        {
          method: "POST",
        },
      );

      if (res.ok) {
        toast.success("Invoice sent successfully");
        fetchInvoice();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to send invoice");
      }
    } catch (error) {
      console.error("Error sending invoice:", error);
      toast.error("Failed to send invoice");
    }
  };

  const handleMarkAsPaid = async () => {
    try {
      const res = await fetchWithCSRF(
        `/api/invoices/${id}/actions?action=mark-paid`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentMethod }),
        },
      );

      if (res.ok) {
        toast.success("Invoice marked as paid");
        setMarkPaidDialogOpen(false);
        fetchInvoice();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to mark as paid");
      }
    } catch (error) {
      console.error("Error marking as paid:", error);
      toast.error("Failed to mark as paid");
    }
  };

  const handleDuplicate = async () => {
    try {
      const res = await fetchWithCSRF(
        `/api/invoices/${id}/actions?action=duplicate`,
        {
          method: "POST",
        },
      );

      if (res.ok) {
        const newInvoice = await res.json();
        toast.success("Invoice duplicated");
        // Redirect to new invoice
        window.location.href = `/dashboard/seller/invoices/${newInvoice.invoice._id}`;
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to duplicate invoice");
      }
    } catch (error) {
      console.error("Error duplicating invoice:", error);
      toast.error("Failed to duplicate invoice");
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

  if (!invoice) {
    return (
      <Box p={3}>
        <Typography>Invoice not found</Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h4">{invoice.invoiceNumber}</Typography>
        <Box>
          <Button
            startIcon={<DownloadIcon />}
            onClick={() => (window.location.href = `/api/invoices/${id}/pdf`)}
            sx={{ mr: 1 }}
          >
            Download PDF
          </Button>
          <Button
            variant="outlined"
            onClick={(e: React.MouseEvent<HTMLButtonElement>) =>
              setAnchorEl(e.currentTarget)
            }
          >
            <MoreVertIcon />
          </Button>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
          >
            {invoice.status === "draft" && (
              <>
                <MenuItem
                  onClick={() => {
                    setAnchorEl(null);
                    handleSendInvoice();
                  }}
                >
                  Send Invoice
                </MenuItem>
                <MenuItem
                  component={Link}
                  href={`/dashboard/seller/invoices/${id}/edit`}
                >
                  Edit
                </MenuItem>
              </>
            )}
            {invoice.status !== "paid" && (
              <MenuItem
                onClick={() => {
                  setAnchorEl(null);
                  setMarkPaidDialogOpen(true);
                }}
              >
                Mark as Paid
              </MenuItem>
            )}
            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                handleDuplicate();
              }}
            >
              Duplicate
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Invoice Header */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography color="textSecondary">Bill To:</Typography>
                  <Typography variant="h6">{invoice.buyerName}</Typography>
                  {invoice.buyerEmail && (
                    <Typography>{invoice.buyerEmail}</Typography>
                  )}
                </Grid>
                <Grid
                  size={{ xs: 12, sm: 6 }}
                  sx={{ textAlign: { sm: "right" } }}
                >
                  <Box
                    display="flex"
                    justifyContent={{ sm: "flex-end" }}
                    mb={1}
                  >
                    <Chip
                      label={invoice.status}
                      color={getStatusColor(invoice.status)}
                    />
                  </Box>
                  <Typography color="textSecondary">Invoice Date:</Typography>
                  <Typography>
                    {new Date(invoice.invoiceDate).toLocaleDateString()}
                  </Typography>
                  <Typography color="textSecondary" sx={{ mt: 1 }}>
                    Due Date:
                  </Typography>
                  <Typography>
                    {new Date(invoice.dueDate).toLocaleDateString()}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Line Items */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <TableContainer component={Paper}>
                <Table>
                  <TableBody>
                    <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                      <TableCell sx={{ fontWeight: "bold" }}>
                        Description
                      </TableCell>
                      <TableCell sx={{ fontWeight: "bold" }} align="right">
                        Qty
                      </TableCell>
                      <TableCell sx={{ fontWeight: "bold" }} align="right">
                        Unit Price
                      </TableCell>
                      <TableCell sx={{ fontWeight: "bold" }} align="right">
                        Total
                      </TableCell>
                    </TableRow>
                    {invoice.lineItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell align="right">
                          {invoice.currency}
                          {item.unitPrice.toFixed(2)}
                        </TableCell>
                        <TableCell align="right">
                          {invoice.currency}
                          {item.total.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Summary */}
        <Grid size={{ xs: 12, md: 6 }} md-offset={6}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography>Subtotal:</Typography>
                <Typography>
                  {invoice.currency}
                  {invoice.subtotal.toFixed(2)}
                </Typography>
              </Box>

              {invoice.discount && invoice.discount > 0 && (
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography>
                    Discount ({invoice.discountPercent}%):
                  </Typography>
                  <Typography>
                    -{invoice.currency}
                    {invoice.discount.toFixed(2)}
                  </Typography>
                </Box>
              )}

              {invoice.tax > 0 && (
                <Box display="flex" justifyContent="space-between" mb={2}>
                  <Typography>Tax ({invoice.taxRate}%):</Typography>
                  <Typography>
                    {invoice.currency}
                    {invoice.tax.toFixed(2)}
                  </Typography>
                </Box>
              )}

              <Box
                display="flex"
                justifyContent="space-between"
                sx={{
                  borderTop: "2px solid #ccc",
                  pt: 2,
                  fontWeight: "bold",
                }}
              >
                <Typography variant="h6">Total:</Typography>
                <Typography variant="h6">
                  {invoice.currency}
                  {invoice.total.toFixed(2)}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Notes */}
        {invoice.notes && (
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" mb={1}>
                  Notes
                </Typography>
                <Typography>{invoice.notes}</Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Mark as Paid Dialog */}
      <Dialog
        open={markPaidDialogOpen}
        onClose={() => setMarkPaidDialogOpen(false)}
      >
        <DialogTitle>Mark as Paid</DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            label="Payment Method"
            value={paymentMethod}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setPaymentMethod(e.target.value)
            }
            sx={{ mt: 2 }}
          >
            <MenuItem value="stripe">Stripe</MenuItem>
            <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
            <MenuItem value="check">Check</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMarkPaidDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleMarkAsPaid} variant="contained">
            Mark as Paid
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
