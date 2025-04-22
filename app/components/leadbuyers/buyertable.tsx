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
    console.log("Editing buyer:", buyer); // Debug log
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
            <MenuItem onClick={() => handleView(params.row._id)}>
              <VisibilityIcon fontSize="small" sx={{ mr: 1 }} /> View
            </MenuItem>
            <MenuItem onClick={() => handleEdit(params.row)}>
              <EditIcon fontSize="small" sx={{ mr: 1 }} /> Edit
            </MenuItem>
            <MenuItem
              onClick={() => handleDelete(params.row._id)}
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
          width: isMobile ? "95vw" : "100%",
          mx: "auto", // Centering on larger screens
        }}
      >
        <DataGrid
          rows={buyers}
          columns={columns}
          pageSizeOptions={[5, 10, 20]}
          checkboxSelection
          sx={{
            width: "90%",
            "& .MuiDataGrid-root": {
              border: "none",
            },
          }}
          getRowId={(row) => row._id}
        />
      </Box>
    </Box>
  );
};

export default BuyerTable;
// "use client";
// import React, { useState } from "react";
// import { DataGrid, GridColDef } from "@mui/x-data-grid";
// import {
//   Box,
//   IconButton,
//   Menu,
//   MenuItem,
//   useMediaQuery,
//   useTheme,
//   Chip,
//   Avatar,
//   Typography,
//   Tooltip,
//   Stack,
// } from "@mui/material";
// import MoreVertIcon from "@mui/icons-material/MoreVert";
// import EditIcon from "@mui/icons-material/Edit";
// import VisibilityIcon from "@mui/icons-material/Visibility";
// import DeleteIcon from "@mui/icons-material/Delete";
// import BusinessIcon from "@mui/icons-material/Business";
// import EmailIcon from "@mui/icons-material/Email";
// import PersonIcon from "@mui/icons-material/Person";
// import { IBuyer } from "@/models/leadbuyers";
// import { useRouter } from "next/navigation";
// import { useNavigation } from "@/context/handlenavigation";

// interface BuyerTableProps {
//   buyers: IBuyer[];
//   onDelete: (buyerId: string) => void;
//   onEdit: (buyer: IBuyer) => void;
// }

// const BuyerTable: React.FC<BuyerTableProps> = ({
//   buyers,
//   onDelete,
//   onEdit,
// }) => {
//   const [anchorEl, setAnchorEl] = useState<{
//     [key: string]: null | HTMLElement;
//   }>({});
//   const router = useRouter();
//   const { navigateTo } = useNavigation();
//   const theme = useTheme();
//   const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

//   const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, id: string) => {
//     setAnchorEl((prev) => ({ ...prev, [id]: event.currentTarget }));
//   };

//   const handleMenuClose = (id: string) => {
//     setAnchorEl((prev) => ({ ...prev, [id]: null }));
//   };

//   const handleView = (buyerId: string) => {
//     navigateTo(`seller/lead_buyers_management/${buyerId}`);
//   };

//   const handleEdit = (buyer: IBuyer) => {
//     if (!buyer || !buyer._id) {
//       console.error("Invalid buyer object passed to onEdit:", buyer);
//       return;
//     }
//     onEdit(buyer);
//   };

//   const handleDelete = (buyerId: string) => {
//     onDelete(buyerId);
//   };

// const getStatusColor = (status: string) => {
//   switch (status.toLowerCase()) {
//     case "active":
//       return "success";
//     case "pending":
//       return "warning";
//     case "inactive":
//       return "error";
//     case "banned":
//       return "error";
//     default:
//       return "info";
//   }
// };

//   const mobileColumns: GridColDef[] = [
//     {
//       field: "name",
//       headerName: "Buyer",
//       minWidth: 150,
//       flex: 1,
//       renderCell: (params) => (
//         <Stack direction="column" spacing={0.5}>
//           <Box display="flex" alignItems="center" gap={1}>
//             <Avatar
//               sx={{
//                 width: 32,
//                 height: 32,
//                 bgcolor: theme.palette.primary.main,
//               }}
//             >
//               {params.row.name?.charAt(0) || <PersonIcon />}
//             </Avatar>
//             <Typography variant="body2" noWrap>
//               {params.row.name}
//             </Typography>
//           </Box>
//           <Typography variant="caption" color="text.secondary" noWrap>
//             {params.row.company || "N/A"}
//           </Typography>
//           <Chip
//             label={params.row.status}
//             color={getStatusColor(params.row.status || "")}
//             size="small"
//             variant="outlined"
//             sx={{
//               fontWeight: 500,
//               fontSize: "0.7rem",
//               maxWidth: "80px",
//             }}
//           />
//         </Stack>
//       ),
//     },
//     {
//       field: "actions",
//       headerName: "",
//       width: 50,
//       sortable: false,
//       renderCell: (params) => (
//         <Box>
//           <Tooltip title="Actions">
//             <IconButton
//               onClick={(e) => handleMenuOpen(e, params.row._id)}
//               size="small"
//             >
//               <MoreVertIcon fontSize="small" />
//             </IconButton>
//           </Tooltip>
//           <Menu
//             anchorEl={anchorEl[params.row._id]}
//             open={Boolean(anchorEl[params.row._id])}
//             onClose={() => handleMenuClose(params.row._id)}
//           >
//             <MenuItem onClick={() => handleView(params.row._id)}>
//               <VisibilityIcon fontSize="small" sx={{ mr: 1 }} /> View
//             </MenuItem>
//             <MenuItem onClick={() => handleEdit(params.row)}>
//               <EditIcon fontSize="small" sx={{ mr: 1 }} /> Edit
//             </MenuItem>
//             <MenuItem
//               onClick={() => handleDelete(params.row._id)}
//               sx={{ color: "error.main" }}
//             >
//               <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Delete
//             </MenuItem>
//           </Menu>
//         </Box>
//       ),
//     },
//   ];

