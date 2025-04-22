// // "use client";
// // import React, { useEffect, useState } from "react";
// // import axios from "axios";
// // import {
// //   Table,
// //   TableBody,
// //   TableCell,
// //   TableContainer,
// //   TableHead,
// //   TableRow,
// //   Paper,
// //   Typography,
// //   Button,
// //   Select,
// //   MenuItem,
// //   Pagination,
// //   Modal,
// //   Box,
// //   SelectChangeEvent,
// //   Snackbar,
// //   Alert,
// //   CircularProgress,
// //   IconButton,
// //   Menu,
// // } from "@mui/material";
// // import { Container } from "@mui/material";
// // import { Download, MoreVert, Visibility } from "@mui/icons-material";

// // interface Lead {
// //   _id: string;
// //   fields: Array<{ id: string; label: string; value: string }>;
// //   status: string;
// //   unit: number;
// //   shareNumber: number;
// //   soldCount: number;
// //   createdAt: string;
// //   soldTo?: Array<{ buyerId: string; createdAt: string; unit: number }>;
// // }

// // const BuyerLeads: React.FC = () => {
// //   const [leads, setLeads] = useState<Lead[]>([]);
// //   const [loading, setLoading] = useState(true);
// //   const [page, setPage] = useState(1);
// //   const [rowsPerPage, setRowsPerPage] = useState(10);
// //   const [sortOrder, setSortOrder] = useState<
// //     | "newest-purchased"
// //     | "oldest-purchased"
// //     | "newest-available"
// //     | "oldest-available"
// //   >("newest-available");
// //   const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
// //   const [modalOpen, setModalOpen] = useState(false);
// //   const [snackbarOpen, setSnackbarOpen] = useState(false);
// //   const [snackbarMessage, setSnackbarMessage] = useState("");
// //   const [snackbarSeverity, setSnackbarSeverity] = useState<
// //     "success" | "error" | "info"
// //   >("info");
// //   const [purchaseLoading, setPurchaseLoading] = useState(false);
// //   const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
// //   const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

// //   useEffect(() => {
// //     const fetchLeads = async () => {
// //       try {
// //         const response = await axios.get("/api/buyers/fetchleadforbuyer", {
// //           params: {
// //             sort: sortOrder,
// //             page,
// //             limit: rowsPerPage,
// //           },
// //         });
// //         setLeads(response.data.data);
// //       } catch (error) {
// //         console.error("Error fetching leads:", error);
// //         showSnackbar("Error fetching leads", "error");
// //       } finally {
// //         setLoading(false);
// //       }
// //     };

// //     fetchLeads();
// //   }, [page, rowsPerPage, sortOrder]);

// //   const handlePurchase = async (leadId: string, unitCost: number) => {
// //     setPurchaseLoading(true);
// //     try {
// //       const response = await axios.post("/api/buyers/buyerpurchaselead", {
// //         leadId,
// //         unitCost,
// //       });
// //       showSnackbar(response.data.message, "success");
// //       const refreshedResponse = await axios.get(
// //         "/api/buyers/fetchleadforbuyer",
// //         {
// //           params: {
// //             sort: sortOrder,
// //             page,
// //             limit: rowsPerPage,
// //           },
// //         }
// //       );
// //       setLeads(refreshedResponse.data.data);
// //     } catch (error: any) {
// //       console.error("Error purchasing lead:", error);
// //       const errorMessage =
// //         error.response?.data?.message || "Failed to purchase lead.";
// //       showSnackbar(errorMessage, "error");
// //     } finally {
// //       setPurchaseLoading(false);
// //     }
// //   };

// //   const handleViewDetails = (lead: Lead) => {
// //     setSelectedLead(lead);
// //     setModalOpen(true);
// //   };

// //   const handleCloseModal = () => {
// //     setModalOpen(false);
// //     setSelectedLead(null);
// //   };

// //   const handleChangePage = (
// //     event: React.ChangeEvent<unknown>,
// //     newPage: number
// //   ) => {
// //     setPage(newPage);
// //   };

