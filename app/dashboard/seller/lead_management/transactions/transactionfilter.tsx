// import React from "react";
// import {
//   FormControl,
//   InputLabel,
//   MenuItem,
//   Select,
//   SelectChangeEvent,
//   Stack,
// } from "@mui/material";

// interface TransactionFiltersProps {
//   filters: {
//     type: string;
//     status: string;
//     dateRange: string;
//   };
//   onFilterChange: (filters: any) => void;
// }

// const TransactionFilters: React.FC<TransactionFiltersProps> = ({
//   filters,
//   onFilterChange,
// }) => {
//   const handleFilterChange = (e: SelectChangeEvent) => {
//     onFilterChange({
//       ...filters,
//       [e.target.name]: e.target.value,
//     });
//   };

//   return (
//     <Stack direction="row" spacing={2} alignItems="center">
//       <FormControl size="small" sx={{ minWidth: 120 }}>
//         <InputLabel>Type</InputLabel>
//         <Select
//           name="type"
//           value={filters.type}
//           onChange={handleFilterChange}
//           label="Type"
//         >
//           <MenuItem value="all">All Types</MenuItem>
//           <MenuItem value="deposit">Deposit</MenuItem>
//           <MenuItem value="withdrawal">Withdrawal</MenuItem>
//           <MenuItem value="transfer">Transfer</MenuItem>
//         </Select>
//       </FormControl>

//       <FormControl size="small" sx={{ minWidth: 120 }}>
//         <InputLabel>Status</InputLabel>
//         <Select
//           name="status"
//           value={filters.status}
//           onChange={handleFilterChange}
//           label="Status"
//         >
//           <MenuItem value="all">All Statuses</MenuItem>
//           <MenuItem value="completed">Completed</MenuItem>
//           <MenuItem value="pending">Pending</MenuItem>
//           <MenuItem value="failed">Failed</MenuItem>
//         </Select>
//       </FormControl>

//       <FormControl size="small" sx={{ minWidth: 120 }}>
//         <InputLabel>Date Range</InputLabel>
//         <Select
//           name="dateRange"
//           value={filters.dateRange}
//           onChange={handleFilterChange}
//           label="Date Range"
//         >
//           <MenuItem value="all">All Time</MenuItem>
//           <MenuItem value="week">Last 7 Days</MenuItem>
//           <MenuItem value="month">Last 30 Days</MenuItem>
//         </Select>
//       </FormControl>
//     </Stack>
//   );
// };

// export default TransactionFilters;
import React from "react";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
} from "@mui/material";

interface TransactionFiltersProps {
  filters: {
    type: string;
    status: string;
    dateRange: string;
    startDate?: Date | null;
    endDate?: Date | null;
    // paymentGateway: string;
    // currency: string;
  };
  onFilterChange: (filters: any) => void;
  isMobile: any;
}

const TransactionFilters: React.FC<TransactionFiltersProps> = ({
  filters,
  onFilterChange,
}) => {
  const handleFilterChange = (e: SelectChangeEvent) => {
    onFilterChange({
      ...filters,
      [e.target.name]: e.target.value,
    });
  };

  // const handleDateChange = (
  //   field: "startDate" | "endDate",
  //   value: Date | null
  // ) => {
  //   onFilterChange({
  //     ...filters,
  //     [field]: value,
  //   });
  // };

  return (
    // <LocalizationProvider dateAdapter={AdapterDateFns}>
    <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
      {/* Transaction Type */}
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel>Transaction Type</InputLabel>
        <Select
          name="type"
          value={filters.type}
          onChange={handleFilterChange}
          label="Transaction Type"
        >
          <MenuItem value="all">All Types</MenuItem>
          <MenuItem value="lead_purchase">Lead Purchase</MenuItem>
          <MenuItem value="units_purchase">Units Purchase</MenuItem>
          <MenuItem value="seller_income">Seller Income</MenuItem>
          <MenuItem value="seller_payout">Seller Payout</MenuItem>
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
      <FormControl size="small" sx={{ minWidth: 120 }}>
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

      {/* Payment Gateway
      <FormControl size="small" sx={{ minWidth: 120 }}>
        <InputLabel>Payment Gateway</InputLabel>
        <Select
          name="paymentGateway"
          value={filters.paymentGateway}
          onChange={handleFilterChange}
          label="Payment Gateway"
        >
          <MenuItem value="all">All Gateways</MenuItem>
          <MenuItem value="stripe">Stripe</MenuItem>
          <MenuItem value="paypal">PayPal</MenuItem>
          <MenuItem value="square">Square</MenuItem>
          <MenuItem value="manual">Manual</MenuItem>
        </Select>
      </FormControl> */}

      {/* Currency
      <FormControl size="small" sx={{ minWidth: 100 }}>
        <InputLabel>Currency</InputLabel>
        <Select
          name="currency"
          value={filters.currency}
          onChange={handleFilterChange}
          label="Currency"
        >
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="USD">USD</MenuItem>
          <MenuItem value="EUR">EUR</MenuItem>
          <MenuItem value="GBP">GBP</MenuItem>
        </Select>
      </FormControl> */}

      {/* Date Range */}
      <FormControl size="small" sx={{ minWidth: 120 }}>
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

      {/* Custom Date Range Pickers (Conditional)
        {filters.dateRange === "custom" && (
          <>
            <DatePicker
              label="Start Date"
              value={filters.startDate}
              onChange={(date) => handleDateChange("startDate", date)}
              renderInput={(params) => (
                <TextField {...params} size="small" sx={{ minWidth: 150 }} />
              )}
            />
            <DatePicker
              label="End Date"
              value={filters.endDate}
              onChange={(date) => handleDateChange("endDate", date)}
              renderInput={(params) => (
                <TextField {...params} size="small" sx={{ minWidth: 150 }} />
              )}
            />
          </>
        )} */}
    </Stack>
    // </LocalizationProvider>
  );
};

export default TransactionFilters;
