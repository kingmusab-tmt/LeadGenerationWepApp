"use client";
import React from "react";
import {
  DataGrid,
  GridActionsCellItem,
  GridColDef,
  GridPaginationModel,
} from "@mui/x-data-grid";
import { Box, Chip, useMediaQuery, useTheme } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteIcon from "@mui/icons-material/Delete";
import { IBuyer } from "@/models/leadbuyers";
import { useNavigation } from "@/app/hooks";
import { getBuyerStatusColor } from "./buyerStatusColor";

interface BuyerTableProps {
  buyers: IBuyer[];
  onDelete: (buyerId: string) => void;
  onEdit: (buyer: IBuyer) => void;
  rowCount: number;
  paginationModel: GridPaginationModel;
  onPaginationModelChange: (model: GridPaginationModel) => void;
  loading?: boolean;
}

const BuyerTable: React.FC<BuyerTableProps> = ({
  buyers,
  onDelete,
  onEdit,
  rowCount,
  paginationModel,
  onPaginationModelChange,
  loading,
}) => {
  const { navigateTo } = useNavigation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm")); // Mobile-first breakpoint

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

  const columns: GridColDef[] = [
    { field: "name", headerName: "Name", minWidth: 150, flex: 1 },
    // Hidden on mobile rather than left to horizontal scroll — narrow
    // viewports keep Name/Status/Actions and drop the columns least needed
    // to identify a row at a glance.
    ...(isMobile
      ? []
      : [
          {
            field: "company",
            headerName: "Company",
            minWidth: 180,
            flex: 1,
          } as GridColDef,
          { field: "email", headerName: "Email", minWidth: 200, flex: 1 },
        ]),
    {
      field: "status",
      headerName: "Status",
      minWidth: 100,
      flex: 0.8,
      renderCell: (params) => (
        <Chip
          label={params.row.status}
          color={getBuyerStatusColor(params.row.status || "")}
          size="small"
          variant="outlined"
          sx={{
            fontWeight: 600,
            textTransform: "capitalize",
          }}
        />
      ),
    },
    {
      field: "actions",
      type: "actions",
      headerName: "Actions",
      minWidth: 80,
      getActions: (params) => [
        <GridActionsCellItem
          key="view"
          icon={<VisibilityIcon fontSize="small" />}
          label="View"
          showInMenu
          onClick={() => handleView(params.row._id)}
        />,
        <GridActionsCellItem
          key="edit"
          icon={<EditIcon fontSize="small" />}
          label="Edit"
          showInMenu
          onClick={() => handleEdit(params.row)}
        />,
        <GridActionsCellItem
          key="delete"
          icon={<DeleteIcon fontSize="small" sx={{ color: "error.main" }} />}
          label="Delete"
          showInMenu
          onClick={() => handleDelete(params.row._id)}
        />,
      ],
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
          rowCount={rowCount}
          paginationMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={onPaginationModelChange}
          loading={loading}
          pageSizeOptions={[10, 20, 50]}
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