//   const desktopColumns: GridColDef[] = [
//     {
//       field: "name",
//       headerName: "Name",
//       minWidth: 150,
//       flex: 1,
//       renderCell: (params) => (
//         <Box display="flex" alignItems="center" gap={1}>
//           <Avatar
//             sx={{ width: 32, height: 32, bgcolor: theme.palette.primary.main }}
//           >
//             {params.row.name?.charAt(0) || <PersonIcon />}
//           </Avatar>
//           <Typography variant="body2">{params.row.name}</Typography>
//         </Box>
//       ),
//     },
//     {
//       field: "company",
//       headerName: "Company",
//       minWidth: 120,
//       flex: 1,
//       renderCell: (params) => (
//         <Box display="flex" alignItems="center" gap={1}>
//           <BusinessIcon color="action" fontSize="small" />
//           <Typography variant="body2" noWrap>
//             {params.row.company || "N/A"}
//           </Typography>
//         </Box>
//       ),
//     },
//     {
//       field: "email",
//       headerName: "Email",
//       minWidth: 150,
//       flex: 1,
//       renderCell: (params) => (
//         <Box display="flex" alignItems="center" gap={1}>
//           <EmailIcon color="action" fontSize="small" />
//           <Typography variant="body2" noWrap>
//             {params.row.email}
//           </Typography>
//         </Box>
//       ),
//     },
// {
//   field: "status",
//   headerName: "Status",
//   minWidth: 100,
//   flex: 0.8,
//   renderCell: (params) => (
//     <Chip
//       label={params.row.status}
//       color={getStatusColor(params.row.status || "")}
//       size="small"
//       variant="outlined"
//       sx={{
//         fontWeight: 600,
//         textTransform: "capitalize",
//       }}
//     />
//   ),
// },
//     {
//       field: "industry",
//       headerName: "Industry",
//       minWidth: 100,
//       flex: 0.8,
//       renderCell: (params) => (
//         <Chip
//           label={params.row.industry || "N/A"}
//           variant="outlined"
//           size="small"
//           sx={{
//             textTransform: "capitalize",
//           }}
//         />
//       ),
//     },
//     {
//       field: "actions",
//       headerName: "Actions",
//       width: 80,
//       sortable: false,
//       renderCell: (params) => (
//         <Box>
//           <Tooltip title="Actions">
//             <IconButton
//               onClick={(e) => handleMenuOpen(e, params.row._id)}
//               size="small"
//             >
//               <MoreVertIcon fontSize="small" />
//             </IconButton>
//           </Tooltip>
//           <Menu
//             anchorEl={anchorEl[params.row._id]}
//             open={Boolean(anchorEl[params.row._id])}
//             onClose={() => handleMenuClose(params.row._id)}
//           >
//             <MenuItem onClick={() => handleView(params.row._id)}>
//               <VisibilityIcon fontSize="small" sx={{ mr: 1 }} /> View
//             </MenuItem>
//             <MenuItem onClick={() => handleEdit(params.row)}>
//               <EditIcon fontSize="small" sx={{ mr: 1 }} /> Edit
//             </MenuItem>
//             <MenuItem
//               onClick={() => handleDelete(params.row._id)}
//               sx={{ color: "error.main" }}
//             >
//               <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Delete
//             </MenuItem>
//           </Menu>
//         </Box>
//       ),
//     },
//   ];

//   return (
//     <Box
//       sx={{
//         height: "70vh",
//         width: "100%",
//         "& .MuiDataGrid-root": {
//           border: "none",
//           "& .MuiDataGrid-cell": {
//             borderBottom: `1px solid ${theme.palette.divider}`,
//           },
//           "& .MuiDataGrid-columnHeaders": {
//             backgroundColor: theme.palette.background.paper,
//             borderBottom: `2px solid ${theme.palette.divider}`,
//           },
//           "& .MuiDataGrid-virtualScroller": {
//             backgroundColor: theme.palette.background.default,
//           },
//           "& .MuiDataGrid-footerContainer": {
//             borderTop: `1px solid ${theme.palette.divider}`,
//           },
//         },
//       }}
//     >
//       <DataGrid
//         rows={buyers}
//         columns={isMobile ? mobileColumns : desktopColumns}
//         pageSizeOptions={[5, 10, 25]}
//         checkboxSelection
//         disableRowSelectionOnClick
//         getRowId={(row) => row._id}
//         sx={{
//           "& .MuiDataGrid-cell": {
//             py: isMobile ? 1.5 : 1,
//           },
//         }}
//         initialState={{
//           pagination: {
//             paginationModel: { pageSize: 10, page: 0 },
//           },
//         }}
//       />
//     </Box>
//   );
// };

// export default BuyerTable;
