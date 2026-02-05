"use client";

import { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Card,
  CardContent,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
} from "@mui/material";
import { Delete as DeleteIcon, Add as AddIcon } from "@mui/icons-material";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unitPrice: 0, total: 0 },
  ]);
  const [formData, setFormData] = useState({
    buyerName: "",
    buyerEmail: "",
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    taxRate: 0,
    discountPercent: 0,
    notes: "",
    currency: "USD",
  });

  const updateLineItem = (index: number, field: string, value: unknown) => {
    const updated = [...lineItems];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const item = updated[index] as any;
    item[field] = value;

    // Recalculate total
    if (field === "quantity" || field === "unitPrice") {
      item.total =
        ((item.quantity as number) || 0) * ((item.unitPrice as number) || 0);
    }

    setLineItems(updated);
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { description: "", quantity: 1, unitPrice: 0, total: 0 },
    ]);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
    const discountAmount = (subtotal * (formData.discountPercent || 0)) / 100;
    const discountedSubtotal = subtotal - discountAmount;
    const tax = (discountedSubtotal * (formData.taxRate || 0)) / 100;
    const total = discountedSubtotal + tax;

    return { subtotal, discountAmount, tax, total };
  };

  const handleSubmit = async () => {
    try {
      if (lineItems.length === 0) {
        toast.error("Add at least one line item");
        return;
      }

      if (!formData.buyerName || !formData.dueDate) {
        toast.error("Please fill in required fields");
        return;
      }

      setLoading(true);

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          lineItems,
          dueDate: new Date(formData.dueDate),
          taxRate: parseFloat(formData.taxRate.toString()),
          discountPercent: parseFloat(formData.discountPercent.toString()),
        }),
      });

      if (res.ok) {
        const invoice = await res.json();
        toast.success("Invoice created successfully");
        router.push(`/dashboard/seller/invoices/${invoice._id}`);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to create invoice");
      }
    } catch (error) {
      console.error("Error creating invoice:", error);
      toast.error("Failed to create invoice");
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <Box p={3}>
      <Typography variant="h4" mb={3}>
        Create New Invoice
      </Typography>

      <Grid container spacing={3}>
        {/* Left Column - Invoice Details */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" mb={2}>
                Invoice Details
              </Typography>

              <Grid container spacing={2} mb={3}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Client Name"
                    value={formData.buyerName}
                    onChange={(e) =>
                      setFormData({ ...formData, buyerName: e.target.value })
                    }
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Client Email"
                    type="email"
                    value={formData.buyerEmail}
                    onChange={(e) =>
                      setFormData({ ...formData, buyerEmail: e.target.value })
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Due Date"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) =>
                      setFormData({ ...formData, dueDate: e.target.value })
                    }
                    InputLabelProps={{ shrink: true }}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    select
                    fullWidth
                    label="Currency"
                    value={formData.currency}
                    onChange={(e) =>
                      setFormData({ ...formData, currency: e.target.value })
                    }
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="CAD">CAD</option>
                  </TextField>
                </Grid>
              </Grid>

              {/* Line Items */}
              <Typography variant="h6" mb={2}>
                Line Items
              </Typography>

              <TableContainer component={Paper} sx={{ mb: 2 }}>
                <Table>
                  <TableHead>
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
                      <TableCell align="center">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lineItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <TextField
                            size="small"
                            value={item.description}
                            onChange={(e) =>
                              updateLineItem(
                                index,
                                "description",
                                e.target.value,
                              )
                            }
                            placeholder="Service/Product"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            size="small"
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              updateLineItem(
                                index,
                                "quantity",
                                parseFloat(e.target.value),
                              )
                            }
                            variant="outlined"
                            sx={{ width: "80px" }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            size="small"
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateLineItem(
                                index,
                                "unitPrice",
                                parseFloat(e.target.value),
                              )
                            }
                            variant="outlined"
                            sx={{ width: "100px" }}
                            inputProps={{ step: "0.01" }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          ${item.total.toFixed(2)}
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={() => removeLineItem(index)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Button
                startIcon={<AddIcon />}
                onClick={addLineItem}
                variant="outlined"
              >
                Add Line Item
              </Button>

              {/* Notes */}
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                sx={{ mt: 3 }}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column - Summary */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" mb={2}>
                Invoice Summary
              </Typography>

              <Box mb={2}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography>Subtotal:</Typography>
                  <Typography>${totals.subtotal.toFixed(2)}</Typography>
                </Box>

                <TextField
                  fullWidth
                  type="number"
                  label="Discount %"
                  size="small"
                  value={formData.discountPercent}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      discountPercent: parseFloat(e.target.value) || 0,
                    })
                  }
                  sx={{ mb: 1 }}
                  inputProps={{ step: "0.01" }}
                />

                {totals.discountAmount > 0 && (
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography>Discount:</Typography>
                    <Typography>
                      -${totals.discountAmount.toFixed(2)}
                    </Typography>
                  </Box>
                )}

                <TextField
                  fullWidth
                  type="number"
                  label="Tax %"
                  size="small"
                  value={formData.taxRate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      taxRate: parseFloat(e.target.value) || 0,
                    })
                  }
                  sx={{ mb: 1 }}
                  inputProps={{ step: "0.01" }}
                />

                {totals.tax > 0 && (
                  <Box display="flex" justifyContent="space-between" mb={2}>
                    <Typography>Tax:</Typography>
                    <Typography>${totals.tax.toFixed(2)}</Typography>
                  </Box>
                )}

                <Box
                  display="flex"
                  justifyContent="space-between"
                  sx={{ borderTop: "2px solid #ccc", pt: 2 }}
                >
                  <Typography variant="h6">Total:</Typography>
                  <Typography variant="h6">
                    ${totals.total.toFixed(2)}
                  </Typography>
                </Box>
              </Box>

              <Box display="flex" gap={1} flexDirection="column">
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  Create Invoice
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  href="/dashboard/seller/invoices"
                >
                  Cancel
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
