// "use client";

// import React, { useEffect, useState } from "react";
// import {
//   Container,
//   Typography,
//   Box,
//   Snackbar,
//   Alert,
//   Button,
//   Dialog,
//   useTheme,
//   useMediaQuery,
//   IconButton,
//   Tooltip,
//   TextField,
//   InputAdornment,
// } from "@mui/material";
// import { ContentCopy } from "@mui/icons-material"; // Icons for copy
// import BuyerTable from "@/app/components/leadbuyers/buyertable";
// import BuyerForm from "@/app/components/leadbuyers/BuyerForm";
// import { IBuyer } from "@/models/leadbuyers";
// import UserDashboard from "../layout";
// import { useSession } from "next-auth/react"; // Assuming you're using NextAuth for session management
// import LoadingComponent from "@/app/components/generalComponent/loadingcomponent";

// const BuyersPage: React.FC = () => {
//   const { data: session } = useSession(); // Get the current session
//   const [buyers, setBuyers] = useState<IBuyer[]>([]);
//   const [loading, setLoading] = useState<boolean>(true);
//   const [error, setError] = useState<string | null>(null);
//   const [openBuyerForm, setOpenBuyerForm] = useState(false);
//   const theme = useTheme();
//   const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
//   const [selectedBuyer, setSelectedBuyer] = useState<Partial<IBuyer> | null>(
//     null
//   );
//   const [snackbar, setSnackbar] = useState<{
//     open: boolean;
//     message: string;
//     severity: "success" | "error" | "info" | "warning";
//   }>({
//     open: false,
//     message: "",
//     severity: "info",
//   });

//   // ✅ Dynamic sellerId from session
//   const sellerId = session?.user?.id || ""; // Replace with the actual seller ID from the session

//   // ✅ Iframe dimensions state
//   const [iframeDimensions, setIframeDimensions] = useState({
//     width: "100%",
//     height: "100%",
//   });

//   // ✅ Generate the registration link and iframe code (client-side only)
//   const [registrationLink, setRegistrationLink] = useState<string>("");
//   const [iframeCode, setIframeCode] = useState<string>("");

//   useEffect(() => {
//     if (typeof window !== "undefined") {
//       const link = `${window.location.origin}/RegisterBuyer?sellerId=${sellerId}`;
//       const code = `<iframe src="${link}" width="${iframeDimensions.width}" height="${iframeDimensions.height}" style="border: none;"></iframe>`;
//       setRegistrationLink(link);
//       setIframeCode(code);
//     }
//   }, [sellerId, iframeDimensions]);

//   // ✅ Fetch buyers from API
//   const fetchBuyers = async () => {
//     try {
//       setLoading(true);
//       const response = await fetch("/api/buyers"); // Replace with actual API endpoint
//       if (!response.ok) {
//         throw new Error("Failed to fetch buyers");
//       }
//       const data: IBuyer[] = await response.json();

//       if (data.length === 0) {
//         setSnackbar({
//           open: true,
//           message: "No buyers registered yet.",
//           severity: "info",
//         });
//       } else {
//         setSnackbar({
//           open: true,
//           message: "Buyers loaded successfully!",
//           severity: "success",
//         });
//       }

//       setBuyers(data);
//     } catch (err) {
//       setError((err as Error).message);
//       setSnackbar({
//         open: true,
//         message: "Failed to load buyers.",
//         severity: "error",
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchBuyers();
//   }, []);

//   // ✅ Handle adding a new buyer
//   const handleAddNewBuyer = () => {
//     setSelectedBuyer(null); // No initial values = new buyer
//     setOpenBuyerForm(true);
//   };

//   // ✅ Handle editing a buyer
//   const handleEditBuyer = (buyer: IBuyer) => {
//     setSelectedBuyer(buyer); // Pass existing buyer data
//     setOpenBuyerForm(true);
//   };

//   // ✅ Handle saving a buyer (new or edited)
//   const handleSaveBuyer = async (buyerData: Partial<IBuyer>) => {
//     try {
//       const response = selectedBuyer
//         ? await fetch(`/api/buyers?id=${selectedBuyer._id}`, {
//             method: "PUT",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify(buyerData),
//           })
//         : await fetch("/api/buyers", {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify(buyerData),
//           });