// //   const handleChangeRowsPerPage = (event: SelectChangeEvent<number>) => {
// //     setRowsPerPage(Number(event.target.value));
// //     setPage(1);
// //   };

// //   const handleSortChange = (
// //     event: SelectChangeEvent<
// //       | "newest-purchased"
// //       | "oldest-purchased"
// //       | "newest-available"
// //       | "oldest-available"
// //     >
// //   ) => {
// //     setSortOrder(
// //       event.target.value as
// //         | "newest-purchased"
// //         | "oldest-purchased"
// //         | "newest-available"
// //         | "oldest-available"
// //     );
// //     setPage(1);
// //   };

// //   const showSnackbar = (
// //     message: string,
// //     severity: "success" | "error" | "info"
// //   ) => {
// //     setSnackbarMessage(message);
// //     setSnackbarSeverity(severity);
// //     setSnackbarOpen(true);
// //   };

// //   const handleCloseSnackbar = () => {
// //     setSnackbarOpen(false);
// //   };

// //   const handleDownloadLead = (lead: Lead) => {
// //     const leadData = lead.fields
// //       .map((field) => `${field.label}: ${field.value}`)
// //       .join("\n");
// //     const blob = new Blob([leadData], { type: "text/plain" });
// //     const url = URL.createObjectURL(blob);
// //     const link = document.createElement("a");
// //     link.href = url;
// //     link.download = `lead-${lead._id}.txt`;
// //     link.click();
// //     URL.revokeObjectURL(url);
// //   };

// //   const handleMenuClick = (
// //     event: React.MouseEvent<HTMLElement>,
// //     leadId: string
// //   ) => {
// //     setAnchorEl(event.currentTarget);
// //     setSelectedLeadId(leadId);
// //   };

// //   const handleMenuClose = () => {
// //     setAnchorEl(null);
// //     setSelectedLeadId(null);
// //   };

// //   if (loading) return <Typography>Loading...</Typography>;

