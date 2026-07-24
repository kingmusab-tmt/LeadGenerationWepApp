"use client";
import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Tooltip,
  LinearProgress,
} from "@mui/material";
import { TrendingUp, Phone, PhoneMissed, Timer } from "@mui/icons-material";
import { formatDuration, formatDate } from "@/lib/formatUtils";
import { useDashboardTerms } from "@/app/hooks";

interface BuyerMetrics {
  _id: string;
  totalCalls: number;
  answeredCalls: number;
  missedCalls: number;
  totalDuration: number;
  avgDuration: number;
  totalUnitsCharged: number;
  qualifiedLeads: number;
  soldLeads: number;
  notInterested: number;
  wrongNumbers: number;
  callbackRequested: number;
  spamCalls: number;
  positiveSentiment: number;
  neutralSentiment: number;
  negativeSentiment: number;
  gradeA: number;
  gradeB: number;
  gradeC: number;
  gradeD: number;
  answerRate: number;
  conversionRate: number;
  lastCallDate: string;
  buyerInfo?: {
    company?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
  };
}

interface Summary {
  totalBuyers: number;
  totalCalls: number;
  totalAnswered: number;
  totalMissed: number;
  avgAnswerRate: number;
  avgConversionRate: number;
}

export default function BuyerPerformanceDashboard() {
  const terms = useDashboardTerms();
  const [buyers, setBuyers] = useState<BuyerMetrics[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    // Larger day ranges aggregate more documents and can take longer than
    // smaller ones — without this guard, switching from e.g. 90 days to 7
    // days could let the slower 90-day response resolve after the 7-day one
    // and silently overwrite the UI with the wrong period's data.
    let cancelled = false;

    const fetchPerformance = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/calls/buyer-performance?days=${days}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const body = await res.json();
        const data = body?.data ?? body;
        if (cancelled) return;
        setBuyers(data.buyers || []);
        setSummary(data.summary || null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchPerformance();
    return () => {
      cancelled = true;
    };
  }, [days]);


  const getBuyerName = (buyer: BuyerMetrics) => {
    if (buyer.buyerInfo?.company) return buyer.buyerInfo.company;
    if (buyer.buyerInfo?.firstName)
      return `${buyer.buyerInfo.firstName} ${buyer.buyerInfo.lastName || ""}`.trim();
    return buyer._id.slice(-6);
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h6">{terms.buyer} Performance</Typography>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Period</InputLabel>
          <Select
            value={days}
            onChange={(e) => setDays(e.target.value as number)}
            label="Period"
          >
            <MenuItem value={7}>Last 7 days</MenuItem>
            <MenuItem value={14}>Last 14 days</MenuItem>
            <MenuItem value={30}>Last 30 days</MenuItem>
            <MenuItem value={60}>Last 60 days</MenuItem>
            <MenuItem value={90}>Last 90 days</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Summary Cards */}
      {summary && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 2,
            mb: 3,
          }}
        >
          <Card variant="outlined">
            <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
              <Typography variant="caption" color="text.secondary">
                Active {terms.buyers}
              </Typography>
              <Typography variant="h5">{summary.totalBuyers}</Typography>
            </CardContent>
          </Card>
          <Card variant="outlined">
            <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
              <Typography variant="caption" color="text.secondary">
                Total Calls
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Phone fontSize="small" color="primary" />
                <Typography variant="h5">{summary.totalCalls}</Typography>
              </Box>
            </CardContent>
          </Card>
          <Card variant="outlined">
            <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
              <Typography variant="caption" color="text.secondary">
                Answered
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <TrendingUp fontSize="small" color="success" />
                <Typography variant="h5">{summary.totalAnswered}</Typography>
              </Box>
            </CardContent>
          </Card>
          <Card variant="outlined">
            <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
              <Typography variant="caption" color="text.secondary">
                Missed
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <PhoneMissed fontSize="small" color="error" />
                <Typography variant="h5">{summary.totalMissed}</Typography>
              </Box>
            </CardContent>
          </Card>
          <Card variant="outlined">
            <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
              <Typography variant="caption" color="text.secondary">
                Avg Answer Rate
              </Typography>
              <Typography variant="h5">
                {summary.avgAnswerRate.toFixed(1)}%
              </Typography>
            </CardContent>
          </Card>
          <Card variant="outlined">
            <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
              <Typography variant="caption" color="text.secondary">
                Avg Conversion
              </Typography>
              <Typography variant="h5">
                {summary.avgConversionRate.toFixed(1)}%
              </Typography>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Per-Buyer Table */}
      {buyers.length === 0 ? (
        <Alert severity="info">
          No call data found for the selected period.
        </Alert>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>{terms.buyer}</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">
                  Calls
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">
                  Answered
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">
                  Answer Rate
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">
                  Avg Duration
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">
                  Qualified
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">
                  Sold
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">
                  Conversion
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">
                  AI Grade
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">
                  Sentiment
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">
                  Other Dispositions
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">
                  Last Call
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {buyers.map((buyer) => (
                <TableRow key={buyer._id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {getBuyerName(buyer)}
                    </Typography>
                    {buyer.buyerInfo?.phone && (
                      <Typography variant="caption" color="text.secondary">
                        {buyer.buyerInfo.phone}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">{buyer.totalCalls}</TableCell>
                  <TableCell align="center">
                    {buyer.answeredCalls}
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                    >
                      {buyer.missedCalls} missed
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(buyer.answerRate, 100)}
                        color={
                          buyer.answerRate >= 70
                            ? "success"
                            : buyer.answerRate >= 40
                              ? "warning"
                              : "error"
                        }
                        sx={{ flex: 1, height: 6, borderRadius: 3 }}
                      />
                      <Typography variant="caption" sx={{ minWidth: 36 }}>
                        {buyer.answerRate.toFixed(0)}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip
                      title={`Total: ${formatDuration(buyer.totalDuration)}`}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 0.5,
                        }}
                      >
                        <Timer fontSize="inherit" />
                        <span>{formatDuration(buyer.avgDuration)}</span>
                      </Box>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={buyer.qualifiedLeads}
                      size="small"
                      color="success"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={buyer.soldLeads}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      color={
                        buyer.conversionRate >= 50
                          ? "success.main"
                          : buyer.conversionRate >= 20
                            ? "warning.main"
                            : "text.secondary"
                      }
                    >
                      {buyer.conversionRate.toFixed(1)}%
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Box
                      sx={{
                        display: "flex",
                        gap: 0.3,
                        justifyContent: "center",
                      }}
                    >
                      {buyer.gradeA > 0 && (
                        <Chip
                          label={`A:${buyer.gradeA}`}
                          size="small"
                          color="success"
                        />
                      )}
                      {buyer.gradeB > 0 && (
                        <Chip
                          label={`B:${buyer.gradeB}`}
                          size="small"
                          color="info"
                        />
                      )}
                      {buyer.gradeC > 0 && (
                        <Chip
                          label={`C:${buyer.gradeC}`}
                          size="small"
                          color="warning"
                        />
                      )}
                      {buyer.gradeD > 0 && (
                        <Chip
                          label={`D:${buyer.gradeD}`}
                          size="small"
                          color="error"
                        />
                      )}
                      {buyer.gradeA +
                        buyer.gradeB +
                        buyer.gradeC +
                        buyer.gradeD ===
                        0 && (
                        <Typography variant="caption" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Box
                      sx={{
                        display: "flex",
                        gap: 0.3,
                        justifyContent: "center",
                      }}
                    >
                      {buyer.positiveSentiment > 0 && (
                        <Tooltip title="Positive">
                          <Chip
                            label={`+${buyer.positiveSentiment}`}
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                        </Tooltip>
                      )}
                      {buyer.neutralSentiment > 0 && (
                        <Tooltip title="Neutral">
                          <Chip
                            label={`~${buyer.neutralSentiment}`}
                            size="small"
                            variant="outlined"
                          />
                        </Tooltip>
                      )}
                      {buyer.negativeSentiment > 0 && (
                        <Tooltip title="Negative">
                          <Chip
                            label={`-${buyer.negativeSentiment}`}
                            size="small"
                            color="error"
                            variant="outlined"
                          />
                        </Tooltip>
                      )}
                      {buyer.positiveSentiment +
                        buyer.neutralSentiment +
                        buyer.negativeSentiment ===
                        0 && (
                        <Typography variant="caption" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Box
                      sx={{
                        display: "flex",
                        gap: 0.3,
                        justifyContent: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      {buyer.notInterested > 0 && (
                        <Tooltip title="Not interested">
                          <Chip
                            label={`NI:${buyer.notInterested}`}
                            size="small"
                            variant="outlined"
                          />
                        </Tooltip>
                      )}
                      {buyer.wrongNumbers > 0 && (
                        <Tooltip title="Wrong number">
                          <Chip
                            label={`WN:${buyer.wrongNumbers}`}
                            size="small"
                            variant="outlined"
                          />
                        </Tooltip>
                      )}
                      {buyer.callbackRequested > 0 && (
                        <Tooltip title="Callback requested">
                          <Chip
                            label={`CB:${buyer.callbackRequested}`}
                            size="small"
                            color="info"
                            variant="outlined"
                          />
                        </Tooltip>
                      )}
                      {buyer.spamCalls > 0 && (
                        <Tooltip title="Spam">
                          <Chip
                            label={`Spam:${buyer.spamCalls}`}
                            size="small"
                            color="error"
                            variant="outlined"
                          />
                        </Tooltip>
                      )}
                      {buyer.notInterested +
                        buyer.wrongNumbers +
                        buyer.callbackRequested +
                        buyer.spamCalls ===
                        0 && (
                        <Typography variant="caption" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="caption" color="text.secondary">
                      {buyer.lastCallDate ? formatDate(buyer.lastCallDate) : "—"}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
