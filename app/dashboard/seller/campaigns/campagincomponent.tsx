"use client";
import React, { useState, useEffect } from "react";
import UserDashboard from "../layout";
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
} from "@mui/material";
import { Edit, Delete, Add } from "@mui/icons-material";
import axios from "axios";

// Define the interface for a campaign
interface Campaign {
  campaignId: string;
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  budget?: number;
  status: "new" | "active" | "completed" | "draft";
}

const CampaignManagement: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(
    null
  );

  // Fetch campaigns from the backend
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const response = await axios.get<Campaign[]>("/api/campaigns");
        setCampaigns(response.data);
      } catch (error) {
        console.error("Error fetching campaigns", error);
      }
    };

    fetchCampaigns();
  }, []);

  // Handle dialog open/close
  const handleOpenDialog = (campaign: Campaign | null = null) => {
    setSelectedCampaign(campaign);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedCampaign(null);
  };

  // Handle campaign form submission
  const handleFormSubmit = async () => {
    if (selectedCampaign) {
      try {
        if (selectedCampaign.campaignId) {
          // Update campaign
          await axios.put(
            `/api/campaigns/${selectedCampaign.campaignId}`,
            selectedCampaign
          );
        } else {
          // Create campaign
          await axios.post(`/api/campaigns`, selectedCampaign);
        }

        // Refresh the campaigns list
        const response = await axios.get<Campaign[]>("/api/campaigns");
        setCampaigns(response.data);
        handleCloseDialog();
      } catch (error) {
        console.error("Error saving campaign", error);
      }
    }
  };

  // Handle campaign deletion
  const handleDeleteCampaign = async (campaignId: string) => {
    try {
      await axios.delete(`/api/campaigns/${campaignId}`);
      setCampaigns(
        campaigns.filter((campaign) => campaign.campaignId !== campaignId)
      );
    } catch (error) {
      console.error("Error deleting campaign", error);
    }
  };

  return (
    <UserDashboard>
      <Container>
        <Typography variant="h4" gutterBottom sx={{ marginTop: 4 }}>
          Campaigns Management
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Add Campaign
        </Button>

        <TableContainer component={Paper} sx={{ marginTop: 4 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Start Date</TableCell>
                <TableCell>End Date</TableCell>
                <TableCell>Budget</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow key={campaign.campaignId}>
                  <TableCell>{campaign.name}</TableCell>
                  <TableCell>{campaign.description || "N/A"}</TableCell>
                  <TableCell>
                    {new Date(campaign.startDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {campaign.endDate
                      ? new Date(campaign.endDate).toLocaleDateString()
                      : "N/A"}
                  </TableCell>
                  <TableCell>
                    {campaign.budget ? `$${campaign.budget}` : "N/A"}
                  </TableCell>
                  <TableCell>{campaign.status}</TableCell>
                  <TableCell>
                    <Tooltip title="Edit">
                      <IconButton
                        color="primary"
                        onClick={() => handleOpenDialog(campaign)}
                      >
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        color="secondary"
                        onClick={() =>
                          handleDeleteCampaign(campaign.campaignId)
                        }
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
            {selectedCampaign?.campaignId ? "Edit Campaign" : "Add Campaign"}
          </DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Name"
              margin="normal"
              value={selectedCampaign?.name || ""}
              onChange={(e) =>
                setSelectedCampaign((prev) => ({
                  ...prev!,
                  name: e.target.value,
                }))
              }
            />
            <TextField
              fullWidth
              label="Description"
              margin="normal"
              value={selectedCampaign?.description || ""}
              onChange={(e) =>
                setSelectedCampaign((prev) => ({
                  ...prev!,
                  description: e.target.value,
                }))
              }
            />
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              margin="normal"
              InputLabelProps={{ shrink: true }}
              value={selectedCampaign?.startDate || ""}
              onChange={(e) =>
                setSelectedCampaign((prev) => ({
                  ...prev!,
                  startDate: e.target.value,
                }))
              }
            />
            <TextField
              fullWidth
              label="End Date"
              type="date"
              margin="normal"
              InputLabelProps={{ shrink: true }}
              value={selectedCampaign?.endDate || ""}
              onChange={(e) =>
                setSelectedCampaign((prev) => ({
                  ...prev!,
                  endDate: e.target.value,
                }))
              }
            />
            <TextField
              fullWidth
              label="Budget"
              type="number"
              margin="normal"
              value={selectedCampaign?.budget || ""}
              onChange={(e) =>
                setSelectedCampaign((prev) => ({
                  ...prev!,
                  budget: Number(e.target.value),
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

export default CampaignManagement;