// //   return (
// //     <Container sx={{ mt: 5, mb: 4 }}>
// //       <Typography variant="h6" gutterBottom>
// //         Available Leads
// //       </Typography>
// //       {/* Filters and Pagination Controls */}
// //       <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
// //         <Select value={sortOrder} onChange={handleSortChange}>
// //           <MenuItem value="newest-purchased">Newly Purchased</MenuItem>
// //           <MenuItem value="oldest-purchased">Oldest Purchased</MenuItem>
// //           <MenuItem value="newest-available">Newest Available</MenuItem>
// //           <MenuItem value="oldest-available">Oldest Available</MenuItem>
// //         </Select>
// //         <Select value={rowsPerPage} onChange={handleChangeRowsPerPage}>
// //           <MenuItem value={10}>10 per page</MenuItem>
// //           <MenuItem value={20}>20 per page</MenuItem>
// //           <MenuItem value={50}>50 per page</MenuItem>
// //           <MenuItem value={100}>100 per page</MenuItem>
// //         </Select>
// //       </Box>
// //       {/* Leads Table */}
// //       <TableContainer component={Paper}>
// //         <Table>
// //           <TableHead>
// //             <TableRow>
// //               <TableCell>Lead Details</TableCell>
// //               <TableCell>Cost (Unit)</TableCell>
// //               <TableCell>Action</TableCell>
// //             </TableRow>
// //           </TableHead>
// //           <TableBody>
// //             {leads.map((lead) => (
// //               <TableRow key={lead._id}>
// //                 <TableCell>
// //                   {lead.fields.map((field) => (
// //                     <div key={field.id}>
// //                       <strong>{field.label}:</strong> {field.value}
// //                     </div>
// //                   ))}
// //                 </TableCell>
// //                 <TableCell>{lead.unit} units</TableCell>
// //                 <TableCell>
// //                   <IconButton
// //                     onClick={(e) => handleMenuClick(e, lead._id)}
// //                     aria-label="actions"
// //                   >
// //                     <MoreVert />
// //                   </IconButton>
// //                   <Menu
// //                     anchorEl={anchorEl}
// //                     open={selectedLeadId === lead._id}
// //                     onClose={handleMenuClose}
// //                   >
// //                     {lead.status === "sold" && (
// //                       <MenuItem
// //                         onClick={() => handleDownloadLead(lead)}
// //                         sx={{ display: "flex", alignItems: "center", gap: 1 }}
// //                       >
// //                         <Download fontSize="small" /> Download
// //                       </MenuItem>
// //                     )}
// //                     <MenuItem
// //                       onClick={() => handleViewDetails(lead)}
// //                       sx={{ display: "flex", alignItems: "center", gap: 1 }}
// //                     >
// //                       <Visibility fontSize="small" /> View Details
// //                     </MenuItem>
// //                   </Menu>
// //                 </TableCell>
// //               </TableRow>
// //             ))}
// //           </TableBody>
// //         </Table>
// //       </TableContainer>
// //       {/* Pagination */}
// //       <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
// //         <Pagination
// //           count={Math.ceil(leads.length / rowsPerPage)}
// //           page={page}
// //           onChange={handleChangePage}
// //           color="primary"
// //         />
// //       </Box>
// //       {/* Modal for Viewing Details */}
// //       <Modal open={modalOpen} onClose={handleCloseModal}>
// //         <Box
// //           sx={{
// //             position: "absolute",
// //             top: "50%",
// //             left: "50%",
// //             transform: "translate(-50%, -50%)",
// //             width: 400,
// //             bgcolor: "background.paper",
// //             boxShadow: 24,
// //             p: 4,
// //           }}
// //         >
// //           <Typography variant="h6" gutterBottom>
// //             Lead Details
// //           </Typography>
// //           {selectedLead && (
// //             <div>
// //               {selectedLead.fields.map((field) => (
// //                 <div key={field.id}>
// //                   <strong>{field.label}:</strong> {field.value}
// //                 </div>
// //               ))}
// //               <Typography sx={{ mt: 2 }}>
// //                 <strong>Status:</strong> {selectedLead.status}
// //               </Typography>
// //               <Typography>
// //                 <strong>Created At:</strong>{" "}
// //                 {new Date(selectedLead.createdAt).toLocaleString()}
// //               </Typography>
// //             </div>
// //           )}
// //           <Button
// //             variant="contained"
// //             color="primary"
// //             onClick={handleCloseModal}
// //             sx={{ mt: 2 }}
// //           >
// //             Close
// //           </Button>
// //         </Box>
// //       </Modal>
// //       {/* Snackbar for Notifications */}
// //       <Snackbar
// //         open={snackbarOpen}
// //         autoHideDuration={6000}
// //         onClose={handleCloseSnackbar}
// //         anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
// //       >
// //         <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity}>
// //           {snackbarMessage}
// //         </Alert>
// //       </Snackbar>
// //     </Container>
// //   );
// // };

// // export default BuyerLeads;
// "use client";
// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableContainer,
//   TableHead,
//   TableRow,
//   Paper,
//   Typography,
//   Button,
//   Select,
//   MenuItem,
//   Pagination,
//   Modal,
//   Box,
//   SelectChangeEvent,
//   Snackbar,
//   Alert,
//   CircularProgress,
//   IconButton,
//   Menu,
// } from "@mui/material";
// import { Container } from "@mui/material";
// import { Download, MoreVert, Visibility } from "@mui/icons-material";

// interface Lead {
//   _id: string;
//   fields: Array<{ id: string; label: string; value: string }>;
//   status: string;
//   unit: number;
//   shareNumber: number;
//   soldCount: number;
//   createdAt: string;
//   soldTo?: Array<{ buyerId: string; createdAt: string; unit: number }>;
// }

// const BuyerLeads: React.FC = () => {
//   const [leads, setLeads] = useState<Lead[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [page, setPage] = useState(1);
//   const [rowsPerPage, setRowsPerPage] = useState(10);
//   const [sortOrder, setSortOrder] = useState<
//     | "newest-purchased"
//     | "oldest-purchased"
//     | "newest-available"
//     | "oldest-available"
//   >("newest-available");
//   const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
//   const [modalOpen, setModalOpen] = useState(false);
//   const [snackbarOpen, setSnackbarOpen] = useState(false);
//   const [snackbarMessage, setSnackbarMessage] = useState("");
//   const [snackbarSeverity, setSnackbarSeverity] = useState<
//     "success" | "error" | "info"
//   >("info");
//   const [purchaseLoading, setPurchaseLoading] = useState(false);
//   const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
//   const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

