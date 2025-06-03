// import { useEffect, useState } from "react";
// import {
//   Button,
//   Select,
//   MenuItem,
//   Typography,
//   Switch,
//   Snackbar,
//   Alert,
//   TextField,
//   Radio,
//   RadioGroup,
//   FormControlLabel,
//   Container,
//   Link,
// } from "@mui/material";
// import { industryNiches } from "@/utils/industryNiches";
// import cityAreaCodes from "@/utils/cityareacodes";
// import CallMethodForm from "./callMethodForm";
// import TrackingNumbersTable from "./TrackingNumberTable";
// import { TrackingNumber } from "@/types/trackingNumbers";
// import LoadingComponent from "@/app/components/generalComponent/loadingcomponent";

// export default function CallPage({ sellerId }: { sellerId: string }) {
//   const [numbers, setNumbers] = useState<TrackingNumber[]>([]);
//   const [twilioActivated, setTwilioActivated] = useState(false);
//   const [loading, setLoading] = useState(true);
//   const [city, setCity] = useState("");
//   const [industry, setIndustry] = useState("");
//   const [customIndustry, setCustomIndustry] = useState("");
//   const [method, setMethod] = useState("Automatic");
//   const [manualOption, setManualOption] = useState<
//     "manualEntry" | "systemRequest" | null
//   >(null); // New state for manual options
//   const [editingNumber, setEditingNumber] = useState<TrackingNumber | null>(
//     null
//   );
//   const [twilioData, setTwilioData] = useState({
//     accountSid: "",
//     authToken: "",
//     twilioNumber: "",
//   });
//   const areaCode = city ? cityAreaCodes[city] : "";
//   const [snackbar, setSnackbar] = useState<{
//     open: boolean;
//     message: string;
//     severity: "success" | "error" | "info" | "warning";
//   }>({ open: false, message: "", severity: "info" });

//   const fetchUpdatedNumbers = async () => {
//     try {
//       const numbersResponse = await fetch(
//         `/api/call_twillo/get_numbers?sellerId=${sellerId}`
//       );
//       const numbersData = await numbersResponse.json();
//       setNumbers(numbersData);
//       setLoading(false);

//       if (numbersData.length === 0) {
//         setSnackbar({
//           open: true,
//           message: "No tracking numbers found.",
//           severity: "info",
//         });
//       }
//     } catch (error) {
//       setSnackbar({
//         open: true,
//         message: "Failed to fetch tracking numbers.",
//         severity: "error",
//       });
//       setLoading(false);
//     }
//   };

//   const fetchTwilioStatus = async () => {
//     try {
//       const twilioStatusResponse = await fetch(
//         `/api/call_twillo/twiliostatus?sellerId=${sellerId}`
//       );
//       const twilioStatusData = await twilioStatusResponse.json();
//       setTwilioActivated(twilioStatusData.twilioActivated);
//     } catch (error) {
//       setSnackbar({
//         open: true,
//         message: "Failed to fetch Twilio status.",
//         severity: "error",
//       });
//     }
//   };

//   useEffect(() => {
//     fetchUpdatedNumbers();
//     fetchTwilioStatus();
//   }, [sellerId]);

//   const activateTwilio = async () => {
//     try {
//       await fetch("/api/call_twillo/activateTwilio", {
//         method: "POST",
//         body: JSON.stringify({ sellerId }),
//         headers: { "Content-Type": "application/json" },
//       });
//       setTwilioActivated(true);
//       setSnackbar({
//         open: true,
//         message: "Twilio activated successfully.",
//         severity: "success",
//       });
//     } catch (error) {
//       setSnackbar({
//         open: true,
//         message: "Failed to activate Twilio.",
//         severity: "error",
//       });
//     }
//   };

//   const requestNumber = async () => {
//     const selectedIndustry = customIndustry || industry;

//     if (!city || !selectedIndustry) {
//       setSnackbar({
//         open: true,
//         message: "Please select a city and industry.",
//         severity: "warning",
//       });
//       return;
//     }