//       if (!response.ok) throw new Error("Failed to save buyer");

//       setSnackbar({
//         open: true,
//         message: selectedBuyer
//           ? "Buyer updated successfully!"
//           : "Buyer added successfully!",
//         severity: "success",
//       });

//       // Refresh buyers list
//       fetchBuyers();
//       setOpenBuyerForm(false);
//     } catch (error) {
//       setSnackbar({
//         open: true,
//         message: "Error saving buyer. Please try again.",
//         severity: "error",
//       });
//     }
//   };

//   // ✅ Handle Buyer Deletion
//   const handleDelete = async (buyerId: string) => {
//     try {
//       const response = await fetch(`/api/buyers?id=${buyerId}`, {
//         method: "DELETE",
//       });
//       if (!response.ok) throw new Error("Failed to delete buyer");

//       // ✅ Update UI after successful deletion
//       fetchBuyers();

//       setSnackbar({
//         open: true,
//         message: "Buyer deleted successfully!",
//         severity: "success",
//       });
//     } catch (err) {
//       setSnackbar({
//         open: true,
//         message: "Failed to delete buyer. Try again.",
//         severity: "error",
//       });
//     }
//   };

//   // ✅ Close snackbar
//   const handleCloseSnackbar = () => {
//     setSnackbar((prev) => ({ ...prev, open: false }));
//   };

//   // ✅ Copy text to clipboard
//   const copyToClipboard = (text: string) => {
//     if (typeof navigator !== "undefined" && navigator.clipboard) {
//       navigator.clipboard
//         .writeText(text)
//         .then(() => {
//           setSnackbar({
//             open: true,
//             message: "Copied to clipboard!",
//             severity: "success",
//           });
//         })
//         .catch(() => {
//           setSnackbar({
//             open: true,
//             message: "Failed to copy to clipboard.",
//             severity: "error",
//           });
//         });
//     }
//   };

//   return (
//     <UserDashboard>
//       <Container
//         sx={{
//           width: isMobile ? "95vw" : "sm",
//           mt: isMobile ? "2rem" : "4rem",
//         }}
//       >
//         <Typography
//           variant="h5"
//           gutterBottom
//           sx={{ textAlign: "center", fontSize: { xs: "1.6rem", sm: "1.5rem" } }}
//         >
//           Lead Buyer Management
//         </Typography>

//         {/* Add Buyer Button and Registration Link/Iframe */}
//         <Box
//           display="flex"
//           justifyContent="space-between"
//           mb={2}
//           width="90%"
//           // sx={{ flexDirection: "column", gap: 2, alignItems: "center" }}
//         >
//           <Button
//             variant="contained"
//             color="primary"
//             onClick={handleAddNewBuyer}
//             sx={{ marginRight: 2 }}
//           >
//             Add New Buyer
//           </Button>

//           {/* <Box display="flex" gap={2}> */}
//           {/* Registration Link */}
//           <TextField
//             sx={{ marginRight: 2 }}
//             value={registrationLink}
//             variant="outlined"
//             size="small"
//             InputProps={{
//               readOnly: true,

//               endAdornment: (
//                 <InputAdornment position="end">
//                   <Tooltip title="Copy Link">
//                     <IconButton
//                       onClick={() => copyToClipboard(registrationLink)}
//                     >
//                       <ContentCopy fontSize="small" />
//                     </IconButton>
//                   </Tooltip>
//                 </InputAdornment>
//               ),
//             }}
//           />

//           {/* Iframe Code */}
//           <TextField
//             value={iframeCode}
//             variant="outlined"
//             size="small"
//             InputProps={{
//               readOnly: true,
//               endAdornment: (
//                 <InputAdornment position="end">
//                   <Tooltip title="Copy Iframe Code">
//                     <IconButton onClick={() => copyToClipboard(iframeCode)}>
//                       <ContentCopy fontSize="small" />
//                     </IconButton>
//                   </Tooltip>
//                 </InputAdornment>
//               ),
//             }}
//           />
//           {/* </Box> */}
//         </Box>