//   useEffect(() => {
//     const fetchLeads = async () => {
//       try {
//         const response = await axios.get("/api/buyers/fetchleadforbuyer", {
//           params: {
//             sort: sortOrder,
//             page,
//             limit: rowsPerPage,
//           },
//         });
//         setLeads(response.data.data);
//       } catch (error) {
//         console.error("Error fetching leads:", error);
//         showSnackbar("Error fetching leads", "error");
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchLeads();
//   }, [page, rowsPerPage, sortOrder]);

//   const handlePurchase = async (leadId: string, unitCost: number) => {
//     setPurchaseLoading(true);
//     try {
//       const response = await axios.post("/api/buyers/buyerpurchaselead", {
//         leadId,
//         unitCost,
//       });
//       showSnackbar(response.data.message, "success");
//       const refreshedResponse = await axios.get(
//         "/api/buyers/fetchleadforbuyer",
//         {
//           params: {
//             sort: sortOrder,
//             page,
//             limit: rowsPerPage,
//           },
//         }
//       );
//       setLeads(refreshedResponse.data.data);
//     } catch (error: any) {
//       console.error("Error purchasing lead:", error);
//       const errorMessage =
//         error.response?.data?.message || "Failed to purchase lead.";
//       showSnackbar(errorMessage, "error");
//     } finally {
//       setPurchaseLoading(false);
//     }
//   };

//   const handleViewDetails = (lead: Lead) => {
//     setSelectedLead(lead);
//     setModalOpen(true);
//   };

//   const handleCloseModal = () => {
//     setModalOpen(false);
//     setSelectedLead(null);
//   };

//   const handleChangePage = (
//     event: React.ChangeEvent<unknown>,
//     newPage: number
//   ) => {
//     setPage(newPage);
//   };

//   const handleChangeRowsPerPage = (event: SelectChangeEvent<number>) => {
//     setRowsPerPage(Number(event.target.value));
//     setPage(1);
//   };

//   const handleSortChange = (
//     event: SelectChangeEvent<
//       | "newest-purchased"
//       | "oldest-purchased"
//       | "newest-available"
//       | "oldest-available"
//     >
//   ) => {
//     setSortOrder(
//       event.target.value as
//         | "newest-purchased"
//         | "oldest-purchased"
//         | "newest-available"
//         | "oldest-available"
//     );
//     setPage(1);
//   };

//   const showSnackbar = (
//     message: string,
//     severity: "success" | "error" | "info"
//   ) => {
//     setSnackbarMessage(message);
//     setSnackbarSeverity(severity);
//     setSnackbarOpen(true);
//   };

//   const handleCloseSnackbar = () => {
//     setSnackbarOpen(false);
//   };

//   const handleDownloadLead = (lead: Lead) => {
//     const leadData = lead.fields
//       .map((field) => `${field.label}: ${field.value}`)
//       .join("\n");
//     const blob = new Blob([leadData], { type: "text/plain" });
//     const url = URL.createObjectURL(blob);
//     const link = document.createElement("a");
//     link.href = url;
//     link.download = `lead-${lead._id}.txt`;
//     link.click();
//     URL.revokeObjectURL(url);
//   };

//   const handleMenuClick = (
//     event: React.MouseEvent<HTMLElement>,
//     leadId: string
//   ) => {
//     setAnchorEl(event.currentTarget);
//     setSelectedLeadId(leadId);
//   };

//   const handleMenuClose = () => {
//     setAnchorEl(null);
//     setSelectedLeadId(null);
//   };

//   if (loading) return <Typography>Loading...</Typography>;