//     const payload = {
//       sellerId,
//       areaCode,
//       industry: selectedIndustry,
//       method,
//       recordCall: false,
//       reconnectCaller: false,
//       passCallerId: false,
//       leadSource: "",
//       welcomeMessage: "",
//       callWhisper: "",
//       requireResponse: false,
//       forwardingType: "direct",
//     };

//     try {
//       const response = await fetch("/api/call_twillo/register_number", {
//         method: "POST",
//         body: JSON.stringify(payload),
//         headers: { "Content-Type": "application/json" },
//       });
//       const data = await response.json();

//       const newNumber: TrackingNumber = {
//         phoneNumber: data.phoneNumber,
//         industry: selectedIndustry,
//         method: method as "Manual" | "Automatic",
//         forwardingType: "direct",
//         recordCall: false,
//         reconnectCaller: false,
//         passCallerId: false,
//         leadSource: "",
//         welcomeMessage: "",
//         callWhisper: "",
//         requireResponse: false,
//       };

//       setNumbers((prev) => [...prev, newNumber]);
//       setSnackbar({
//         open: true,
//         message: "Number requested successfully.",
//         severity: "success",
//       });
//     } catch (error) {
//       setSnackbar({
//         open: true,
//         message: "Failed to request number.",
//         severity: "error",
//       });
//     }
//   };

//   const addManualNumber = async () => {
//     const selectedIndustry = customIndustry || industry;

//     if (!twilioData.twilioNumber || !selectedIndustry) {
//       setSnackbar({
//         open: true,
//         message: "Please enter a Twilio number and select an industry.",
//         severity: "warning",
//       });
//       return;
//     }

//     const newNumber: TrackingNumber = {
//       phoneNumber: twilioData.twilioNumber,
//       industry: selectedIndustry,
//       method: "Manual",
//       forwardingType: "direct",
//       recordCall: false,
//       reconnectCaller: false,
//       passCallerId: false,
//       leadSource: "",
//       welcomeMessage: "",
//       callWhisper: "",
//       requireResponse: false,
//     };

//     setNumbers((prev) => [...prev, newNumber]);
//     setSnackbar({
//       open: true,
//       message: "Number added successfully.",
//       severity: "success",
//     });
//   };

//   const removeNumber = async (phoneNumber: string) => {
//     try {
//       await fetch("/api/call_twillo/removeNumber", {
//         method: "POST",
//         body: JSON.stringify({ sellerId, phoneNumber }),
//         headers: { "Content-Type": "application/json" },
//       });

//       setNumbers((prev) =>
//         prev.filter((num) => num.phoneNumber !== phoneNumber)
//       );
//       setSnackbar({
//         open: true,
//         message: "Number removed successfully.",
//         severity: "success",
//       });
//     } catch (error) {
//       setSnackbar({
//         open: true,
//         message: "Failed to remove number.",
//         severity: "error",
//       });
//     }
//   };

//   const handleEditNumber = (number: TrackingNumber) => {
//     setEditingNumber(number);
//   };

//   const handleCloseSnackbar = () => {
//     setSnackbar((prev) => ({ ...prev, open: false }));
//   };

//   if (loading) return <LoadingComponent />;

//   return (
//     <Container>
//       <Typography variant="h5" sx={{ mt: 5 }}>
//         Call Tracking Set Up
//       </Typography>

//       <div>
//         <Typography variant="subtitle1">Activate Twilio</Typography>
//         <Switch checked={twilioActivated} onChange={activateTwilio} />
//       </div>

//       <div>
//         <Typography variant="subtitle1">Request/Add Twilio Number</Typography>
//         <RadioGroup
//           row
//           value={method}
//           onChange={(e) => {
//             setMethod(e.target.value);
//             setManualOption(null); // Reset manual option when method changes
//           }}
//         >
//           <FormControlLabel
//             value="Automatic"
//             control={<Radio />}
//             label="Automatic Request"
//           />
//           {/* <FormControlLabel
//             value="Manual"
//             control={<Radio />}
//             label="Manual Entry"
//           /> */}
//         </RadioGroup>

