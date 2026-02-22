import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  Snackbar,
  Alert,
} from "@mui/material";
import LoadingComponent from "./generalComponent/loadingcomponent";

interface LeadBuyer {
  _id: string;
  name: string;
  phoneNumber: string;
}

export default function SellerDashboard() {
  const [buyers, setBuyers] = useState<LeadBuyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info" | "warning";
  }>({ open: false, message: "", severity: "info" });

  useEffect(() => {
    fetch("/api/sellers/buyers")
      .then((res) => res.json())
      .then((data) => {
        setBuyers(data);
        setLoading(false);
      });
  }, []);

  const assignBuyer = (buyerId: string) => {
    fetch("/api/sellers/assign-buyer", {
      method: "POST",
      body: JSON.stringify({ buyerId }),
      headers: { "Content-Type": "application/json" },
    })
      .then(() => {
        setSnackbar({
          open: true,
          message: "Buyer assigned successfully!",
          severity: "success",
        });
      })
      .catch(() => {
        setSnackbar({
          open: true,
          message: "Failed to assign buyer.",
          severity: "error",
        });
      });
  };

  if (loading) return <LoadingComponent />;

  return (
    <>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Phone Number</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {buyers.map((buyer) => (
            <TableRow key={buyer._id}>
              <TableCell>{buyer.name}</TableCell>
              <TableCell>{buyer.phoneNumber}</TableCell>
              <TableCell>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => assignBuyer(buyer._id)}
                >
                  Assign Buyer
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