//   return (
//     <Container sx={{ mt: 5, mb: 4 }}>
//       <Typography variant="h6" gutterBottom>
//         Available Leads
//       </Typography>
//       {/* Filters and Pagination Controls */}
//       <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
//         <Select value={sortOrder} onChange={handleSortChange}>
//           <MenuItem value="newest-purchased">Newly Purchased</MenuItem>
//           <MenuItem value="oldest-purchased">Oldest Purchased</MenuItem>
//           <MenuItem value="newest-available">Newest Available</MenuItem>
//           <MenuItem value="oldest-available">Oldest Available</MenuItem>
//         </Select>
//         <Select value={rowsPerPage} onChange={handleChangeRowsPerPage}>
//           <MenuItem value={10}>10 per page</MenuItem>
//           <MenuItem value={20}>20 per page</MenuItem>
//           <MenuItem value={50}>50 per page</MenuItem>
//           <MenuItem value={100}>100 per page</MenuItem>
//         </Select>
//       </Box>
//       {/* Leads Table */}
//       <TableContainer component={Paper}>
//         <Table>
//           <TableHead>
//             <TableRow>
//               <TableCell>Lead Details</TableCell>
//               <TableCell>Cost (Unit)</TableCell>
//               <TableCell>Action</TableCell>
//             </TableRow>
//           </TableHead>
//           <TableBody>
//             {leads.map((lead) => (
//               <TableRow key={lead._id}>
//                 <TableCell>
//                   {lead.fields.map((field) => (
//                     <div key={field.id}>
//                       <strong>{field.label}:</strong> {field.value}
//                     </div>
//                   ))}
//                 </TableCell>
//                 <TableCell>{lead.unit} units</TableCell>
//                 <TableCell>
//                   {lead.status === "available" ? (
//                     <Button
//                       variant="contained"
//                       color="primary"
//                       onClick={() => handlePurchase(lead._id, lead.unit)}
//                       disabled={purchaseLoading}
//                     >
//                       {purchaseLoading ? (
//                         <CircularProgress size={24} />
//                       ) : (
//                         "Purchase"
//                       )}
//                     </Button>
//                   ) : (
//                     <IconButton
//                       onClick={(e) => handleMenuClick(e, lead._id)}
//                       aria-label="actions"
//                     >
//                       <MoreVert />
//                     </IconButton>
//                   )}
//                   <Menu
//                     anchorEl={anchorEl}
//                     open={selectedLeadId === lead._id}
//                     onClose={handleMenuClose}
//                   >
//                     <MenuItem
//                       onClick={() => handleDownloadLead(lead)}
//                       sx={{ display: "flex", alignItems: "center", gap: 1 }}
//                     >
//                       <Download fontSize="small" /> Download
//                     </MenuItem>
//                     <MenuItem
//                       onClick={() => handleViewDetails(lead)}
//                       sx={{ display: "flex", alignItems: "center", gap: 1 }}
//                     >
//                       <Visibility fontSize="small" /> View Details
//                     </MenuItem>
//                   </Menu>
//                 </TableCell>
//               </TableRow>
//             ))}
//           </TableBody>
//         </Table>
//       </TableContainer>
//       {/* Pagination */}
//       <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
//         <Pagination
//           count={Math.ceil(leads.length / rowsPerPage)}
//           page={page}
//           onChange={handleChangePage}
//           color="primary"
//         />
//       </Box>
//       {/* Modal for Viewing Details */}
//       <Modal open={modalOpen} onClose={handleCloseModal}>
//         <Box
//           sx={{
//             position: "absolute",
//             top: "50%",
//             left: "50%",
//             transform: "translate(-50%, -50%)",
//             width: 400,
//             bgcolor: "background.paper",
//             boxShadow: 24,
//             p: 4,
//           }}
//         >
//           <Typography variant="h6" gutterBottom>
//             Lead Details
//           </Typography>
//           {selectedLead && (
//             <div>
//               {selectedLead.fields.map((field) => (
//                 <div key={field.id}>
//                   <strong>{field.label}:</strong> {field.value}
//                 </div>
//               ))}
//               <Typography sx={{ mt: 2 }}>
//                 <strong>Status:</strong> {selectedLead.status}
//               </Typography>
//               <Typography>
//                 <strong>Created At:</strong>{" "}
//                 {new Date(selectedLead.createdAt).toLocaleString()}
//               </Typography>
//             </div>
//           )}
//           <Button
//             variant="contained"
//             color="primary"
//             onClick={handleCloseModal}
//             sx={{ mt: 2 }}
//           >
//             Close
//           </Button>
//         </Box>
//       </Modal>
//       {/* Snackbar for Notifications */}
//       <Snackbar
//         open={snackbarOpen}
//         autoHideDuration={6000}
//         onClose={handleCloseSnackbar}
//         anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
//       >
//         <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity}>
//           {snackbarMessage}
//         </Alert>
//       </Snackbar>
//     </Container>
//   );
// };