//         {method === "Manual" && (
//           <div>
//             <Typography>
//               Note: Remember to set your Twilio Account Details in{" "}
//               <Link href="/dashboard/seller/settings" underline="always">
//                 settings
//               </Link>
//               .
//             </Typography>
//             <Typography variant="subtitle1" sx={{ mt: 2 }}>
//               How would you like to add a Twilio number?
//             </Typography>
//             <RadioGroup
//               row
//               value={manualOption}
//               onChange={(e) =>
//                 setManualOption(
//                   e.target.value as "manualEntry" | "systemRequest"
//                 )
//               }
//             >
//               <FormControlLabel
//                 value="manualEntry"
//                 control={<Radio />}
//                 label="Insert Twilio Number Manually"
//               />
//               <FormControlLabel
//                 value="systemRequest"
//                 control={<Radio />}
//                 label="Use System to Request a New Twilio Number"
//               />
//             </RadioGroup>

//             {manualOption === "manualEntry" && (
//               <div>
//                 <TextField
//                   label="Twilio Number"
//                   fullWidth
//                   margin="normal"
//                   value={twilioData.twilioNumber}
//                   onChange={(e) =>
//                     setTwilioData({
//                       ...twilioData,
//                       twilioNumber: e.target.value,
//                     })
//                   }
//                 />
//                 <Typography variant="subtitle1">
//                   Select Industry/Niche for This Twilio Number
//                 </Typography>
//                 <Select
//                   fullWidth
//                   value={industry}
//                   onChange={(e) => setIndustry(e.target.value)}
//                 >
//                   {industryNiches.map((niche) => (
//                     <MenuItem key={niche.value} value={niche.value}>
//                       {niche.label}
//                     </MenuItem>
//                   ))}
//                   <MenuItem value="custom">Other (Specify Below)</MenuItem>
//                 </Select>
//                 {industry === "custom" && (
//                   <TextField
//                     fullWidth
//                     label="Enter Industry"
//                     value={customIndustry}
//                     onChange={(e) => setCustomIndustry(e.target.value)}
//                   />
//                 )}
//                 <Button
//                   variant="contained"
//                   onClick={addManualNumber}
//                   disabled={!twilioActivated}
//                   sx={{ mt: 2 }}
//                 >
//                   Add Number
//                 </Button>
//               </div>
//             )}

//             {manualOption === "systemRequest" && (
//               <div>
//                 <Typography variant="subtitle1">
//                   Select City to Determine Area Code
//                 </Typography>
//                 <Select
//                   fullWidth
//                   value={city}
//                   onChange={(e) => setCity(e.target.value)}
//                 >
//                   {Object.keys(cityAreaCodes).map((city) => (
//                     <MenuItem key={city} value={city}>
//                       {city}
//                     </MenuItem>
//                   ))}
//                 </Select>
//                 {areaCode && (
//                   <Typography>Selected Area Code: {areaCode}</Typography>
//                 )}

//                 <Typography variant="subtitle1">
//                   Select Industry/Niche for This Twilio Number
//                 </Typography>
//                 <Select
//                   fullWidth
//                   value={industry}
//                   onChange={(e) => setIndustry(e.target.value)}
//                 >
//                   {industryNiches.map((niche) => (
//                     <MenuItem key={niche.value} value={niche.value}>
//                       {niche.label}
//                     </MenuItem>
//                   ))}
//                   <MenuItem value="custom">Other (Specify Below)</MenuItem>
//                 </Select>
//                 {industry === "custom" && (
//                   <TextField
//                     fullWidth
//                     label="Enter Industry"
//                     value={customIndustry}
//                     onChange={(e) => setCustomIndustry(e.target.value)}
//                   />
//                 )}
//                 <Button
//                   variant="contained"
//                   onClick={requestNumber}
//                   disabled={!twilioActivated}
//                   sx={{ mt: 2 }}
//                 >
//                   Request Number
//                 </Button>
//               </div>
//             )}
//           </div>
//         )}

