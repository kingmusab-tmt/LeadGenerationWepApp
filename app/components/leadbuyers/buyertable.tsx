"use client";
import React, { useState } from "react";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteIcon from "@mui/icons-material/Delete";
import { IBuyer } from "@/models/leadbuyers";
import { useRouter } from "next/navigation";
import { useNavigation } from "@/context/handlenavigation";

interface BuyerTableProps {
  buyers: IBuyer[];
  onDelete: (buyerId: string) => void;
  onEdit: (buyer: IBuyer) => void;
}

const BuyerTable: React.FC<BuyerTableProps> = ({
  buyers,
  onDelete,
  onEdit,
}) => {
  const [anchorEl, setAnchorEl] = useState<{
    [key: string]: null | HTMLElement;
  }>({});
  const router = useRouter();
  const { navigateTo } = useNavigation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm")); // Mobile-first breakpoint

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, id: string) => {
    setAnchorEl((prev) => ({ ...prev, [id]: event.currentTarget }));
  };

  const handleMenuClose = (id: string) => {
    setAnchorEl((prev) => ({ ...prev, [id]: null }));
  };

  const handleView = (buyerId: string) => {
    navigateTo(`seller/lead_buyers_management/${buyerId}`);
  };

  const handleEdit = (buyer: IBuyer) => {
    //("Editing buyer:", buyer); // Debug log
    if (!buyer || !buyer._id) {
      console.error("Invalid buyer object passed to onEdit:", buyer);
      return;
    }
    onEdit(buyer);
  };

  const handleDelete = (buyerId: string) => {
    onDelete(buyerId);
  };
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "success";
      case "pending":
        return "warning";
      case "inactive":
        return "error";
      case "banned":
        return "error";
      default:
        return "info";
    }
  };

  const columns: GridColDef[] = [
    { field: "name", headerName: "Name", minWidth: 150, flex: 1 },
    { field: "company", headerName: "Company", minWidth: 180, flex: 1 },
    { field: "email", headerName: "Email", minWidth: 200, flex: 1 },
    {
      field: "status",
      headerName: "Status",
      minWidth: 100,
      flex: 0.8,
      renderCell: (params) => (
        <Chip
          label={params.row.status}
          color={getStatusColor(params.row.status || "")}
          size="small"
          variant="outlined"
          sx={{
            fontWeight: 600,
            textTransform: "capitalize",
          }}
        />
      ),
    },
    // {
    //   field: "industry",
    //   headerName: "Industry",
    //   minWidth: 120,
    //   flex: 1,
    // },
    {
      field: "actions",
      headerName: "Actions",
      minWidth: 80,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton onClick={(e) => handleMenuOpen(e, params.row._id)}>
            <MoreVertIcon />
          </IconButton>
          <Menu
            anchorEl={anchorEl[params.row._id]}
            open={Boolean(anchorEl[params.row._id])}
            onClose={() => handleMenuClose(params.row._id)}
          >
            <MenuItem
              onClick={() => {
                handleMenuClose(params.row._id);
                handleView(params.row._id);
              }}
            >
              <VisibilityIcon fontSize="small" sx={{ mr: 1 }} /> View
            </MenuItem>
            <MenuItem
              onClick={() => {
                handleMenuClose(params.row._id);
                handleEdit(params.row);
              }}
            >
              <EditIcon fontSize="small" sx={{ mr: 1 }} /> Edit
            </MenuItem>
            <MenuItem
              onClick={() => {
                handleMenuClose(params.row._id);
                handleDelete(params.row._id);
              }}
              sx={{ color: "red" }}
            >
              <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Delete
            </MenuItem>
          </Menu>
        </Box>
      ),
    },
  ];

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "60vh", // Full height on large screens
        minHeight: 300,
        overflowX: "auto", // Allow scrolling on small screens
        // px: isMobile ? 1 : 3, // Padding adjustment for mobile vs. desktop
        // py: 2,
      }}
    >
      <Box
        sx={{
          flexGrow: 1,
          width: "100%",
        }}
      >
        <DataGrid
          rows={buyers}
          columns={columns}
          pageSizeOptions={[5, 10, 20]}
          checkboxSelection
          sx={{
            width: "100%",
            border: "none",
            "& .MuiDataGrid-columnHeaders": {
              bgcolor: "action.hover",
              fontWeight: "bold",
            },
            "& .MuiDataGrid-row:hover": {
              bgcolor: "action.hover",
            },
          }}
          getRowId={(row) => row._id}
        />
      </Box>
    </Box>
  );
};

export default BuyerTable;
