"use client";
import { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from "@mui/material";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import InfoIcon from "@mui/icons-material/Info";

interface BuyerLocationInfo {
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  serviceLocations: {
    city: string;
    state: string;
    country: string;
    radius?: number;
    zipCodes?: string[];
  }[];
  locationMatchingStrict: boolean;
  isActive: boolean;
  priority: number;
}

export default function LocationRoutingDashboard() {
  const [buyers, setBuyers] = useState<BuyerLocationInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalBuyers: 0,
    buyersWithLocations: 0,
    totalServiceAreas: 0,
    strictMatchingBuyers: 0,
  });

  useEffect(() => {
    fetchBuyersLocationInfo();
  }, []);

  const fetchBuyersLocationInfo = async () => {
    setLoadError(null);
    try {
      // The default page size is 20 — fetch the schema's max (100) instead
      // so the stats below reflect the seller's whole buyer list rather
      // than just its first page, for any seller with a realistic buyer
      // count. `counts.total` (from the server's unfiltered aggregate) is
      // used for the "Total Buyers" card specifically, since that one stays
      // accurate even past 100.
      const response = await fetch("/api/buyers?limit=100");
      const result = await response.json();

      if (result.success) {
        const data = result.data;
        const buyersData: BuyerLocationInfo[] = data.buyers.map(
          (buyer: unknown) => {
            const b = buyer as Record<string, unknown>;
            const serviceLocationsArray = b.serviceLocations as
              | Record<string, unknown>[]
              | undefined;
            const serviceLocations = (serviceLocationsArray || []).map(
              (loc: Record<string, unknown>) => ({
                city: (loc.city as string) || "",
                state: (loc.state as string) || "",
                country: (loc.country as string) || "USA",
                radius: loc.radius as number | undefined,
                zipCodes: (loc.zipCodes as string[]) || [],
              }),
            );

            return {
              buyerId: b._id as string,
              buyerName: b.name as string,
              buyerEmail: b.email as string,
              serviceLocations,
              locationMatchingStrict:
                (b.locationMatchingStrict as boolean) || false,
              isActive: b.isActive as boolean,
              priority: b.priority as number,
            };
          },
        );

        setBuyers(buyersData);

        // Calculate stats
        const totalServiceAreas = buyersData.reduce(
          (sum, buyer) => sum + buyer.serviceLocations.length,
          0,
        );
        const buyersWithLocations = buyersData.filter(
          (buyer) => buyer.serviceLocations.length > 0,
        ).length;
        const strictMatchingBuyers = buyersData.filter(
          (buyer) => buyer.locationMatchingStrict,
        ).length;

        setStats({
          totalBuyers: data.counts?.total ?? buyersData.length,
          buyersWithLocations,
          totalServiceAreas,
          strictMatchingBuyers,
        });
      } else {
        setLoadError(result.error || "Failed to load buyer location data");
      }
    } catch (error) {
      console.error("Error fetching buyers location info:", error);
      setLoadError("Failed to load buyer location data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        Location-Based Lead Routing
      </Typography>

      {loadError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {loadError}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Buyers
              </Typography>
              <Typography variant="h4">{stats.totalBuyers}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Buyers with Locations
              </Typography>
              <Typography variant="h4" color="primary">
                {stats.buyersWithLocations}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {stats.totalBuyers > 0
                  ? Math.round(
                      (stats.buyersWithLocations / stats.totalBuyers) * 100,
                    )
                  : 0}
                % configured
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Service Areas
              </Typography>
              <Typography variant="h4">{stats.totalServiceAreas}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Strict Matching
              </Typography>
              <Typography variant="h4" color="error">
                {stats.strictMatchingBuyers}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Buyers only accepting location matches
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Info Alert */}
      <Alert severity="info" sx={{ mb: 3 }} icon={<InfoIcon />}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
          How Location-Based Routing Works:
        </Typography>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li>
            Leads are automatically matched to buyers based on their service
            locations
          </li>
          <li>
            Buyers with matching locations are prioritized in the assignment
            queue
          </li>
          <li>
            Buyers with strict matching enabled will ONLY receive leads from
            their service areas
          </li>
          <li>
            Buyers without strict matching will receive all leads, but local
            leads are prioritized
          </li>
        </ul>
      </Alert>

      {/* Buyers Location Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Buyer</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Service Locations</TableCell>
                <TableCell align="center">Strict Match</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {buyers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography color="textSecondary">
                      No buyers found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                buyers.map((buyer) => (
                  <TableRow key={buyer.buyerId}>
                    <TableCell>
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {buyer.buyerName}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {buyer.buyerEmail}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={buyer.isActive ? "Active" : "Inactive"}
                        color={buyer.isActive ? "success" : "default"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`Priority ${buyer.priority}`}
                        color="primary"
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      {buyer.serviceLocations.length === 0 ? (
                        <Typography variant="body2" color="textSecondary">
                          No locations configured
                        </Typography>
                      ) : (
                        <Box
                          sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}
                        >
                          {buyer.serviceLocations.map((location, index) => (
                            <Tooltip
                              key={index}
                              title={
                                <Box>
                                  <Typography variant="caption">
                                    Radius: {location.radius || 25} miles
                                  </Typography>
                                  {location.zipCodes &&
                                    location.zipCodes.length > 0 && (
                                      <Typography
                                        variant="caption"
                                        display="block"
                                      >
                                        Zip Codes:{" "}
                                        {location.zipCodes.join(", ")}
                                      </Typography>
                                    )}
                                </Box>
                              }
                            >
                              <Chip
                                icon={<LocationOnIcon />}
                                label={`${location.city}, ${location.state}`}
                                size="small"
                                variant="outlined"
                                color="primary"
                              />
                            </Tooltip>
                          ))}
                        </Box>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {buyer.locationMatchingStrict ? (
                        <Tooltip title="Only accepts leads from service locations">
                          <CheckCircleIcon color="error" />
                        </Tooltip>
                      ) : (
                        <Tooltip title="Accepts all leads, prioritizes local">
                          <CancelIcon color="success" />
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Summary */}
      {stats.buyersWithLocations === 0 && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          No buyers have configured service locations yet. Buyers can add
          service locations in their settings to enable location-based lead
          routing.
        </Alert>
      )}
    </Box>
  );
}