//         {method === "Automatic" && (
//           <div>
//             <Typography variant="subtitle1">
//               Select City to Determine Area Code
//             </Typography>
//             <Select
//               fullWidth
//               value={city}
//               onChange={(e) => setCity(e.target.value)}
//             >
//               {Object.keys(cityAreaCodes).map((city) => (
//                 <MenuItem key={city} value={city}>
//                   {city}
//                 </MenuItem>
//               ))}
//             </Select>
//             {areaCode && (
//               <Typography>Selected Area Code: {areaCode}</Typography>
//             )}

//             <Typography variant="subtitle1">
//               Select Industry/Niche for This Twilio Number
//             </Typography>
//             <Select
//               fullWidth
//               value={industry}
//               onChange={(e) => setIndustry(e.target.value)}
//             >
//               {industryNiches.map((niche) => (
//                 <MenuItem key={niche.value} value={niche.value}>
//                   {niche.label}
//                 </MenuItem>
//               ))}
//               <MenuItem value="custom">Other (Specify Below)</MenuItem>
//             </Select>
//             {industry === "custom" && (
//               <TextField
//                 fullWidth
//                 label="Enter Industry"
//                 value={customIndustry}
//                 onChange={(e) => setCustomIndustry(e.target.value)}
//               />
//             )}
//             <Button
//               variant="contained"
//               onClick={requestNumber}
//               disabled={!twilioActivated}
//               sx={{ mt: 2 }}
//             >
//               Request Number
//             </Button>
//           </div>
//         )}
//       </div>

//       <TrackingNumbersTable
//         numbers={numbers}
//         onRemoveNumber={removeNumber}
//         onEditNumber={handleEditNumber}
//       />
//       <CallMethodForm
//         numbers={numbers}
//         sellerId={sellerId}
//         initialValues={editingNumber}
//         onUpdateForwarding={async (payload) => {
//           try {
//             await fetch("/api/call_twillo/updateForwarding", {
//               method: "POST",
//               body: JSON.stringify(payload),
//               headers: { "Content-Type": "application/json" },
//             });
//             setSnackbar({
//               open: true,
//               message: "Forwarding updated successfully.",
//               severity: "success",
//             });
//             fetchUpdatedNumbers();
//             setEditingNumber(null);
//           } catch (error) {
//             setSnackbar({
//               open: true,
//               message: "Failed to update forwarding.",
//               severity: "error",
//             });
//           }
//         }}
//       />
//       <Snackbar
//         open={snackbar.open}
//         autoHideDuration={6000}
//         onClose={handleCloseSnackbar}
//       >
//         <Alert
//           onClose={handleCloseSnackbar}
//           severity={snackbar.severity}
//           sx={{ width: "100%" }}
//         >
//           {snackbar.message}
//         </Alert>
//       </Snackbar>
//     </Container>
//   );
// }
import { useEffect, useState } from "react";
import {
  Button,
  Select,
  MenuItem,
  Typography,
  Switch,
  Snackbar,
  Alert,
  TextField,
  Radio,
  RadioGroup,
  FormControlLabel,
  Container,
  Link,
} from "@mui/material";
import { industryNiches } from "@/utils/industryNiches";
import cityAreaCodes from "@/utils/cityareacodes";
import CallMethodForm from "./callMethodForm";
import TrackingNumbersTable from "./TrackingNumberTable";
import { TrackingNumber } from "@/types/trackingNumbers";
import LoadingComponent from "@/app/components/generalComponent/loadingcomponent";

