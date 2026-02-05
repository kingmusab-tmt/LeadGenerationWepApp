"use client";
import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
} from "@mui/material";
import { toast } from "react-toastify";

export default function SmsCampaignsPage() {
  const [items, setItems] = useState<
    Array<{
      _id: string;
      name: string;
      status: string;
      stats?: { sent?: number; delivered?: number; failed?: number };
    }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const res = await fetch("/api/sms-campaigns?limit=20");
        const data = await res.json();
        setItems(data.items || []);
      } catch {
        toast.error("Failed to load SMS campaigns");
      } finally {
        setLoading(false);
      }
    };
    void fetchCampaigns();
  }, []);

  if (loading)
    return (
      <Box p={3}>
        <CircularProgress />
      </Box>
    );
  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" mb={2}>
        <Typography variant="h4">SMS Campaigns</Typography>
        <Button
          href="/dashboard/seller/sms-campaigns/templates"
          variant="outlined"
        >
          Templates
        </Button>
      </Box>
      <Grid container spacing={2}>
        {items.map((c) => (
          <Grid size={{ xs: 12, md: 6 }} key={c._id}>
            <Card>
              <CardContent>
                <Typography variant="h6">{c.name}</Typography>
                <Typography color="text.secondary">
                  Status: {c.status}
                </Typography>
                <Typography variant="body2">
                  Sent: {c.stats?.sent || 0} • Delivered:{" "}
                  {c.stats?.delivered || 0} • Failed: {c.stats?.failed || 0}
                </Typography>
                <Box mt={2} display="flex" gap={1}>
                  <Button
                    href={`/dashboard/seller/sms-campaigns/${c._id}`}
                    variant="contained"
                  >
                    Open
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