// export default BuyerLeads;
"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Button,
  Select,
  MenuItem,
  Pagination,
  Modal,
  Box,
  SelectChangeEvent,
  Snackbar,
  Alert,
  CircularProgress,
  IconButton,
  Menu,
} from "@mui/material";
import { Container } from "@mui/material";
import { Download, MoreVert, Visibility } from "@mui/icons-material";

interface Lead {
  _id: string;
  fields: Array<{
    id: string;
    label: string;
    value: string | Record<string, string>;
    _id?: string;
  }>;
  status: string;
  unit: number;
  shareNumber: number;
  soldCount: number;
  createdAt: string;
  soldTo?: Array<{ buyerId: string; createdAt: string; unit: number }>;
  cost?: number;
}

const BuyerLeads: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortOrder, setSortOrder] = useState<
    | "newest-purchased"
    | "oldest-purchased"
    | "newest-available"
    | "oldest-available"
  >("newest-available");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<
    "success" | "error" | "info"
  >("info");
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const response = await axios.get("/api/buyers/fetchleadforbuyer", {
          params: {
            sort: sortOrder,
            page,
            limit: rowsPerPage,
          },
        });
        setLeads(response.data.data);
      } catch (error) {
        console.error("Error fetching leads:", error);
        showSnackbar("Error fetching leads", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, [page, rowsPerPage, sortOrder]);

  const handlePurchase = async (leadId: string, unitCost: number) => {
    setPurchaseLoading(true);
    try {
      const response = await axios.post("/api/buyers/buyerpurchaselead", {
        leadId,
        unitCost,
      });
      showSnackbar(response.data.message, "success");
      const refreshedResponse = await axios.get(
        "/api/buyers/fetchleadforbuyer",
        {
          params: {
            sort: sortOrder,
            page,
            limit: rowsPerPage,
          },
        }
      );
      setLeads(refreshedResponse.data.data);
    } catch (error: any) {
      console.error("Error purchasing lead:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to purchase lead.";
      showSnackbar(errorMessage, "error");
    } finally {
      setPurchaseLoading(false);
    }
  };

  const handleViewDetails = (lead: Lead) => {
    setSelectedLead(lead);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedLead(null);
  };

  const handleChangePage = (
    event: React.ChangeEvent<unknown>,
    newPage: number
  ) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: SelectChangeEvent<number>) => {
    setRowsPerPage(Number(event.target.value));
    setPage(1);
  };

  const handleSortChange = (
    event: SelectChangeEvent<
      | "newest-purchased"
      | "oldest-purchased"
      | "newest-available"
      | "oldest-available"
    >
  ) => {
    setSortOrder(
      event.target.value as
        | "newest-purchased"
        | "oldest-purchased"
        | "newest-available"
        | "oldest-available"
    );
    setPage(1);
  };

  const showSnackbar = (
    message: string,
    severity: "success" | "error" | "info"
  ) => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  const handleDownloadLead = (lead: Lead) => {
    let leadData = "";

    lead.fields.forEach((field) => {
      if (typeof field.value === "string") {
        leadData += `${field.label}: ${field.value}\n`;
      } else {
        // Handle object case
        Object.entries(field.value).forEach(([key, value]) => {
          leadData += `${key}: ${value}\n`;
        });
      }
    });

    const blob = new Blob([leadData], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `lead-${lead._id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleMenuClick = (
    event: React.MouseEvent<HTMLElement>,
    leadId: string
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedLeadId(leadId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedLeadId(null);
  };

  const renderFieldValue = (field: {
    id: string;
    label: string;
    value: string | Record<string, string>;
  }) => {
    if (typeof field.value === "string") {
      return (
        <div key={field.id}>
          <strong>{field.label}:</strong> {field.value}
        </div>
      );
    } else {
      return Object.entries(field.value).map(([key, value]) => (
        <div key={`${field.id}-${key}`}>
          <strong>{key}:</strong> {value}
        </div>
      ));
    }
  };

  if (loading) return <Typography>Loading...</Typography>;

  return (
    <Container sx={{ mt: 5, mb: 4 }}>
      <Typography variant="h6" gutterBottom>
        Available Leads
      </Typography>
      {/* Filters and Pagination Controls */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Select value={sortOrder} onChange={handleSortChange}>
          <MenuItem value="newest-purchased">Newly Purchased</MenuItem>
          <MenuItem value="oldest-purchased">Oldest Purchased</MenuItem>
          <MenuItem value="newest-available">Newest Available</MenuItem>
          <MenuItem value="oldest-available">Oldest Available</MenuItem>
        </Select>
        <Select value={rowsPerPage} onChange={handleChangeRowsPerPage}>
          <MenuItem value={10}>10 per page</MenuItem>
          <MenuItem value={20}>20 per page</MenuItem>
          <MenuItem value={50}>50 per page</MenuItem>
          <MenuItem value={100}>100 per page</MenuItem>
        </Select>
      </Box>
      {/* Leads Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Lead Details</TableCell>
              <TableCell>Cost (Unit)</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {leads.map((lead) => (
              <TableRow key={lead._id}>
                <TableCell>
                  {lead.fields.map((field) => renderFieldValue(field))}
                </TableCell>
                <TableCell>{lead.unit} units</TableCell>
                <TableCell>
                  {lead.status === "available" ? (
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => handlePurchase(lead._id, lead.unit)}
                      disabled={purchaseLoading}
                    >
                      {purchaseLoading ? (
                        <CircularProgress size={24} />
                      ) : (
                        "Purchase"
                      )}
                    </Button>
                  ) : (
                    <IconButton
                      onClick={(e) => handleMenuClick(e, lead._id)}
                      aria-label="actions"
                    >
                      <MoreVert />
                    </IconButton>
                  )}
                  <Menu
                    anchorEl={anchorEl}
                    open={selectedLeadId === lead._id}
                    onClose={handleMenuClose}
                  >
                    <MenuItem
                      onClick={() => handleDownloadLead(lead)}
                      sx={{ display: "flex", alignItems: "center", gap: 1 }}
                    >
                      <Download fontSize="small" /> Download
                    </MenuItem>
                    <MenuItem
                      onClick={() => handleViewDetails(lead)}
                      sx={{ display: "flex", alignItems: "center", gap: 1 }}
                    >
                      <Visibility fontSize="small" /> View Details
                    </MenuItem>
                  </Menu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {/* Pagination */}
      <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
        <Pagination
          count={Math.ceil(leads.length / rowsPerPage)}
          page={page}
          onChange={handleChangePage}
          color="primary"
        />
      </Box>
      {/* Modal for Viewing Details */}
      <Modal open={modalOpen} onClose={handleCloseModal}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 4,
          }}
        >
          <Typography variant="h6" gutterBottom>
            Lead Details
          </Typography>
          {selectedLead && (
            <div>
              {selectedLead.fields.map((field) => renderFieldValue(field))}
              <Typography sx={{ mt: 2 }}>
                <strong>Status:</strong> {selectedLead.status}
              </Typography>
              <Typography>
                <strong>Created At:</strong>{" "}
                {new Date(selectedLead.createdAt).toLocaleString()}
              </Typography>
            </div>
          )}
          <Button
            variant="contained"
            color="primary"
            onClick={handleCloseModal}
            sx={{ mt: 2 }}
          >
            Close
          </Button>
        </Box>
      </Modal>
      {/* Snackbar for Notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default BuyerLeads;