export default function CallPage({ sellerId }: { sellerId: string }) {
  const [numbers, setNumbers] = useState<TrackingNumber[]>([]);
  const [twilioActivated, setTwilioActivated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState("");
  const [industry, setIndustry] = useState("");
  const [customIndustry, setCustomIndustry] = useState("");
  const [method, setMethod] = useState("Automatic");
  const [manualOption, setManualOption] = useState<
    "manualEntry" | "systemRequest" | null
  >(null);
  const [editingNumber, setEditingNumber] = useState<TrackingNumber | null>(
    null
  );
  const [twilioData, setTwilioData] = useState({
    accountSid: "",
    authToken: "",
    twilioNumber: "",
  });
  const areaCode = city ? cityAreaCodes[city] : "";
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info" | "warning";
  }>({ open: false, message: "", severity: "info" });

  const fetchUpdatedNumbers = async () => {
    try {
      const numbersResponse = await fetch(
        `/api/call_twillo/get_numbers?sellerId=${sellerId}`
      );
      const numbersData = await numbersResponse.json();
      setNumbers(numbersData);
      setLoading(false);

      if (numbersData.length === 0) {
        setSnackbar({
          open: true,
          message: "No tracking numbers found.",
          severity: "info",
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Failed to fetch tracking numbers.",
        severity: "error",
      });
      setLoading(false);
    }
  };

  const fetchTwilioStatus = async () => {
    try {
      const twilioStatusResponse = await fetch(
        `/api/call_twillo/twiliostatus?sellerId=${sellerId}`
      );
      const twilioStatusData = await twilioStatusResponse.json();
      setTwilioActivated(twilioStatusData.twilioActivated);
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Failed to fetch Twilio status.",
        severity: "error",
      });
    }
  };

  useEffect(() => {
    fetchUpdatedNumbers();
    fetchTwilioStatus();
  }, [sellerId]);

  const handleTwilioToggle = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newStatus = event.target.checked;
    const action = newStatus ? "activate" : "deactivate";

    try {
      const response = await fetch("/api/call_twillo/activateTwilio", {
        method: "POST",
        body: JSON.stringify({ sellerId, action }),
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setTwilioActivated(data.twilioActivated);
      setSnackbar({
        open: true,
        message: `Twilio ${action}d successfully.`,
        severity: "success",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: `Failed to ${action} Twilio: ${
          error instanceof Error ? error.message : String(error)
        }`,
        severity: "error",
      });
      // Revert the UI state if the API call fails
      setTwilioActivated(!newStatus);
    }
  };

  const requestNumber = async () => {
    const selectedIndustry = customIndustry || industry;

    if (!city || !selectedIndustry) {
      setSnackbar({
        open: true,
        message: "Please select a city and industry.",
        severity: "warning",
      });
      return;
    }

    const payload = {
      sellerId,
      areaCode,
      industry: selectedIndustry,
      method,
      recordCall: false,
      reconnectCaller: false,
      passCallerId: false,
      leadSource: "",
      welcomeMessage: "",
      callWhisper: "",
      requireResponse: false,
      forwardingType: "direct",
    };

    try {
      const response = await fetch("/api/call_twillo/register_number", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();

      const newNumber: TrackingNumber = {
        phoneNumber: data.phoneNumber,
        industry: selectedIndustry,
        method: method as "Manual" | "Automatic",
        forwardingType: "direct",
        recordCall: false,
        reconnectCaller: false,
        passCallerId: false,
        leadSource: "",
        welcomeMessage: "",
        callWhisper: "",
        requireResponse: false,
      };

      setNumbers((prev) => [...prev, newNumber]);
      setSnackbar({
        open: true,
        message: "Number requested successfully.",
        severity: "success",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Failed to request number.",
        severity: "error",
      });
    }
  };

  const addManualNumber = async () => {
    const selectedIndustry = customIndustry || industry;

    if (!twilioData.twilioNumber || !selectedIndustry) {
      setSnackbar({
        open: true,
        message: "Please enter a Twilio number and select an industry.",
        severity: "warning",
      });
      return;
    }

    const newNumber: TrackingNumber = {
      phoneNumber: twilioData.twilioNumber,
      industry: selectedIndustry,
      method: "Manual",
      forwardingType: "direct",
      recordCall: false,
      reconnectCaller: false,
      passCallerId: false,
      leadSource: "",
      welcomeMessage: "",
      callWhisper: "",
      requireResponse: false,
    };

    setNumbers((prev) => [...prev, newNumber]);
    setSnackbar({
      open: true,
      message: "Number added successfully.",
      severity: "success",
    });
  };

  const removeNumber = async (phoneNumber: string) => {
    try {
      await fetch("/api/call_twillo/removeNumber", {
        method: "POST",
        body: JSON.stringify({ sellerId, phoneNumber }),
        headers: { "Content-Type": "application/json" },
      });

      setNumbers((prev) =>
        prev.filter((num) => num.phoneNumber !== phoneNumber)
      );
      setSnackbar({
        open: true,
        message: "Number removed successfully.",
        severity: "success",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Failed to remove number.",
        severity: "error",
      });
    }
  };

  const handleEditNumber = (number: TrackingNumber) => {
    setEditingNumber(number);
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  if (loading) return <LoadingComponent />;

  return (
    <Container>
      <Typography variant="h5" sx={{ mt: 5 }}>
        Call Tracking Set Up
      </Typography>

      <div>
        <Typography variant="subtitle1">Twilio Status</Typography>
        <Switch
          checked={twilioActivated}
          onChange={handleTwilioToggle}
          color="primary"
        />
        <Typography variant="body2" sx={{ display: "inline", ml: 1 }}>
          {twilioActivated ? "Active" : "Inactive"}
        </Typography>
      </div>

      <div>
        <Typography variant="subtitle1">Request/Add Twilio Number</Typography>
        <RadioGroup
          row
          value={method}
          onChange={(e) => {
            setMethod(e.target.value);
            setManualOption(null);
          }}
        >
          <FormControlLabel
            value="Automatic"
            control={<Radio />}
            label="Automatic Request"
          />
        </RadioGroup>

        {method === "Automatic" && (
          <div>
            <Typography variant="subtitle1">
              Select City to Determine Area Code
            </Typography>
            <Select
              fullWidth
              value={city}
              onChange={(e) => setCity(e.target.value)}
            >
              {Object.keys(cityAreaCodes).map((city) => (
                <MenuItem key={city} value={city}>
                  {city}
                </MenuItem>
              ))}
            </Select>
            {areaCode && (
              <Typography>Selected Area Code: {areaCode}</Typography>
            )}

            <Typography variant="subtitle1">
              Select Industry/Niche for This Twilio Number
            </Typography>
            <Select
              fullWidth
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
            >
              {industryNiches.map((niche) => (
                <MenuItem key={niche.value} value={niche.value}>
                  {niche.label}
                </MenuItem>
              ))}
              <MenuItem value="custom">Other (Specify Below)</MenuItem>
            </Select>
            {industry === "custom" && (
              <TextField
                fullWidth
                label="Enter Industry"
                value={customIndustry}
                onChange={(e) => setCustomIndustry(e.target.value)}
              />
            )}
            <Button
              variant="contained"
              onClick={requestNumber}
              disabled={!twilioActivated}
              sx={{ mt: 2 }}
            >
              Request Number
            </Button>
          </div>
        )}
      </div>

      <TrackingNumbersTable
        numbers={numbers}
        onRemoveNumber={removeNumber}
        onEditNumber={handleEditNumber}
      />
      <CallMethodForm
        numbers={numbers}
        sellerId={sellerId}
        initialValues={editingNumber}
        onUpdateForwarding={async (payload) => {
          try {
            await fetch("/api/call_twillo/updateForwarding", {
              method: "POST",
              body: JSON.stringify(payload),
              headers: { "Content-Type": "application/json" },
            });
            setSnackbar({
              open: true,
              message: "Forwarding updated successfully.",
              severity: "success",
            });
            fetchUpdatedNumbers();
            setEditingNumber(null);
          } catch (error) {
            setSnackbar({
              open: true,
              message: "Failed to update forwarding.",
              severity: "error",
            });
          }
        }}
      />
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
