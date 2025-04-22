"use client";
import React, { useEffect, useState } from "react";
import {
  Button,
  List,
  ListItem,
  ListItemText,
  Typography,
  Skeleton,
  CircularProgress,
  Container,
} from "@mui/material";
import { useSnackbar } from "notistack";

interface ILead {
  _id: string;
  fields: Array<{ id: string; label: string; value: string }>;
  status: string;
}

const AssignedLeads: React.FC = () => {
  const [leads, setLeads] = useState<ILead[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const { enqueueSnackbar } = useSnackbar(); // Snackbar hook

  // Fetch assigned leads
  const fetchLeads = async () => {
    try {
      const response = await fetch(`/api/buyers/getAssignedLeads`);
      const data = await response.json();
      if (response.ok) {
        setLeads(data.leads);
      } else {
        console.error("Error fetching leads:", data.error);
        enqueueSnackbar(data.error || "Failed to fetch leads", {
          variant: "error",
        });
      }
    } catch (error) {
      console.error("Error fetching leads:", error);
      enqueueSnackbar("An error occurred while fetching leads", {
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleAcceptOrReject = async (
    leadId: string,
    action: "accept" | "reject"
  ) => {
    setActionLoading(true);
    try {
      const response = await fetch("/api/buyers/acceptOrRejectlead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, action }),
      });
      const result = await response.json();

      if (response.ok) {
        // If the lead was accepted, refetch the leads to get updated information
        if (action === "accept") {
          await fetchLeads();
        }
        enqueueSnackbar(result.message, { variant: "success" }); // Success message
      } else {
        enqueueSnackbar(result.error || "Failed to process request", {
          variant: "error",
        }); // Error message
      }
    } catch (error) {
      console.error("Error accepting/rejecting lead:", error);
      enqueueSnackbar("An error occurred while processing your request", {
        variant: "error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton
            key={index}
            variant="rectangular"
            height={100}
            sx={{ mb: 2 }}
          />
        ))}
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <Typography variant="body1" align="center" sx={{ mt: 4 }}>
        No assigned leads available.
      </Typography>
    );
  }

  return (
    <Container sx={{ mt: 5 }}>
      <Typography variant="h6" gutterBottom>
        Assigned Leads
      </Typography>
      <List>
        {leads.map((lead) => (
          <ListItem key={lead._id}>
            <ListItemText
              primary={
                <Typography component="span" variant="body1">
                  Lead Detail
                </Typography>
              }
              secondary={
                <>
                  {lead.fields.map((field) => (
                    <Typography
                      key={field.id}
                      component="span"
                      variant="body2"
                      display="block"
                    >
                      {field.label}: {field.value}
                    </Typography>
                  ))}
                  <Typography component="span" variant="body2" display="block">
                    Status: {lead.status}
                  </Typography>
                </>
              }
            />
            {lead.status === "assigned" && (
              <>
                <Button
                  onClick={() => handleAcceptOrReject(lead._id, "accept")}
                  disabled={actionLoading}
                >
                  {actionLoading ? <CircularProgress size={20} /> : "Accept"}
                </Button>
                <Button
                  onClick={() => handleAcceptOrReject(lead._id, "reject")}
                  disabled={actionLoading}
                  color="error"
                >
                  {actionLoading ? <CircularProgress size={20} /> : "Reject"}
                </Button>
              </>
            )}
          </ListItem>
        ))}
      </List>
    </Container>
  );
};

export default AssignedLeads;