//         {/* Buyer Table */}
//         <Box sx={{ marginTop: 3, width: "100%" }}>
//           {loading ? (
//             <Box
//               sx={{
//                 display: "flex",
//                 justifyContent: "center",
//                 alignItems: "center",
//                 height: "50vh",
//               }}
//             >
//               <LoadingComponent />
//             </Box>
//           ) : error ? (
//             <Typography color="error" sx={{ textAlign: "center" }}>
//               {error}
//             </Typography>
//           ) : buyers.length === 0 ? (
//             <Alert severity="info" sx={{ textAlign: "center", width: "100%" }}>
//               No buyers registered yet.
//             </Alert>
//           ) : (
//             <BuyerTable
//               buyers={buyers}
//               onDelete={handleDelete}
//               onEdit={handleEditBuyer}
//             />
//           )}
//         </Box>

//         {/* Buyer Form Modal */}
//         <Dialog
//           open={openBuyerForm}
//           onClose={() => setOpenBuyerForm(false)}
//           maxWidth="sm"
//           fullWidth
//         >
//           <BuyerForm
//             open={openBuyerForm}
//             onClose={() => setOpenBuyerForm(false)}
//             onSave={handleSaveBuyer}
//             initialValues={selectedBuyer || undefined}
//             sellerId={sellerId}
//           />
//         </Dialog>

//         {/* Snackbar for notifications */}
//         <Snackbar
//           open={snackbar.open}
//           autoHideDuration={4000}
//           onClose={handleCloseSnackbar}
//         >
//           <Alert
//             onClose={handleCloseSnackbar}
//             severity={snackbar.severity}
//             sx={{ width: "100%" }}
//           >
//             {snackbar.message}
//           </Alert>
//         </Snackbar>
//       </Container>
//     </UserDashboard>
//   );
// };

// export default BuyersPage;
"use client";

import React, { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Box,
  Snackbar,
  Alert,
  Button,
  Dialog,
  useTheme,
  useMediaQuery,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Card,
  CardContent,
  Divider,
} from "@mui/material";
import { ContentCopy } from "@mui/icons-material";
import BuyerTable from "@/app/components/leadbuyers/buyertable";
import BuyerForm from "@/app/components/leadbuyers/BuyerForm";
import { IBuyer } from "@/models/leadbuyers";
import UserDashboard from "../layout";
import { useSession } from "next-auth/react";
import LoadingComponent from "@/app/components/generalComponent/loadingcomponent";

