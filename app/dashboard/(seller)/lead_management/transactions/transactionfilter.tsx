import React from "react";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  useMediaQuery,
  useTheme,
  Box,
  IconButton,
  Menu,
  Typography,
  TextField,
} from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import { useDashboardTerms } from "@/app/hooks";

interface TransactionFilters {
  type: string;
  status: string;
  dateRange: string;
  // ISO date strings (yyyy-mm-dd), only meaningful when dateRange === "custom"
  startDate?: string;
  endDate?: string;
}

interface TransactionFiltersProps {
  filters: TransactionFilters;
  onFilterChange: (filters: TransactionFilters) => void;
  isMobile?: boolean;
}

const TransactionFilters: React.FC<TransactionFiltersProps> = ({
  filters,
  onFilterChange,
  isMobile: isMobileProp,
}) => {
  const theme = useTheme();
  const terms = useDashboardTerms();
  const isMobileFallback = useMediaQuery(theme.breakpoints.down("sm"));
  const isMobile = isMobileProp ?? isMobileFallback;
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleFilterChange = (e: SelectChangeEvent) => {
    onFilterChange({
      ...filters,
      [e.target.name]: e.target.value,
    });
  };

  const handleDateInputChange = (
    field: "startDate" | "endDate",
    value: string,
  ) => {
    onFilterChange({
      ...filters,
      [field]: value,
    });
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const renderDesktopFilters = () => (
    <Stack
      direction="row"
      spacing={2}
      alignItems="center"
      flexWrap="wrap"
      sx={{
        [theme.breakpoints.down("md")]: {
          gap: 1,
        },
      }}
    >
      {/* Transaction Type */}
      <FormControl size="small" sx={{ minWidth: isTablet ? 160 : 180 }}>
        <InputLabel>Transaction Type</InputLabel>
        <Select
          name="type"
          value={filters.type}
          onChange={handleFilterChange}
          label="Transaction Type"
        >
          <MenuItem value="all">All Types</MenuItem>
          <MenuItem value="lead_purchase">Lead Purchase</MenuItem>
          <MenuItem value="call_purchase">Call Purchase</MenuItem>
          <MenuItem value="units_purchase">Units Purchase</MenuItem>
          <MenuItem value="seller_income">{terms.org} Income</MenuItem>
          <MenuItem value="seller_payout">{terms.org} Payout</MenuItem>
          <MenuItem value="refund">Refund</MenuItem>
          <MenuItem value="admin_adjustment">Admin Adjustment</MenuItem>
          <MenuItem value="subscription_payment">Subscription Payment</MenuItem>
          <MenuItem value="subscription_renewal">Subscription Renewal</MenuItem>
          <MenuItem value="subscription_cancellation">
            Subscription Cancellation
          </MenuItem>
        </Select>
      </FormControl>

      {/* Status */}
      <FormControl size="small" sx={{ minWidth: isTablet ? 120 : 140 }}>
        <InputLabel>Status</InputLabel>
        <Select
          name="status"
          value={filters.status}
          onChange={handleFilterChange}
          label="Status"
        >
          <MenuItem value="all">All Statuses</MenuItem>
          <MenuItem value="pending">Pending</MenuItem>
          <MenuItem value="completed">Completed</MenuItem>
          <MenuItem value="failed">Failed</MenuItem>
          <MenuItem value="refunded">Refunded</MenuItem>
        </Select>
      </FormControl>

      {/* Date Range */}
      <FormControl size="small" sx={{ minWidth: isTablet ? 120 : 140 }}>
        <InputLabel>Date Range</InputLabel>
        <Select
          name="dateRange"
          value={filters.dateRange}
          onChange={handleFilterChange}
          label="Date Range"
        >
          <MenuItem value="all">All Time</MenuItem>
          <MenuItem value="week">Last 7 Days</MenuItem>
          <MenuItem value="month">Last 30 Days</MenuItem>
          <MenuItem value="custom">Custom Range</MenuItem>
        </Select>
      </FormControl>

      {filters.dateRange === "custom" && (
        <>
          <TextField
            type="date"
            label="From"
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
            value={filters.startDate || ""}
            onChange={(e) => handleDateInputChange("startDate", e.target.value)}
            sx={{ minWidth: 150 }}
          />
          <TextField
            type="date"
            label="To"
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
            value={filters.endDate || ""}
            onChange={(e) => handleDateInputChange("endDate", e.target.value)}
            sx={{ minWidth: 150 }}
          />
        </>
      )}
    </Stack>
  );

  const renderMobileFilters = () => (
    <>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Typography variant="subtitle1">Filters</Typography>
        <IconButton onClick={handleMenuOpen}>
          <FilterListIcon />
        </IconButton>
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            width: "80vw",
            maxWidth: 300,
            p: 2,
          },
        }}
      >
        {/* Transaction Type */}
        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Transaction Type</InputLabel>
          <Select
            name="type"
            value={filters.type}
            onChange={handleFilterChange}
            label="Transaction Type"
          >
            <MenuItem value="all">All Types</MenuItem>
            <MenuItem value="lead_purchase">Lead Purchase</MenuItem>
            <MenuItem value="call_purchase">Call Purchase</MenuItem>
            <MenuItem value="units_purchase">Units Purchase</MenuItem>
            <MenuItem value="seller_income">Seller Income</MenuItem>
            <MenuItem value="seller_payout">Seller Payout</MenuItem>
            <MenuItem value="refund">Refund</MenuItem>
            <MenuItem value="admin_adjustment">Admin Adjustment</MenuItem>
            <MenuItem value="subscription_payment">
              Subscription Payment
            </MenuItem>
            <MenuItem value="subscription_renewal">
              Subscription Renewal
            </MenuItem>
            <MenuItem value="subscription_cancellation">
              Subscription Cancellation
            </MenuItem>
          </Select>
        </FormControl>

        {/* Status */}
        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Status</InputLabel>
          <Select
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            label="Status"
          >
            <MenuItem value="all">All Statuses</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="failed">Failed</MenuItem>
            <MenuItem value="refunded">Refunded</MenuItem>
          </Select>
        </FormControl>

        {/* Date Range */}
        <FormControl fullWidth size="small">
          <InputLabel>Date Range</InputLabel>
          <Select
            name="dateRange"
            value={filters.dateRange}
            onChange={handleFilterChange}
            label="Date Range"
          >
            <MenuItem value="all">All Time</MenuItem>
            <MenuItem value="week">Last 7 Days</MenuItem>
            <MenuItem value="month">Last 30 Days</MenuItem>
            <MenuItem value="custom">Custom Range</MenuItem>
          </Select>
        </FormControl>

        {filters.dateRange === "custom" && (
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              type="date"
              label="From"
              size="small"
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
              value={filters.startDate || ""}
              onChange={(e) =>
                handleDateInputChange("startDate", e.target.value)
              }
            />
            <TextField
              type="date"
              label="To"
              size="small"
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
              value={filters.endDate || ""}
              onChange={(e) =>
                handleDateInputChange("endDate", e.target.value)
              }
            />
          </Stack>
        )}
      </Menu>
    </>
  );

  return <Box>{isMobile ? renderMobileFilters() : renderDesktopFilters()}</Box>;
};

export default TransactionFilters;
