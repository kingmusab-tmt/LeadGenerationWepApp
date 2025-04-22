import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Container,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Skeleton,
  Snackbar,
  Button,
  Modal,
  Alert,
  SelectChangeEvent,
} from "@mui/material";
import { MoreVert } from "@mui/icons-material";
import { useMediaQuery, Theme } from "@mui/material";
import axios from "axios";

interface LeadPurchaseHistoryProps {
  id: string;
}

interface Transaction {
  _id: string;
  type: string;
  amount: number;
  previousBalance: number;
  currentBalance: number;
  status: string;
  createdAt: string;
}

const LeadPurchaseHistory: React.FC<LeadPurchaseHistoryProps> = ({ id }) => {
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
  const [filterType, setFilterType] = useState("all");
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const isMobile = useMediaQuery((theme: Theme) =>
    theme.breakpoints.down("sm")
  );

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await axios.get(`/api/transactions?buyerId=${id}`);

        if (response.data && Array.isArray(response.data.data)) {
          setTransactions(response.data.data);
          setFilteredTransactions(response.data.data);
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
  }, [id]);

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

  const handleFilterChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value as string;
    setFilterType(value);

    if (value === "all") {
      setFilteredTransactions(transactions);
    } else {
      setFilteredTransactions(
        transactions.filter((transaction) => transaction.type === value)
      );
    }
  };

  const handleMenuClick = (
    event: React.MouseEvent<HTMLButtonElement>,
    transaction: Transaction
  ) => {
    setSelectedTransaction(transaction);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
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

      <Modal open={modalOpen} onClose={handleCloseModal}>
        <Box sx={{ p: 4, bgcolor: "background.paper", borderRadius: 2 }}>
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
                <strong>Previous Balance:</strong>
                {selectedTransaction.previousBalance}units
              </Typography>
              <Typography>
                <strong>Current Balance:</strong>
                {selectedTransaction.currentBalance}units
              </Typography>
              <Typography>
                <strong>Status:</strong> {selectedTransaction.status}
              </Typography>
              <Typography>
                <strong>Date:</strong>{" "}
                {new Date(selectedTransaction.createdAt).toLocaleString()}
              </Typography>
              {/* <Typography>
                <strong>Metadata:</strong>
                <pre>
                  {JSON.stringify(selectedTransaction.metadata, null, 2)}
                </pre>
              </Typography> */}
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

export default LeadPurchaseHistory;