const BuyersPage: React.FC = () => {
  const { data: session } = useSession();
  const [buyers, setBuyers] = useState<IBuyer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [openBuyerForm, setOpenBuyerForm] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [selectedBuyer, setSelectedBuyer] = useState<Partial<IBuyer> | null>(
    null
  );
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info" as "success" | "error" | "info" | "warning",
  });
  const [subscriptionLimits, setSubscriptionLimits] = useState({
    currentCount: 0,
    maxAllowed: 0,
  });

  const sellerId = session?.user?.id || "";
  const [registrationLink, setRegistrationLink] = useState("");
  const [iframeCode, setIframeCode] = useState("");

  // Fetch buyers and subscription limits
  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch buyers
      const buyersResponse = await fetch("/api/buyers");
      if (!buyersResponse.ok) throw new Error("Failed to fetch buyers");
      const buyersData: IBuyer[] = await buyersResponse.json();
      setBuyers(buyersData);

      // Fetch subscription limits
      const limitsResponse = await fetch(
        `/api/subscriptions/limits?sellerId=${sellerId}`
      );
      if (!limitsResponse.ok)
        throw new Error("Failed to fetch subscription limits");
      const limitsData = await limitsResponse.json();
      setSubscriptionLimits({
        currentCount: buyersData.length,
        maxAllowed: limitsData.subscriptionLimits.buyers || 0,
      });

      if (buyersData.length === 0) {
        setSnackbar({
          open: true,
          message: "No buyers registered yet.",
          severity: "info",
        });
      }
    } catch (err) {
      setError((err as Error).message);
      setSnackbar({
        open: true,
        message: "Failed to load data.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sellerId) {
      fetchData();
      const link = `${window.location.origin}/RegisterBuyer?sellerId=${sellerId}`;
      const code = `<iframe src="${link}" width="100%" height="500px" style="border: none;"></iframe>`;
      setRegistrationLink(link);
      setIframeCode(code);
    }
  }, [sellerId]);

  const handleAddNewBuyer = () => {
    if (subscriptionLimits.currentCount >= subscriptionLimits.maxAllowed) {
      setSnackbar({
        open: true,
        message: `You've reached your buyer limit (${subscriptionLimits.maxAllowed}). Please upgrade your subscription.`,
        severity: "warning",
      });
      return;
    }
    setSelectedBuyer(null);
    setOpenBuyerForm(true);
  };

  const handleEditBuyer = (buyer: IBuyer) => {
    setSelectedBuyer(buyer);
    setOpenBuyerForm(true);
  };

  const handleSaveBuyer = async (buyerData: Partial<IBuyer>) => {
    try {
      const response = selectedBuyer
        ? await fetch(`/api/buyers?id=${selectedBuyer._id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(buyerData),
          })
        : await fetch("/api/buyers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(buyerData),
          });

      if (!response.ok) throw new Error("Failed to save buyer");

      setSnackbar({
        open: true,
        message: selectedBuyer ? "Buyer updated!" : "Buyer added!",
        severity: "success",
      });

      fetchData();
      setOpenBuyerForm(false);
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Error saving buyer.",
        severity: "error",
      });
    }
  };

  const handleDelete = async (buyerId: string) => {
    try {
      const response = await fetch(`/api/buyers?id=${buyerId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete buyer");

      fetchData();
      setSnackbar({
        open: true,
        message: "Buyer deleted!",
        severity: "success",
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Failed to delete buyer.",
        severity: "error",
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setSnackbar({
          open: true,
          message: "Copied to clipboard!",
          severity: "success",
        });
      })
      .catch(() => {
        setSnackbar({
          open: true,
          message: "Failed to copy.",
          severity: "error",
        });
      });
  };

  const isLimitReached =
    subscriptionLimits.currentCount >= subscriptionLimits.maxAllowed;

  return (
    <UserDashboard>
      <Container sx={{ mt: isMobile ? "2rem" : "4rem", maxWidth: "1200px" }}>
        <Typography variant="h5" gutterBottom sx={{ textAlign: "center" }}>
          Lead Buyer Management
        </Typography>

        {/* Subscription Limit Info */}
        {subscriptionLimits.currentCount === subscriptionLimits.maxAllowed && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6">
                Buyer Limit: {subscriptionLimits.currentCount}/
                {subscriptionLimits.maxAllowed}
              </Typography>
              <Typography color="error" sx={{ mt: 1 }}>
                You've reached your buyer limit. Upgrade to add more buyers.
                Kindly go to Settings to upgrade your subscription.
              </Typography>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <Box
          display="flex"
          justifyContent="space-between"
          mb={3}
          flexWrap="wrap"
          gap={2}
        >
          <Button
            variant="contained"
            onClick={handleAddNewBuyer}
            disabled={isLimitReached}
          >
            Add New Buyer
          </Button>

          <Box display="flex" gap={2} flexWrap="wrap">
            <Button
              variant="outlined"
              onClick={() => copyToClipboard(registrationLink)}
              disabled={isLimitReached}
              startIcon={<ContentCopy />}
            >
              Copy Registration Link
            </Button>
            <Button
              variant="outlined"
              onClick={() => copyToClipboard(iframeCode)}
              disabled={isLimitReached}
              startIcon={<ContentCopy />}
            >
              Copy Iframe Code
            </Button>
          </Box>
        </Box>

        {/* Buyer Table */}
        {loading ? (
          <LoadingComponent />
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : buyers.length === 0 ? (
          <Alert severity="info">No buyers registered yet.</Alert>
        ) : (
          <BuyerTable
            buyers={buyers}
            onDelete={handleDelete}
            onEdit={handleEditBuyer}
          />
        )}

        {/* Buyer Form Modal */}
        <Dialog
          open={openBuyerForm}
          onClose={() => setOpenBuyerForm(false)}
          maxWidth="sm"
          fullWidth
        >
          <BuyerForm
            open={openBuyerForm}
            onClose={() => setOpenBuyerForm(false)}
            onSave={handleSaveBuyer}
            initialValues={selectedBuyer || undefined}
            sellerId={sellerId}
          />
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        >
          <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
        </Snackbar>
      </Container>
    </UserDashboard>
  );
};

export default BuyersPage;
