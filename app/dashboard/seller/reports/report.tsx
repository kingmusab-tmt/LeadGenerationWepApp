"use client";
import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Select,
  MenuItem,
} from "@mui/material";
import { Edit, Delete, Add } from "@mui/icons-material";
import axios from "@/lib/axiosInstance";
import UserDashboard from "../layout";

// Define the interface for a report
interface Report {
  reportId: string;
  type: "performance" | "revenue";
  content: object;
  generatedAt: string;
  filters?: object;
}

const ReportsManagement: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  // Fetch reports from the backend
  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await axios.get<Report[]>("/api/reports");
        setReports(response.data);
      } catch (error) {
        console.error("Error fetching reports", error);
      }
    };

    fetchReports();
  }, []);

  // Handle dialog open/close
  const handleOpenDialog = (report: Report | null = null) => {
    setSelectedReport(report);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedReport(null);
  };

  // Handle report form submission
  const handleFormSubmit = async () => {
    if (selectedReport) {
      try {
        if (selectedReport.reportId) {
          // Update report
          await axios.put(
            `/api/reports/${selectedReport.reportId}`,
            selectedReport,
          );
        } else {
          // Create report
          await axios.post(`/api/reports`, selectedReport);
        }

        // Refresh the reports list
        const response = await axios.get<Report[]>("/api/reports");
        setReports(response.data);
        handleCloseDialog();
      } catch (error) {
        console.error("Error saving report", error);
      }
    }
  };

  // Handle report deletion
  const handleDeleteReport = async (reportId: string) => {
    try {
      await axios.delete(`/api/reports/${reportId}`);
      setReports(reports.filter((report) => report.reportId !== reportId));
    } catch (error) {
      console.error("Error deleting report", error);
    }
  };

  return (
    <UserDashboard>
      <Container>
        <Typography variant="h4" gutterBottom>
          Reports Management
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Add Report
        </Button>

        <TableContainer component={Paper} sx={{ marginTop: 4 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Type</TableCell>
                <TableCell>Generated At</TableCell>
                <TableCell>Filters</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.reportId}>
                  <TableCell>{report.type}</TableCell>
                  <TableCell>
                    {new Date(report.generatedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {report.filters ? JSON.stringify(report.filters) : "N/A"}
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Edit">
                      <IconButton
                        color="primary"
                        onClick={() => handleOpenDialog(report)}
                      >
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        color="secondary"
                        onClick={() => handleDeleteReport(report.reportId)}
                      >
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>
            {selectedReport?.reportId ? "Edit Report" : "Add Report"}
          </DialogTitle>
          <DialogContent>
            <Select
              fullWidth
              value={selectedReport?.type || ""}
              onChange={(e) =>
                setSelectedReport((prev) => ({
                  ...prev!,
                  type: e.target.value as "performance" | "revenue",
                }))
              }
              displayEmpty
            >
              <MenuItem value="">Select Report Type</MenuItem>
              <MenuItem value="performance">Performance</MenuItem>
              <MenuItem value="revenue">Revenue</MenuItem>
            </Select>
            <TextField
              fullWidth
              label="Filters"
              margin="normal"
              value={
                selectedReport?.filters
                  ? JSON.stringify(selectedReport.filters)
                  : ""
              }
              onChange={(e) =>
                setSelectedReport((prev) => ({
                  ...prev!,
                  filters: e.target.value ? JSON.parse(e.target.value) : {},
                }))
              }
            />
            <TextField
              fullWidth
              label="Content"
              margin="normal"
              value={
                selectedReport?.content
                  ? JSON.stringify(selectedReport.content)
                  : ""
              }
              onChange={(e) =>
                setSelectedReport((prev) => ({
                  ...prev!,
                  content: e.target.value ? JSON.parse(e.target.value) : {},
                }))
              }
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} color="secondary">
              Cancel
            </Button>
            <Button
              onClick={handleFormSubmit}
              color="primary"
              variant="contained"
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </UserDashboard>
  );
};

export default ReportsManagement;
