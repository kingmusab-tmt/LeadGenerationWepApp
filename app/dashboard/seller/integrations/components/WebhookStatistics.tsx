/**
 * Webhook Statistics Component
 * Display webhook activity, statistics, and monitoring
 *
 * Date: January 21, 2026
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
} from "@mui/icons-material";

interface WebhookLog {
  id: string;
  url: string;
  event: string;
  status: "success" | "failed" | "pending";
  statusCode?: number;
  attemptCount: number;
  timestamp: string;
  responseTime?: number;
  error?: string;
}

interface WebhookStats {
  totalWebhooks: number;
  activeWebhooks: number;
  total24h: number;
  successful24h: number;
  failed24h: number;
  avgResponseTime: number;
}

interface Props {
  onNotify: (
    message: string,
    severity?: "success" | "error" | "info" | "warning",
  ) => void;
}

export default function WebhookStatistics({ onNotify }: Props) {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<WebhookStats>({
    totalWebhooks: 0,
    activeWebhooks: 0,
    total24h: 0,
    successful24h: 0,
    failed24h: 0,
    avgResponseTime: 0,
  });
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [filter, setFilter] = useState<"all" | "success" | "failed">("all");
  const [eventFilter, setEventFilter] = useState<string>("all");

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/integrations/webhooks/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to load webhook stats:", error);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.append("status", filter);
      if (eventFilter !== "all") params.append("event", eventFilter);

      const res = await fetch(
        `/api/integrations/webhooks/logs?${params.toString()}`,
      );
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error("Failed to load webhook logs:", error);
    } finally {
      setLoading(false);
    }
  }, [filter, eventFilter]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleRefresh = () => {
    loadStats();
    loadLogs();
    onNotify("Statistics refreshed", "success");
  };

  const getSuccessRate = () => {
    if (stats.total24h === 0) return "0";
    return ((stats.successful24h / stats.total24h) * 100).toFixed(1);
  };

  return (
    <Box>
      <Box
        sx={{
          mb: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <Typography variant="h6" gutterBottom>
            Webhook Activity & Statistics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Monitor webhook dispatches and performance
          </Typography>
        </div>
        <IconButton onClick={handleRefresh}>
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid size={{ xs: 6, md: 2 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="body2" gutterBottom>
                Total Webhooks
              </Typography>
              <Typography variant="h4">{stats.totalWebhooks}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 2 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="body2" gutterBottom>
                Active
              </Typography>
              <Typography variant="h4" color="success.main">
                {stats.activeWebhooks}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 2 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="body2" gutterBottom>
                Sent (24h)
              </Typography>
              <Typography variant="h4">{stats.total24h}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 2 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="body2" gutterBottom>
                Success Rate
              </Typography>
              <Typography variant="h4" color="success.main">
                {getSuccessRate()}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 2 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="body2" gutterBottom>
                Failed (24h)
              </Typography>
              <Typography variant="h4" color="error.main">
                {stats.failed24h}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 2 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="body2" gutterBottom>
                Avg Response
              </Typography>
              <Typography variant="h4">{stats.avgResponseTime}ms</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filter}
                  label="Status"
                  onChange={(e) =>
                    setFilter(e.target.value as "all" | "success" | "failed")
                  }
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="success">Success</MenuItem>
                  <MenuItem value="failed">Failed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Event Type</InputLabel>
                <Select
                  value={eventFilter}
                  label="Event Type"
                  onChange={(e) => setEventFilter(e.target.value)}
                >
                  <MenuItem value="all">All Events</MenuItem>
                  <MenuItem value="lead_created">Lead Created</MenuItem>
                  <MenuItem value="lead_updated">Lead Updated</MenuItem>
                  <MenuItem value="lead_qualified">Lead Qualified</MenuItem>
                  <MenuItem value="lead_assigned">Lead Assigned</MenuItem>
                  <MenuItem value="lead_sold">Lead Sold</MenuItem>
                  <MenuItem value="deal_created">Deal Created</MenuItem>
                  <MenuItem value="deal_won">Deal Won</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Button variant="outlined" fullWidth onClick={loadLogs}>
                Apply Filters
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Activity Log */}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom fontWeight="bold">
            Recent Activity
          </Typography>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : logs.length === 0 ? (
            <Alert severity="info" icon={<InfoIcon />}>
              No webhook activity found
            </Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Timestamp</TableCell>
                    <TableCell>Event</TableCell>
                    <TableCell>Webhook URL</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Response Time</TableCell>
                    <TableCell>Attempts</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Chip label={log.event} size="small" />
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          noWrap
                          sx={{ maxWidth: 300 }}
                        >
                          {log.url}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={
                            log.status === "success" ? (
                              <CheckCircleIcon />
                            ) : (
                              <ErrorIcon />
                            )
                          }
                          label={log.status}
                          color={
                            log.status === "success"
                              ? "success"
                              : log.status === "failed"
                                ? "error"
                                : "default"
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {log.responseTime ? `${log.responseTime}ms` : "-"}
                      </TableCell>
                      <TableCell>{log.attemptCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
