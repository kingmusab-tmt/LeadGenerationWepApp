"use client";
import { useEffect, useState } from "react";
import { useSnackbar } from "notistack";
import { IBuyer } from "@/models/leadbuyers";
import {
  Paper,
  Typography,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";

interface ILead {
  fields: Array<{ label: string; value: string }>;
  _id: string; // Explicitly type _id as string
}

const AssignLeads = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [leads, setLeads] = useState<ILead[]>([]);
  const [leadBuyers, setLeadBuyers] = useState<IBuyer[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]); // Array of selected lead IDs
  const [selectedBuyers, setSelectedBuyers] = useState<string[]>([]); // Array of selected buyer IDs
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false); // Confirmation dialog state

  // Fetch leads and buyers on component mount
  useEffect(() => {
    fetch("/api/leads/getExclusiveleads")
      .then((res) => res.json())
      .then((data) => setLeads(data))
      .catch(() =>
        enqueueSnackbar("Failed to fetch leads", { variant: "error" })
      );

    fetch("/api/leads/getSpecialbuyer?preferredMethod=direct")
      .then((res) => res.json())
      .then((data) => setLeadBuyers(data))
      .catch(() =>
        enqueueSnackbar("Failed to fetch lead buyers", { variant: "error" })
      );
  }, [enqueueSnackbar]);

  // Handle lead selection
  const handleLeadSelection = (leadId: string) => {
    setSelectedLeads(
      (prev) =>
        prev.includes(leadId)
          ? prev.filter((id) => id !== leadId) // Deselect if already selected
          : [...prev, leadId] // Select if not already selected
    );
  };

  // Handle buyer selection
  const handleBuyerSelection = (buyerId: string) => {
    setSelectedBuyers(
      (prev) =>
        prev.includes(buyerId)
          ? prev.filter((id) => id !== buyerId) // Deselect if already selected
          : [...prev, buyerId] // Select if not already selected
    );
  };

  // Handle assignment confirmation
  const handleAssignConfirmation = () => {
    if (selectedLeads.length === 0 || selectedBuyers.length === 0) {
      enqueueSnackbar("Please select at least one lead and one buyer.", {
        variant: "info",
      });
      return;
    }
    setIsAssignDialogOpen(true); // Open confirmation dialog
  };

  // Handle assignment submission
  const handleAssignSubmit = async () => {
    try {
      const response = await fetch("/api/leads/assignExclusiveLead", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leadIds: selectedLeads,
          buyerIds: selectedBuyers,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        if (result.message === "All leads assigned successfully") {
          enqueueSnackbar(result.message, { variant: "success" });
        } else if (
          result.message === "Some assignments or notifications failed"
        ) {
          enqueueSnackbar(result.message, { variant: "warning" });
          // Display detailed errors for failed assignments or notifications
          result.assignmentResults.forEach(
            (assignment: {
              status: string;
              leadId: any;
              buyerId: any;
              error: any;
            }) => {
              if (assignment.status === "failed") {
                enqueueSnackbar(
                  `Failed to assign lead ${assignment.leadId} to buyer ${assignment.buyerId}: ${assignment.error}`,
                  { variant: "error" }
                );
              }
            }
          );
          result.notificationErrors.forEach(
            (notification: { leadId: any; buyerId: any; error: any }) => {
              enqueueSnackbar(
                `Failed to send notification for lead ${notification.leadId} to buyer ${notification.buyerId}: ${notification.error}`,
                { variant: "error" }
              );
            }
          );
        }
      } else {
        enqueueSnackbar(result.message || "Failed to assign leads", {
          variant: "error",
        });
      }

      // Refresh leads after assignment
      fetch("/api/leads/getExclusiveleads")
        .then((res) => res.json())
        .then((data) => setLeads(data))
        .catch(() =>
          enqueueSnackbar("Failed to refresh leads", { variant: "error" })
        );

      // Clear selections
      setSelectedLeads([]);
      setSelectedBuyers([]);
    } catch (error) {
      enqueueSnackbar("An error occurred while assigning leads.", {
        variant: "error",
      });
    } finally {
      setIsAssignDialogOpen(false); // Close confirmation dialog
    }
  };

  // Helper functions to extract name, email, and phone from lead fields
  const getNameField = (fields: Array<{ label: string; value: string }>) => {
    const nameRegex = /name|full name|first name|last name/i;
    const field = fields.find((f) => nameRegex.test(f.label));
    return field ? field.value : "—";
  };

  const getNumberField = (fields: Array<{ label: string; value: string }>) => {
    const numberRegex = /mobile|phone|number|contact/i;
    const field = fields.find((f) => numberRegex.test(f.label));
    return field ? field.value : "—";
  };

  const getEmailField = (fields: Array<{ label: string; value: string }>) => {
    const emailRegex = /email|e-mail/i;
    const field = fields.find((f) => emailRegex.test(f.label));
    return field ? field.value : "—";
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Assign Leads
      </Typography>

      <Box display="flex" flexDirection={{ xs: "column", md: "row" }} gap={2}>
        {/* Leads Column */}
        <Box flex={1}>
          <Typography variant="h6" gutterBottom>
            Available Leads
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Select</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Phone</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {leads.map((lead) => {
                  const name = getNameField(lead.fields);
                  const phone = getNumberField(lead.fields);
                  const email = getEmailField(lead.fields);

                  return (
                    <TableRow key={String(lead._id)} hover>
                      <TableCell>
                        <Checkbox
                          checked={selectedLeads.includes(lead._id)} // Check if lead is selected
                          onChange={() => handleLeadSelection(lead._id)} // Handle selection
                        />
                      </TableCell>
                      <TableCell>{name}</TableCell>
                      <TableCell>{email}</TableCell>
                      <TableCell>{phone}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* Buyers Column */}
        <Box flex={1}>
          <Typography variant="h6" gutterBottom>
            Lead Buyers (Direct)
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Select</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Preferences</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {leadBuyers.map((buyer) => (
                  <TableRow key={buyer._id} hover>
                    <TableCell>
                      <Checkbox
                        checked={selectedBuyers.includes(buyer._id)} // Check if buyer is selected
                        onChange={() => handleBuyerSelection(buyer._id)} // Handle selection
                      />
                    </TableCell>
                    <TableCell>{buyer.name}</TableCell>
                    <TableCell>{buyer.notificationPreferences}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Box>

      {/* Assign Button */}
      <Button
        variant="contained"
        color="primary"
        onClick={handleAssignConfirmation}
        sx={{ mt: 2 }}
      >
        Assign Selected Leads to Buyers
      </Button>

      {/* Confirmation Dialog */}
      <Dialog
        open={isAssignDialogOpen}
        onClose={() => setIsAssignDialogOpen(false)}
      >
        <DialogTitle>Confirm Assignment</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to assign {selectedLeads.length} lead(s) to{" "}
            {selectedBuyers.length} buyer(s)?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAssignDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAssignSubmit} color="primary">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default AssignLeads;
