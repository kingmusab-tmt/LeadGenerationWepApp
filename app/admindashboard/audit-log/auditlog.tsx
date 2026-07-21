"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Paper,
} from "@mui/material";
import EmptyState from "@/app/components/generalComponent/EmptyState";
import HistoryOutlined from "@mui/icons-material/HistoryOutlined";

interface AuditEntry {
  _id: string;
  actorEmail: string;
  actorName?: string;
  actorRole?: string;
  action: string;
  targetType: string;
  targetId?: string;
  summary: string;
  createdAt: string;
}

function actionColor(action: string): "error" | "warning" | "default" {
  if (action.includes("delete") || action.includes("refund")) return "error";
  if (action.includes("update") || action.includes("status")) return "warning";
  return "default";
}

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [actorFilter, setActorFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLog = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: "100" });
        if (actionFilter !== "all") params.set("action", actionFilter);
        if (actorFilter) params.set("actorEmail", actorFilter);

        const response = await fetch(`/api/admin/audit-log?${params.toString()}`);
        if (!response.ok) {
          throw new Error("Failed to load audit log");
        }
        const payload = await response.json();
        setEntries(payload?.data?.entries || []);
        setActions(payload?.data?.actions || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load audit log");
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchLog, actorFilter ? 350 : 0);
    return () => clearTimeout(debounce);
  }, [actionFilter, actorFilter]);

  const handleActionChange = (e: SelectChangeEvent<string>) => {
    setActionFilter(e.target.value);
  };

  const actionOptions = useMemo(() => ["all", ...actions], [actions]);

  return (
    <Container sx={{ py: { xs: 3, sm: 4 } }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
        <HistoryOutlined color="action" />
        <Typography variant="h5" fontWeight={700}>
          Audit Log
        </Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Attribution trail for refunds, tier changes, and user management
        actions. Only covers actions performed since this log was added.
      </Typography>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>Action</InputLabel>
          <Select value={actionFilter} label="Action" onChange={handleActionChange}>
            {actionOptions.map((action) => (
              <MenuItem key={action} value={action}>
                {action === "all" ? "All actions" : action}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          size="small"
          label="Actor email"
          placeholder="Search by admin email"
          value={actorFilter}
          onChange={(e) => setActorFilter(e.target.value)}
          sx={{ minWidth: 240 }}
        />
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : entries.length === 0 ? (
        <EmptyState
          title="No matching audit entries"
          description="Sensitive admin actions — refunds, tier changes, user updates — will appear here as they happen."
        />
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>When</TableCell>
                <TableCell>Actor</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Target</TableCell>
                <TableCell>Summary</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry._id} hover>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    {new Date(entry.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {entry.actorName || entry.actorEmail}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {entry.actorEmail}
                      {entry.actorRole ? ` · ${entry.actorRole}` : ""}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={entry.action}
                      size="small"
                      color={actionColor(entry.action)}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    {entry.targetType}
                    {entry.targetId ? ` #${entry.targetId.slice(-6)}` : ""}
                  </TableCell>
                  <TableCell>{entry.summary}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
}
