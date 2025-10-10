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
  CircularProgress,
} from "@mui/material";
import LoadingComponent from "@/app/components/generalComponent/loadingcomponent";

interface ILead {
  fields: Array<{ label: string; value: string }>;
  _id: string;
}

const AssignLeads = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [leads, setLeads] = useState<ILead[]>([]);
  const [leadBuyers, setLeadBuyers] = useState<IBuyer[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [selectedBuyers, setSelectedBuyers] = useState<string[]>([]);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState({
    leads: true,
    buyers: true,
  });
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [assignmentResults, setAssignmentResults] = useState({
    leadCount: 0,
    buyerCount: 0,
  });

  // Fetch leads and buyers
  useEffect(() => {
    fetchLeads();
    fetchBuyers();
  }, []);

  const fetchLeads = async () => {
    setIsFetching((prev) => ({ ...prev, leads: true }));
    try {
      const res = await fetch("/api/leads/getExclusiveleads");
      const data = await res.json();
      setLeads(data);
    } catch (error) {
      enqueueSnackbar("Failed to fetch leads", { variant: "error" });
    } finally {
      setIsFetching((prev) => ({ ...prev, leads: false }));
    }
  };

  const fetchBuyers = async () => {
    setIsFetching((prev) => ({ ...prev, buyers: true }));
    try {
      const res = await fetch(
        "/api/leads/getSpecialbuyer?preferredMethod=direct"
      );
      const data = await res.json();
      setLeadBuyers(data);
    } catch (error) {
      enqueueSnackbar("Failed to fetch lead buyers", { variant: "error" });
    } finally {
      setIsFetching((prev) => ({ ...prev, buyers: false }));
    }
  };

  const handleLeadSelection = (leadId: string) => {
    setSelectedLeads((prev) =>
      prev.includes(leadId)
        ? prev.filter((id) => id !== leadId)
        : [...prev, leadId]
    );
  };

  const handleBuyerSelection = (buyerId: string) => {
    setSelectedBuyers((prev) =>
      prev.includes(buyerId)
        ? prev.filter((id) => id !== buyerId)
        : [...prev, buyerId]
    );
  };

  const handleAssignConfirmation = () => {
    if (selectedLeads.length === 0 || selectedBuyers.length === 0) {
      enqueueSnackbar("Please select at least one lead and one buyer.", {
        variant: "info",
      });
      return;
    }
    setIsAssignDialogOpen(true);
  };

  const handleAssignSubmit = async () => {
    setIsLoading(true);
    setIsAssignDialogOpen(false);

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
        setAssignmentResults({
          leadCount: selectedLeads.length,
          buyerCount: selectedBuyers.length,
        });
        setIsSuccessModalOpen(true);

        if (result.message === "Some assignments or notifications failed") {
          result.assignmentResults.forEach((assignment: any) => {
            if (assignment.status === "failed") {
              enqueueSnackbar(
                `Failed to assign lead ${assignment.leadId} to buyer ${assignment.buyerId}: ${assignment.error}`,
                { variant: "error" }
              );
            }
          });
          result.notificationErrors.forEach((notification: any) => {
            enqueueSnackbar(
              `Failed to send notification for lead ${notification.leadId} to buyer ${notification.buyerId}: ${notification.error}`,
              { variant: "error" }
            );
          });
        }
      } else {
        enqueueSnackbar(result.message || "Failed to assign leads", {
          variant: "error",
        });
      }

      await fetchLeads(); // Refresh leads after assignment
      setSelectedLeads([]);
      setSelectedBuyers([]);
    } catch (error) {
      enqueueSnackbar("An error occurred while assigning leads.", {
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper functions for field extraction
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

  const isLoadingData = isFetching.leads || isFetching.buyers;

  return (
    <Paper sx={{ mt: 6, p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Assign Leads
      </Typography>

      {isLoadingData ? (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="300px"
        >
          <LoadingComponent />
        </Box>
      ) : (
        <>
          <Box
            display="flex"
            flexDirection={{ xs: "column", md: "row" }}
            gap={2}
          >
            {/* Leads Column */}
            <Box flex={1}>
              <Typography variant="h6" gutterBottom>
                Available Leads
              </Typography>
              <TableContainer component={Paper}>
                {isFetching.leads ? (
                  <Box display="flex" justifyContent="center" p={3}>
                    <CircularProgress size={24} />
                  </Box>
                ) : (
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
                      {leads.map((lead) => (
                        <TableRow key={String(lead._id)} hover>
                          <TableCell>
                            <Checkbox
                              checked={selectedLeads.includes(lead._id)}
                              onChange={() => handleLeadSelection(lead._id)}
                            />
                          </TableCell>
                          <TableCell>{getNameField(lead.fields)}</TableCell>
                          <TableCell>{getEmailField(lead.fields)}</TableCell>
                          <TableCell>{getNumberField(lead.fields)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TableContainer>
            </Box>

            {/* Buyers Column */}
            <Box flex={1}>
              <Typography variant="h6" gutterBottom>
                Lead Buyers (Direct)
              </Typography>
              <TableContainer component={Paper}>
                {isFetching.buyers ? (
                  <Box display="flex" justifyContent="center" p={3}>
                    <CircularProgress size={24} />
                  </Box>
                ) : (
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
                              checked={selectedBuyers.includes(buyer._id)}
                              onChange={() => handleBuyerSelection(buyer._id)}
                            />
                          </TableCell>
                          <TableCell>{buyer.name}</TableCell>
                          <TableCell>{buyer.notificationPreferences}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TableContainer>
            </Box>
          </Box>

          <Button
            variant="contained"
            color="primary"
            onClick={handleAssignConfirmation}
            sx={{ mt: 2 }}
            disabled={
              isLoading || leads.length === 0 || leadBuyers.length === 0
            }
          >
            {isLoading ? (
              <LoadingComponent />
            ) : (
              "Assign Selected Leads to Buyers"
            )}
          </Button>
        </>
      )}

      {/* Assignment Confirmation Dialog */}
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
          <Button
            onClick={handleAssignSubmit}
            color="primary"
            disabled={isLoading}
          >
            {isLoading ? <LoadingComponent /> : "Confirm"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Dialog */}
      <Dialog
        open={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
      >
        <DialogTitle>Assignment Successful</DialogTitle>
        <DialogContent>
          <Typography>
            You have successfully assigned {assignmentResults.leadCount} lead(s)
            to {assignmentResults.buyerCount} buyer(s).
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsSuccessModalOpen(false)} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default AssignLeads;
