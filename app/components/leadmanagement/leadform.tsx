// import React, { useEffect, useState } from "react";
// import {
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogActions,
//   TextField,
//   Button,
//   FormControl,
//   InputLabel,
//   Select,
//   MenuItem,
//   Typography,
//   FormControlLabel,
//   Checkbox,
// } from "@mui/material";
// import axios from "axios";

// interface FormField {
//   id: string;
//   type: string;
//   label: string;
//   required?: boolean;
//   options?: string[];
// }

// interface Lead {
//   _id: string;
//   userId: string;
//   fields: Array<{ id: string; label: string; value: string }>;
//   createdAt: string;
//   status: "new" | "available" | "assigned" | "sold";
//   distributionMethod: "manual" | "round_robin" | "marketplace";
//   exclusive: boolean;
//   unit: number;
//   shared: boolean;
//   shareNumber: number;
//   isManual: boolean;
// }

// interface UserForm {
//   _id: string;
//   formId: string;
//   userId: string;
//   formName: string;
//   industry: string;
//   leadsource: string;
//   fields: FormField[];
//   createdAt: string;
//   updatedAt: string;
//   __v: number;
// }

// interface LeadFormProps {
//   open: boolean;
//   onClose: () => void;
//   onSubmit: () => void;
//   selectedLead: Lead | null;
//   setSelectedLead: (lead: Lead | ((prev: Lead) => Lead)) => void;
// }

// const LeadForm: React.FC<LeadFormProps> = ({
//   open,
//   onClose,
//   onSubmit,
//   selectedLead,
//   setSelectedLead,
// }) => {
//   const [userForms, setUserForms] = useState<UserForm[]>([]);
//   const [selectedForm, setSelectedForm] = useState<UserForm | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [isShared, setIsShared] = useState(selectedLead?.shared || false);

//   useEffect(() => {
//     // Fetch form schema from the database
//     axios
//       .get("/api/form/userform")
//       .then((response) => {
//         setUserForms(response.data);
//         setLoading(false);
//       })
//       .catch(() => {
//         setUserForms([]);
//         setLoading(false);
//       });
//   }, []);

//   if (loading) return null;

//   if (userForms.length === 0) {
//     return (
//       <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
//         <DialogTitle>No Form Defined</DialogTitle>
//         <DialogContent>
//           <Typography>
//             No lead form has been created. Please create a form to add leads.
//           </Typography>
//         </DialogContent>
//         <DialogActions>
//           <Button onClick={onClose} color="secondary">
//             Cancel
//           </Button>
//           <Button
//             onClick={() =>
//               (window.location.href =
//                 "/dashboard/seller/lead_management/formbuilder")
//             }
//             color="primary"
//             variant="contained"
//           >
//             Create Form
//           </Button>
//         </DialogActions>
//       </Dialog>
//     );
//   }

//   if (userForms.length > 1 && !selectedForm) {
//     return (
//       <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
//         <DialogTitle>Select Form</DialogTitle>
//         <DialogContent>
//           <FormControl fullWidth margin="normal">
//             <InputLabel>Select Form</InputLabel>
//             <Select
//               value=""
//               onChange={(e) => {
//                 const selectedFormId = e.target.value;
//                 const form = userForms.find(
//                   (form) => form._id === selectedFormId
//                 );
//                 setSelectedForm(form || null);
//               }}
//             >
//               {userForms.map((form) => (
//                 <MenuItem key={form._id} value={form._id}>
//                   {form.formName} - {form.leadsource}
//                 </MenuItem>
//               ))}
//             </Select>
//           </FormControl>
//         </DialogContent>
//         <DialogActions>
//           <Button onClick={onClose} color="secondary">
//             Cancel
//           </Button>
//         </DialogActions>
//       </Dialog>
//     );
//   }

//   const formFields = selectedForm ? selectedForm.fields : userForms[0].fields;

//   return (
//     <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
//       <DialogTitle>{selectedLead?._id ? "Edit Lead" : "Add Lead"}</DialogTitle>
//       <DialogContent>
//         {formFields.map((field) => {
//           const existingField = selectedLead?.fields?.find(
//             (f) => f.id === field.id
//           );
//           return (
//             <TextField
//               key={field.id}
//               fullWidth
//               label={field.label}
//               margin="normal"
//               value={existingField?.value || ""}
//               onChange={(e) => {
//                 setSelectedLead((prev) => {
//                   const updatedFields = prev.fields.map((f) =>
//                     f.id === field.id ? { ...f, value: e.target.value } : f
//                   );
//                   // If the field doesn't exist, add it to the fields array
//                   if (!existingField) {
//                     updatedFields.push({
//                       id: field.id,
//                       label: field.label,
//                       value: e.target.value,
//                     });
//                   }
//                   return { ...prev, fields: updatedFields };
//                 });
//               }}
//             />
//           );
//         })}

//         {/* Separate FormControl for Status */}
//         <FormControl fullWidth margin="normal">
//           <InputLabel>Status</InputLabel>
//           <Select
//             value={selectedLead?.status || "new"}
//             onChange={(e) =>
//               setSelectedLead((prev) => ({
//                 ...prev,
//                 status: e.target.value as
//                   | "new"
//                   | "available"
//                   | "assigned"
//                   | "sold",
//               }))
//             }
//           >
//             <MenuItem value="new">New</MenuItem>
//             <MenuItem value="available">Available</MenuItem>
//             <MenuItem value="assigned">Assigned</MenuItem>
//             <MenuItem value="sold">Sold Out</MenuItem>
//           </Select>
//         </FormControl>

//         {/* Separate FormControl for Assignment Method */}
//         <FormControl fullWidth margin="normal">
//           <InputLabel>Assignment Method</InputLabel>
//           <Select
//             value={selectedLead?.distributionMethod || "marketplace"}
//             onChange={(e) =>
//               setSelectedLead((prev) => ({
//                 ...prev,
//                 distributionMethod: e.target.value as
//                   | "manual"
//                   | "round_robin"
//                   | "marketplace",
//               }))
//             }
//           >
//             <MenuItem value="manual">Specific Buyer</MenuItem>
//             <MenuItem value="round_robin">Automatic</MenuItem>
//             <MenuItem value="marketplace">Manual</MenuItem>
//           </Select>
//         </FormControl>

//         {/* Separate FormControl for Shared Lead Checkbox */}
//         <FormControl fullWidth margin="normal">
//           <FormControlLabel
//             control={
//               <Checkbox
//                 checked={isShared}
//                 onChange={(e) => {
//                   setIsShared(e.target.checked);
//                   setSelectedLead((prev) => ({
//                     ...prev,
//                     shared: e.target.checked,
//                   }));
//                 }}
//               />
//             }
//             label="Shared Lead"
//           />
//         </FormControl>

//         {/* Conditional TextField for Number of Buyers */}
//         {isShared && (
//           <FormControl fullWidth margin="normal">
//             <TextField
//               label="Number of Buyers to Share With"
//               type="number"
//               value={selectedLead?.shareNumber || ""}
//               onChange={(e) =>
//                 setSelectedLead((prev) => ({
//                   ...prev,
//                   shareNumber: Number(e.target.value),
//                 }))
//               }
//               margin="normal"
//               fullWidth
//             />
//           </FormControl>
//         )}

//         {/* Separate FormControl for Lead Unit */}
//         <FormControl fullWidth margin="normal">
//           <TextField
//             label="Lead Unit"
//             type="number"
//             value={selectedLead?.unit || ""}
//             onChange={(e) =>
//               setSelectedLead((prev) => ({
//                 ...prev,
//                 unit: Number(e.target.value),
//               }))
//             }
//             margin="normal"
//             fullWidth
//           />
//         </FormControl>
//       </DialogContent>
//       <DialogActions>
//         <Button onClick={onClose} color="secondary">
//           Cancel
//         </Button>
//         <Button onClick={onSubmit} color="primary" variant="contained">
//           Save
//         </Button>
//       </DialogActions>
//     </Dialog>
//   );
// };

// export default LeadForm;
// import React, { useEffect, useState } from "react";
// import {
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogActions,
//   TextField,
//   Button,
//   FormControl,
//   InputLabel,
//   Select,
//   MenuItem,
//   Typography,
//   FormControlLabel,
//   Checkbox,
//   CircularProgress,
//   Alert,
//   Box,
// } from "@mui/material";
// import axios from "axios";

// interface FormField {
//   id: string;
//   type: string;
//   label: string;
//   required?: boolean;
//   options?: string[];
// }

// interface Lead {
//   _id: string;
//   userId: string;
//   fields: Array<{ id: string; label: string; value: string; _id?: string }>;
//   createdAt: string;
//   status: "new" | "available" | "assigned" | "sold";
//   distributionMethod: "manual" | "round_robin" | "marketplace";
//   exclusive: boolean;
//   unit: number;
//   shared: boolean;
//   shareNumber: number;
//   isManual: boolean;
// }

// interface UserForm {
//   _id: string;
//   formId: string;
//   userId: string;
//   formName: string;
//   industry: string;
//   leadsource: string;
//   fields: FormField[];
//   createdAt: string;
//   updatedAt: string;
//   __v: number;
// }

// interface LeadFormProps {
//   open: boolean;
//   onClose: () => void;
//   onSubmit: () => void;
//   selectedLead: Lead | null;
//   setSelectedLead: (lead: Lead | ((prev: Lead) => Lead)) => void;
// }

// const LeadForm: React.FC<LeadFormProps> = ({
//   open,
//   onClose,
//   onSubmit,
//   selectedLead,
//   setSelectedLead,
// }) => {
//   const [userForms, setUserForms] = useState<UserForm[]>([]);
//   const [selectedForm, setSelectedForm] = useState<UserForm | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [isShared, setIsShared] = useState(selectedLead?.shared || false);
//   const [formSelectionMode, setFormSelectionMode] = useState(false);
//   const [useLeadFields, setUseLeadFields] = useState(false);
//   const [noMatchingForm, setNoMatchingForm] = useState(false);

//   useEffect(() => {
//     const fetchForms = async () => {
//       try {
//         const response = await axios.get("/api/form/userform");
//         setUserForms(response.data);

//         // If editing an existing lead, find the form that matches the lead's fields
//         if (selectedLead?._id) {
//           const matchingForm = response.data.find((form: { fields: any[] }) =>
//             form.fields.some((formField: { id: string }) =>
//               selectedLead.fields.some(
//                 (leadField) => leadField.id === formField.id
//               )
//             )
//           );

//           if (matchingForm) {
//             setSelectedForm(matchingForm);
//           } else {
//             setNoMatchingForm(true);
//           }
//         }
//       } catch (error) {
//         console.error("Error fetching forms:", error);
//         setUserForms([]);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchForms();
//   }, [selectedLead]);

//   useEffect(() => {
//     // When adding a new lead and user has multiple forms, show form selection
//     if (!selectedLead?._id && userForms.length > 1 && open) {
//       setFormSelectionMode(true);
//     } else {
//       setFormSelectionMode(false);
//     }
//   }, [selectedLead, userForms, open]);

//   const handleFormSelect = (form: UserForm) => {
//     setSelectedForm(form);
//     setFormSelectionMode(false);
//     setNoMatchingForm(false);

//     // Initialize fields for new lead based on selected form
//     if (!selectedLead?._id) {
//       setSelectedLead((prev) => ({
//         ...(prev || {
//           _id: "",
//           userId: "",
//           fields: [],
//           createdAt: new Date().toISOString(),
//           status: "new",
//           distributionMethod: "marketplace",
//           exclusive: false,
//           unit: 5,
//           shared: false,
//           shareNumber: 1,
//           isManual: true,
//         }),
//         fields: form.fields.map((field) => ({
//           id: field.id,
//           label: field.label,
//           value: "",
//           _id: undefined,
//         })),
//       }));
//     }
//   };

//   const handleUseLeadFields = () => {
//     setUseLeadFields(true);
//     setNoMatchingForm(false);

//     // Create a temporary form structure from the lead's fields
//     const tempFormFields =
//       selectedLead?.fields.map((field) => ({
//         id: field.id,
//         label: field.label,
//         value: field.value,
//         // Removed _id as it does not exist on the field type
//       })) || [];

//     setSelectedLead((prev) => ({
//       ...(prev || {
//         _id: "",
//         userId: "",
//         fields: [],
//         createdAt: new Date().toISOString(),
//         status: "new",
//         distributionMethod: "marketplace",
//         exclusive: false,
//         unit: 5,
//         shared: false,
//         shareNumber: 1,
//         isManual: true,
//       }),
//       fields: tempFormFields,
//     }));
//   };

//   if (loading) {
//     return (
//       <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
//         <DialogContent
//           sx={{
//             display: "flex",
//             justifyContent: "center",
//             alignItems: "center",
//             height: "200px",
//           }}
//         >
//           <CircularProgress />
//         </DialogContent>
//       </Dialog>
//     );
//   }

//   if (userForms.length === 0) {
//     return (
//       <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
//         <DialogTitle>No Form Defined</DialogTitle>
//         <DialogContent>
//           <Typography>
//             No lead form has been created. Please create a form to add leads.
//           </Typography>
//         </DialogContent>
//         <DialogActions>
//           <Button onClick={onClose} color="secondary">
//             Cancel
//           </Button>
//           <Button
//             onClick={() =>
//               (window.location.href =
//                 "/dashboard/seller/lead_management/formbuilder")
//             }
//             color="primary"
//             variant="contained"
//           >
//             Create Form
//           </Button>
//         </DialogActions>
//       </Dialog>
//     );
//   }

//   if (noMatchingForm && !useLeadFields) {
//     return (
//       <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
//         <DialogTitle>No Matching Form Found</DialogTitle>
//         <DialogContent>
//           <Alert severity="warning" sx={{ mb: 2 }}>
//             We couldn't find a form that matches this lead's fields.
//           </Alert>
//           <Typography>You can either:</Typography>
//           <ol>
//             <li>Select an existing form to use (may not include all fields)</li>
//             <li>Use the lead's fields directly for editing</li>
//           </ol>

//           <Box sx={{ mt: 3 }}>
//             <Button
//               variant="outlined"
//               fullWidth
//               sx={{ mb: 2 }}
//               onClick={() => setFormSelectionMode(true)}
//             >
//               Select Existing Form
//             </Button>
//             <Button variant="contained" fullWidth onClick={handleUseLeadFields}>
//               Use Lead Fields
//             </Button>
//           </Box>
//         </DialogContent>
//         <DialogActions>
//           <Button onClick={onClose} color="secondary">
//             Cancel
//           </Button>
//         </DialogActions>
//       </Dialog>
//     );
//   }

//   if (formSelectionMode) {
//     return (
//       <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
//         <DialogTitle>Select Form</DialogTitle>
//         <DialogContent>
//           <FormControl fullWidth margin="normal">
//             <InputLabel>Select Form</InputLabel>
//             <Select
//               value=""
//               onChange={(e) => {
//                 const selectedFormId = e.target.value;
//                 const form = userForms.find(
//                   (form) => form._id === selectedFormId
//                 );
//                 if (form) handleFormSelect(form);
//               }}
//             >
//               {userForms.map((form) => (
//                 <MenuItem key={form._id} value={form._id}>
//                   {form.formName} - {form.leadsource}
//                 </MenuItem>
//               ))}
//             </Select>
//           </FormControl>
//         </DialogContent>
//         <DialogActions>
//           <Button onClick={onClose} color="secondary">
//             Cancel
//           </Button>
//           <Button onClick={() => setNoMatchingForm(true)} color="primary">
//             Back
//           </Button>
//         </DialogActions>
//       </Dialog>
//     );
//   }

//   // Determine which fields to display
//   const displayFields = useLeadFields
//     ? selectedLead?.fields || [] // When using lead fields directly
//     : selectedLead?._id
//     ? selectedLead.fields.filter((field) =>
//         selectedForm?.fields.some((f) => f.id === field.id)
//       ) // For editing with selected form
//     : selectedForm?.fields.map((f) => ({
//         id: f.id,
//         label: f.label,
//         value: "",
//       })) || []; // For adding with selected form

//   return (
//     <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
//       <DialogTitle>
//         {selectedLead?._id ? "Edit Lead" : "Add Lead"}
//         {useLeadFields && " (Using Lead Fields Directly)"}
//       </DialogTitle>
//       <DialogContent>
//         {displayFields.map((field) => (
//           <TextField
//             key={field.id}
//             fullWidth
//             label={field.label}
//             margin="normal"
//             value={field.value || ""}
//             onChange={(e) => {
//               setSelectedLead((prev) => {
//                 const updatedFields = prev.fields.map((f) =>
//                   f.id === field.id ? { ...f, value: e.target.value } : f
//                 );

//                 // If the field doesn't exist, add it to the fields array
//                 if (!prev.fields.some((f) => f.id === field.id)) {
//                   updatedFields.push({
//                     id: field.id,
//                     label: field.label,
//                     value: e.target.value,
//                     // Removed _id as it does not exist on the field type
//                   });
//                 }

//                 return { ...prev, fields: updatedFields };
//               });
//             }}
//           />
//         ))}

//         {/* Status Selection */}
//         <FormControl fullWidth margin="normal">
//           <InputLabel>Status</InputLabel>
//           <Select
//             value={selectedLead?.status || "new"}
//             onChange={(e) =>
//               setSelectedLead((prev) => ({
//                 ...prev,
//                 status: e.target.value as
//                   | "new"
//                   | "available"
//                   | "assigned"
//                   | "sold",
//               }))
//             }
//           >
//             <MenuItem value="new">New</MenuItem>
//             <MenuItem value="available">Available</MenuItem>
//             <MenuItem value="assigned">Assigned</MenuItem>
//             <MenuItem value="sold">Sold Out</MenuItem>
//           </Select>
//         </FormControl>

//         {/* Assignment Method */}
//         <FormControl fullWidth margin="normal">
//           <InputLabel>Assignment Method</InputLabel>
//           <Select
//             value={selectedLead?.distributionMethod || "marketplace"}
//             onChange={(e) =>
//               setSelectedLead((prev) => ({
//                 ...prev,
//                 distributionMethod: e.target.value as
//                   | "manual"
//                   | "round_robin"
//                   | "marketplace",
//               }))
//             }
//           >
//             <MenuItem value="manual">Specific Buyer</MenuItem>
//             <MenuItem value="round_robin">Automatic</MenuItem>
//             <MenuItem value="marketplace">Manual</MenuItem>
//           </Select>
//         </FormControl>

//         {/* Shared Lead Checkbox */}
//         <FormControl fullWidth margin="normal">
//           <FormControlLabel
//             control={
//               <Checkbox
//                 checked={isShared}
//                 onChange={(e) => {
//                   setIsShared(e.target.checked);
//                   setSelectedLead((prev) => ({
//                     ...prev,
//                     shared: e.target.checked,
//                   }));
//                 }}
//               />
//             }
//             label="Shared Lead"
//           />
//         </FormControl>

//         {/* Number of Buyers (conditional) */}
//         {isShared && (
//           <FormControl fullWidth margin="normal">
//             <TextField
//               label="Number of Buyers to Share With"
//               type="number"
//               value={selectedLead?.shareNumber || 1}
//               onChange={(e) =>
//                 setSelectedLead((prev) => ({
//                   ...prev,
//                   shareNumber: Number(e.target.value),
//                 }))
//               }
//             />
//           </FormControl>
//         )}

//         {/* Lead Unit */}
//         <FormControl fullWidth margin="normal">
//           <TextField
//             label="Lead Unit"
//             type="number"
//             value={selectedLead?.unit || 5}
//             onChange={(e) =>
//               setSelectedLead((prev) => ({
//                 ...prev,
//                 unit: Number(e.target.value),
//               }))
//             }
//           />
//         </FormControl>
//       </DialogContent>
//       <DialogActions>
//         <Button onClick={onClose} color="secondary">
//           Cancel
//         </Button>
//         <Button onClick={onSubmit} color="primary" variant="contained">
//           Save
//         </Button>
//       </DialogActions>
//     </Dialog>
//   );
// };

// export default LeadForm;
// import React, { useEffect, useState } from "react";
// import {
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogActions,
//   TextField,
//   Button,
//   FormControl,
//   InputLabel,
//   Select,
//   MenuItem,
//   Typography,
//   FormControlLabel,
//   Checkbox,
//   CircularProgress,
//   Alert,
//   Box,
// } from "@mui/material";
// import axios from "axios";

// interface FormField {
//   id: string;
//   type: string;
//   label: string;
//   required?: boolean;
//   options?: string[];
// }

// interface Lead {
//   _id: string;
//   userId: string;
//   fields: Array<{ id: string; label: string; value: string; _id?: string }>;
//   createdAt: string;
//   status: "new" | "available" | "assigned" | "sold";
//   distributionMethod: "manual" | "round_robin" | "marketplace";
//   exclusive: boolean;
//   unit: number;
//   shared: boolean;
//   shareNumber: number;
//   isManual: boolean;
// }

// interface UserForm {
//   _id: string;
//   formId: string;
//   userId: string;
//   formName: string;
//   industry: string;
//   leadsource: string;
//   fields: FormField[];
//   createdAt: string;
//   updatedAt: string;
//   __v: number;
// }

// interface LeadFormProps {
//   open: boolean;
//   onClose: () => void;
//   onSubmit: () => void;
//   selectedLead: Lead | null;
//   setSelectedLead: (lead: Lead | ((prev: Lead) => Lead)) => void;
// }

// const LeadForm: React.FC<LeadFormProps> = ({
//   open,
//   onClose,
//   onSubmit,
//   selectedLead,
//   setSelectedLead,
// }) => {
//   const [userForms, setUserForms] = useState<UserForm[]>([]);
//   const [selectedForm, setSelectedForm] = useState<UserForm | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [isShared, setIsShared] = useState(selectedLead?.shared || false);
//   const [formSelectionMode, setFormSelectionMode] = useState(false);
//   const [useLeadFields, setUseLeadFields] = useState(false);
//   const [noMatchingForm, setNoMatchingForm] = useState(false);

//   useEffect(() => {
//     const fetchForms = async () => {
//       try {
//         const response = await axios.get("/api/form/userform");
//         setUserForms(response.data);

//         // If editing an existing lead, find the form that matches the lead's fields
//         if (selectedLead?._id) {
//           const matchingForm = response.data.find((form: { fields: any[] }) =>
//             form.fields.some((formField: { id: string }) =>
//               selectedLead.fields.some(
//                 (leadField) => leadField.id === formField.id
//               )
//             )
//           );

//           if (matchingForm) {
//             setSelectedForm(matchingForm);
//           } else {
//             setNoMatchingForm(true);
//           }
//         }
//         // If adding a new lead and only one form exists, select it automatically
//         else if (response.data.length === 1) {
//           handleFormSelect(response.data[0]);
//         }
//       } catch (error) {
//         console.error("Error fetching forms:", error);
//         setUserForms([]);
//       } finally {
//         setLoading(false);
//       }
//     };

//     if (open) {
//       fetchForms();
//     }
//   }, [selectedLead, open]);

//   useEffect(() => {
//     // When adding a new lead and user has multiple forms, show form selection
//     if (!selectedLead?._id && userForms.length > 1 && open) {
//       setFormSelectionMode(true);
//     } else {
//       setFormSelectionMode(false);
//     }
//   }, [selectedLead, userForms, open]);

//   const handleFormSelect = (form: UserForm) => {
//     setSelectedForm(form);
//     setFormSelectionMode(false);
//     setNoMatchingForm(false);

//     // Initialize fields for new lead based on selected form
//     if (!selectedLead?._id) {
//       setSelectedLead((prev) => ({
//         ...(prev || {
//           _id: "",
//           userId: "",
//           fields: [],
//           createdAt: new Date().toISOString(),
//           status: "new",
//           distributionMethod: "marketplace",
//           exclusive: false,
//           unit: 5,
//           shared: false,
//           shareNumber: 1,
//           isManual: true,
//         }),
//         fields: form.fields.map((field) => ({
//           id: field.id,
//           label: field.label,
//           value: "",
//           _id: undefined,
//         })),
//       }));
//     }
//   };

//   const handleUseLeadFields = () => {
//     setUseLeadFields(true);
//     setNoMatchingForm(false);

//     // Create a temporary form structure from the lead's fields
//     const tempFormFields =
//       selectedLead?.fields.map((field) => ({
//         id: field.id,
//         label: field.label,
//         value: field.value,
//         _id: field._id,
//       })) || [];

//     setSelectedLead((prev) => ({
//       ...(prev || {
//         _id: "",
//         userId: "",
//         fields: [],
//         createdAt: new Date().toISOString(),
//         status: "new",
//         distributionMethod: "marketplace",
//         exclusive: false,
//         unit: 5,
//         shared: false,
//         shareNumber: 1,
//         isManual: true,
//       }),
//       fields: tempFormFields,
//     }));
//   };

//   if (loading) {
//     return (
//       <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
//         <DialogContent
//           sx={{
//             display: "flex",
//             justifyContent: "center",
//             alignItems: "center",
//             height: "200px",
//           }}
//         >
//           <CircularProgress />
//         </DialogContent>
//       </Dialog>
//     );
//   }

//   if (userForms.length === 0) {
//     return (
//       <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
//         <DialogTitle>No Form Defined</DialogTitle>
//         <DialogContent>
//           <Typography>
//             No lead form has been created. Please create a form to add leads.
//           </Typography>
//         </DialogContent>
//         <DialogActions>
//           <Button onClick={onClose} color="secondary">
//             Cancel
//           </Button>
//           <Button
//             onClick={() =>
//               (window.location.href =
//                 "/dashboard/seller/lead_management/formbuilder")
//             }
//             color="primary"
//             variant="contained"
//           >
//             Create Form
//           </Button>
//         </DialogActions>
//       </Dialog>
//     );
//   }

//   if (noMatchingForm && !useLeadFields) {
//     return (
//       <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
//         <DialogTitle>No Matching Form Found</DialogTitle>
//         <DialogContent>
//           <Alert severity="warning" sx={{ mb: 2 }}>
//             We couldn't find a form that matches this lead's fields.
//           </Alert>
//           <Typography>You can either:</Typography>
//           <ol>
//             <li>Select an existing form to use (may not include all fields)</li>
//             <li>Use the lead's fields directly for editing</li>
//           </ol>

//           <Box sx={{ mt: 3 }}>
//             <Button
//               variant="outlined"
//               fullWidth
//               sx={{ mb: 2 }}
//               onClick={() => setFormSelectionMode(true)}
//             >
//               Select Existing Form
//             </Button>
//             <Button variant="contained" fullWidth onClick={handleUseLeadFields}>
//               Use Lead Fields
//             </Button>
//           </Box>
//         </DialogContent>
//         <DialogActions>
//           <Button onClick={onClose} color="secondary">
//             Cancel
//           </Button>
//         </DialogActions>
//       </Dialog>
//     );
//   }

//   // if (formSelectionMode) {
//   //   return (
//   //     <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
//   //       <DialogTitle>Select Form</DialogTitle>
//   //       <DialogContent>
//   //         <FormControl fullWidth margin="normal">
//   //           <InputLabel>Select Form</InputLabel>
//   //           <Select
//   //             value={selectedForm?._id || ""}
//   //             onChange={(e) => {
//   //               const selectedFormId = e.target.value;
//   //               const form = userForms.find(
//   //                 (form) => form._id === selectedFormId
//   //               );
//   //               if (form) handleFormSelect(form);
//   //             }}
//   //           >
//   //             {userForms.map((form) => (
//   //               <MenuItem key={form._id} value={form._id}>
//   //                 {form.formName} - {form.leadsource}
//   //               </MenuItem>
//   //             ))}
//   //           </Select>
//   //         </FormControl>
//   //       </DialogContent>
//   //       <DialogActions>
//   //         <Button onClick={onClose} color="secondary">
//   //           Cancel
//   //         </Button>
//   //         {noMatchingForm && (
//   //           <Button onClick={() => setNoMatchingForm(true)} color="primary">
//   //             Back
//   //           </Button>
//   //         )}
//   //       </DialogActions>
//   //     </Dialog>
//   //   );
//   // }
//   if (formSelectionMode) {
//     return (
//       <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
//         <DialogTitle>Select Form</DialogTitle>
//         <DialogContent>
//           <FormControl fullWidth margin="normal">
//             <InputLabel>Select Form</InputLabel>
//             <Select
//               value={selectedForm?._id || ""}
//               onChange={(e) => {
//                 const selectedFormId = e.target.value;
//                 const form = userForms.find(
//                   (form) => form._id === selectedFormId
//                 );
//                 if (form) setSelectedForm(form);
//               }}
//             >
//               {userForms.map((form) => (
//                 <MenuItem key={form._id} value={form._id}>
//                   {form.formName} - {form.leadsource}
//                 </MenuItem>
//               ))}
//             </Select>
//           </FormControl>
//         </DialogContent>
//         <DialogActions>
//           <Button onClick={onClose} color="secondary">
//             Cancel
//           </Button>
//           {noMatchingForm && (
//             <Button onClick={() => setNoMatchingForm(true)} color="primary">
//               Back
//             </Button>
//           )}
//           <Button
//             onClick={() => {
//               if (selectedForm) {
//                 handleFormSelect(selectedForm);
//               }
//             }}
//             color="primary"
//             variant="contained"
//             disabled={!selectedForm}
//           >
//             OK
//           </Button>
//         </DialogActions>
//       </Dialog>
//     );
//   }
//   // Determine which fields to display
//   const displayFields = useLeadFields
//     ? selectedLead?.fields || [] // When using lead fields directly
//     : selectedLead?._id
//     ? selectedLead.fields.filter((field) =>
//         selectedForm?.fields.some((f) => f.id === field.id)
//       ) // For editing with selected form
//     : selectedForm?.fields.map((f) => ({
//         id: f.id,
//         label: f.label,
//         value: "",
//       })) || []; // For adding with selected form

//   return (
//     <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
//       <DialogTitle>
//         {selectedLead?._id ? "Edit Lead" : "Add Lead"}
//         {useLeadFields && " (Using Lead Fields Directly)"}
//         {selectedForm && ` (Using Form: ${selectedForm.formName})`}
//       </DialogTitle>
//       <DialogContent>
//         {displayFields.map((field) => (
//           <TextField
//             key={field.id}
//             fullWidth
//             label={field.label}
//             margin="normal"
//             value={field.value || ""}
//             onChange={(e) => {
//               setSelectedLead((prev) => {
//                 const updatedFields = prev.fields.map((f) =>
//                   f.id === field.id ? { ...f, value: e.target.value } : f
//                 );

//                 // If the field doesn't exist, add it to the fields array
//                 if (!prev.fields.some((f) => f.id === field.id)) {
//                   updatedFields.push({
//                     id: field.id,
//                     label: field.label,
//                     value: e.target.value,
//                     // _id: field._id,
//                   });
//                 }

//                 return { ...prev, fields: updatedFields };
//               });
//             }}
//           />
//         ))}

//         {/* Status Selection */}
//         <FormControl fullWidth margin="normal">
//           <InputLabel>Status</InputLabel>
//           <Select
//             value={selectedLead?.status || "new"}
//             onChange={(e) =>
//               setSelectedLead((prev) => ({
//                 ...prev,
//                 status: e.target.value as
//                   | "new"
//                   | "available"
//                   | "assigned"
//                   | "sold",
//               }))
//             }
//           >
//             <MenuItem value="new">New</MenuItem>
//             <MenuItem value="available">Available</MenuItem>
//             <MenuItem value="assigned">Assigned</MenuItem>
//             <MenuItem value="sold">Sold Out</MenuItem>
//           </Select>
//         </FormControl>

//         {/* Assignment Method */}
//         <FormControl fullWidth margin="normal">
//           <InputLabel>Assignment Method</InputLabel>
//           <Select
//             value={selectedLead?.distributionMethod || "marketplace"}
//             onChange={(e) =>
//               setSelectedLead((prev) => ({
//                 ...prev,
//                 distributionMethod: e.target.value as
//                   | "manual"
//                   | "round_robin"
//                   | "marketplace",
//               }))
//             }
//           >
//             <MenuItem value="manual">Specific Buyer</MenuItem>
//             <MenuItem value="round_robin">Automatic</MenuItem>
//             <MenuItem value="marketplace">Manual</MenuItem>
//           </Select>
//         </FormControl>

//         {/* Shared Lead Checkbox */}
//         <FormControl fullWidth margin="normal">
//           <FormControlLabel
//             control={
//               <Checkbox
//                 checked={isShared}
//                 onChange={(e) => {
//                   setIsShared(e.target.checked);
//                   setSelectedLead((prev) => ({
//                     ...prev,
//                     shared: e.target.checked,
//                   }));
//                 }}
//               />
//             }
//             label="Shared Lead"
//           />
//         </FormControl>

//         {/* Number of Buyers (conditional) */}
//         {isShared && (
//           <FormControl fullWidth margin="normal">
//             <TextField
//               label="Number of Buyers to Share With"
//               type="number"
//               value={selectedLead?.shareNumber || 1}
//               onChange={(e) =>
//                 setSelectedLead((prev) => ({
//                   ...prev,
//                   shareNumber: Number(e.target.value),
//                 }))
//               }
//             />
//           </FormControl>
//         )}

//         {/* Lead Unit */}
//         <FormControl fullWidth margin="normal">
//           <TextField
//             label="Lead Unit"
//             type="number"
//             value={selectedLead?.unit || 5}
//             onChange={(e) =>
//               setSelectedLead((prev) => ({
//                 ...prev,
//                 unit: Number(e.target.value),
//               }))
//             }
//           />
//         </FormControl>
//       </DialogContent>
//       <DialogActions>
//         <Button onClick={onClose} color="secondary">
//           Cancel
//         </Button>
//         <Button onClick={onSubmit} color="primary" variant="contained">
//           Save
//         </Button>
//       </DialogActions>
//     </Dialog>
//   );
// };

// export default LeadForm;
// import React, { useEffect, useState } from "react";
// import {
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogActions,
//   TextField,
//   Button,
//   FormControl,
//   InputLabel,
//   Select,
//   MenuItem,
//   Typography,
//   FormControlLabel,
//   Checkbox,
//   CircularProgress,
// } from "@mui/material";
// import axios from "axios";
// import { useRouter } from "next/navigation";

// interface FormField {
//   id: string;
//   type: string;
//   label: string;
//   required?: boolean;
//   options?: string[];
// }

// interface Lead {
//   _id: string;
//   userId: string;
//   fields: Array<{ id: string; label: string; value: string; _id?: string }>;
//   createdAt: string;
//   status: "new" | "available" | "assigned" | "sold";
//   distributionMethod: "manual" | "round_robin" | "marketplace";
//   exclusive: boolean;
//   unit: number;
//   shared: boolean;
//   shareNumber: number;
//   isManual: boolean;
// }

// interface UserForm {
//   _id: string;
//   formId: string;
//   userId: string;
//   formName: string;
//   industry: string;
//   leadsource: string;
//   fields: FormField[];
//   createdAt: string;
//   updatedAt: string;
//   __v: number;
// }

// interface LeadFormProps {
//   open: boolean;
//   onClose: () => void;
//   onSubmit: () => void;
//   selectedLead: Lead | null;
//   setSelectedLead: (lead: Lead | ((prev: Lead) => Lead)) => void;
// }

// const LeadForm: React.FC<LeadFormProps> = ({
//   open,
//   onClose,
//   onSubmit,
//   selectedLead,
//   setSelectedLead,
// }) => {
//   const router = useRouter();
//   const [userForms, setUserForms] = useState<UserForm[]>([]);
//   const [selectedForm, setSelectedForm] = useState<UserForm | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [isShared, setIsShared] = useState(selectedLead?.shared || false);
//   const [formSelectionMode, setFormSelectionMode] = useState(false);
//   const [matchingFormLoading, setMatchingFormLoading] = useState(false);

//   useEffect(() => {
//     const fetchForms = async () => {
//       try {
//         const response = await axios.get("/api/form/userform");
//         setUserForms(response.data);

//         // If editing an existing lead, find matching form
//         if (selectedLead?._id) {
//           setMatchingFormLoading(true);
//           const matchingForm = response.data.find((form: { fields: any[] }) =>
//             form.fields.some((formField: { id: string }) =>
//               selectedLead.fields.some(
//                 (leadField) => leadField.id === formField.id
//               )
//             )
//           );

//           if (matchingForm) {
//             setSelectedForm(matchingForm);
//           } else {
//             // No matching form found - use lead fields directly
//             setSelectedLead((prev) => ({
//               ...(prev || {
//                 _id: "",
//                 userId: "",
//                 fields: [],
//                 createdAt: new Date().toISOString(),
//                 status: "new",
//                 distributionMethod: "marketplace",
//                 exclusive: false,
//                 unit: 5,
//                 shared: false,
//                 shareNumber: 1,
//                 isManual: true,
//               }),
//               fields:
//                 prev?.fields.map((field) => ({
//                   id: field.id,
//                   label: field.label,
//                   value: field.value,
//                   _id: field._id,
//                 })) || [],
//             }));
//           }
//           setMatchingFormLoading(false);
//         }
//         // If adding a new lead and only one form exists, select it automatically
//         else if (response.data.length === 1) {
//           handleFormSelect(response.data[0]);
//         }
//       } catch (error) {
//         console.error("Error fetching forms:", error);
//         setUserForms([]);
//         setMatchingFormLoading(false);
//       } finally {
//         setLoading(false);
//       }
//     };

//     if (open) {
//       fetchForms();
//     }
//   }, [selectedLead, open]);

//   useEffect(() => {
//     // When adding a new lead and user has multiple forms, show form selection
//     if (!selectedLead?._id && userForms.length > 1 && open) {
//       setFormSelectionMode(true);
//     } else {
//       setFormSelectionMode(false);
//     }
//   }, [selectedLead, userForms, open]);

//   const handleFormSelect = (form: UserForm) => {
//     setSelectedForm(form);
//     setFormSelectionMode(false);

//     // Initialize fields for new lead based on selected form
//     if (!selectedLead?._id) {
//       setSelectedLead((prev) => ({
//         ...(prev || {
//           _id: "",
//           userId: "",
//           fields: [],
//           createdAt: new Date().toISOString(),
//           status: "new",
//           distributionMethod: "marketplace",
//           exclusive: false,
//           unit: 5,
//           shared: false,
//           shareNumber: 1,
//           isManual: true,
//         }),
//         fields: form.fields.map((field) => ({
//           id: field.id,
//           label: field.label,
//           value: "",
//           _id: undefined,
//         })),
//       }));
//     }
//   };

//   const handleSubmit = async () => {
//     await onSubmit();
//     router.refresh(); // Refresh the page after submission
//   };

//   if (loading || matchingFormLoading) {
//     return (
//       <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
//         <DialogContent
//           sx={{
//             display: "flex",
//             justifyContent: "center",
//             alignItems: "center",
//             height: "200px",
//           }}
//         >
//           <CircularProgress />
//         </DialogContent>
//       </Dialog>
//     );
//   }

//   if (userForms.length === 0) {
//     return (
//       <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
//         <DialogTitle>No Form Defined</DialogTitle>
//         <DialogContent>
//           <Typography>
//             No lead form has been created. Please create a form to add leads.
//           </Typography>
//         </DialogContent>
//         <DialogActions>
//           <Button onClick={onClose} color="secondary">
//             Cancel
//           </Button>
//           <Button
//             onClick={() =>
//               (window.location.href =
//                 "/dashboard/seller/lead_management/formbuilder")
//             }
//             color="primary"
//             variant="contained"
//           >
//             Create Form
//           </Button>
//         </DialogActions>
//       </Dialog>
//     );
//   }

//   if (formSelectionMode) {
//     return (
//       <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
//         <DialogTitle>Select Form</DialogTitle>
//         <DialogContent>
//           <FormControl fullWidth margin="normal">
//             <InputLabel>Select Form</InputLabel>
//             <Select
//               value={selectedForm?._id || ""}
//               onChange={(e) => {
//                 const selectedFormId = e.target.value;
//                 const form = userForms.find(
//                   (form) => form._id === selectedFormId
//                 );
//                 if (form) setSelectedForm(form);
//               }}
//             >
//               {userForms.map((form) => (
//                 <MenuItem key={form._id} value={form._id}>
//                   {form.formName} - {form.leadsource}
//                 </MenuItem>
//               ))}
//             </Select>
//           </FormControl>
//         </DialogContent>
//         <DialogActions>
//           <Button onClick={onClose} color="secondary">
//             Cancel
//           </Button>
//           <Button
//             onClick={() => {
//               if (selectedForm) {
//                 handleFormSelect(selectedForm);
//               }
//             }}
//             color="primary"
//             variant="contained"
//             disabled={!selectedForm}
//           >
//             OK
//           </Button>
//         </DialogActions>
//       </Dialog>
//     );
//   }

//   // Determine which fields to display
//   const displayFields = selectedLead?._id
//     ? selectedForm
//       ? selectedLead.fields.filter((field) =>
//           selectedForm.fields.some((f) => f.id === field.id)
//         ) // For editing with selected form
//       : selectedLead.fields // For editing with lead fields when no matching form
//     : selectedForm?.fields.map((f) => ({
//         id: f.id,
//         label: f.label,
//         value: "",
//       })) || []; // For adding with selected form

//   return (
//     <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
//       <DialogTitle>
//         {selectedLead?._id ? "Edit Lead" : "Add Lead"}
//         {selectedForm && ` (Using Form: ${selectedForm.formName})`}
//         {selectedLead?._id && !selectedForm && " (Using Lead Fields Directly)"}
//       </DialogTitle>
//       <DialogContent>
//         {displayFields.map((field) => (
//           <TextField
//             key={field.id}
//             fullWidth
//             label={field.label}
//             margin="normal"
//             value={field.value || ""}
//             onChange={(e) => {
//               setSelectedLead((prev) => {
//                 const updatedFields = prev.fields.map((f) =>
//                   f.id === field.id ? { ...f, value: e.target.value } : f
//                 );

//                 // If the field doesn't exist, add it to the fields array
//                 if (!prev.fields.some((f) => f.id === field.id)) {
//                   updatedFields.push({
//                     id: field.id,
//                     label: field.label,
//                     value: e.target.value,
//                     // _id: field._id,
//                   });
//                 }

//                 return { ...prev, fields: updatedFields };
//               });
//             }}
//           />
//         ))}

//         {/* Status Selection */}
//         <FormControl fullWidth margin="normal">
//           <InputLabel>Status</InputLabel>
//           <Select
//             value={selectedLead?.status || "new"}
//             onChange={(e) =>
//               setSelectedLead((prev) => ({
//                 ...prev,
//                 status: e.target.value as
//                   | "new"
//                   | "available"
//                   | "assigned"
//                   | "sold",
//               }))
//             }
//           >
//             <MenuItem value="new">New</MenuItem>
//             <MenuItem value="available">Available</MenuItem>
//             <MenuItem value="assigned">Assigned</MenuItem>
//             <MenuItem value="sold">Sold Out</MenuItem>
//           </Select>
//         </FormControl>

//         {/* Assignment Method */}
//         <FormControl fullWidth margin="normal">
//           <InputLabel>Assignment Method</InputLabel>
//           <Select
//             value={selectedLead?.distributionMethod || "marketplace"}
//             onChange={(e) =>
//               setSelectedLead((prev) => ({
//                 ...prev,
//                 distributionMethod: e.target.value as
//                   | "manual"
//                   | "round_robin"
//                   | "marketplace",
//               }))
//             }
//           >
//             <MenuItem value="manual">Specific Buyer</MenuItem>
//             <MenuItem value="round_robin">Automatic</MenuItem>
//             <MenuItem value="marketplace">Manual</MenuItem>
//           </Select>
//         </FormControl>

//         {/* Shared Lead Checkbox */}
//         <FormControl fullWidth margin="normal">
//           <FormControlLabel
//             control={
//               <Checkbox
//                 checked={isShared}
//                 onChange={(e) => {
//                   setIsShared(e.target.checked);
//                   setSelectedLead((prev) => ({
//                     ...prev,
//                     shared: e.target.checked,
//                   }));
//                 }}
//               />
//             }
//             label="Shared Lead"
//           />
//         </FormControl>

//         {/* Number of Buyers (conditional) */}
//         {isShared && (
//           <FormControl fullWidth margin="normal">
//             <TextField
//               label="Number of Buyers to Share With"
//               type="number"
//               value={selectedLead?.shareNumber || 1}
//               onChange={(e) =>
//                 setSelectedLead((prev) => ({
//                   ...prev,
//                   shareNumber: Number(e.target.value),
//                 }))
//               }
//             />
//           </FormControl>
//         )}

//         {/* Lead Unit */}
//         <FormControl fullWidth margin="normal">
//           <TextField
//             label="Lead Unit"
//             type="number"
//             value={selectedLead?.unit || 5}
//             onChange={(e) =>
//               setSelectedLead((prev) => ({
//                 ...prev,
//                 unit: Number(e.target.value),
//               }))
//             }
//           />
//         </FormControl>
//       </DialogContent>
//       <DialogActions>
//         <Button onClick={onClose} color="secondary">
//           Cancel
//         </Button>
//         <Button onClick={handleSubmit} color="primary" variant="contained">
//           Save
//         </Button>
//       </DialogActions>
//     </Dialog>
//   );
// };

// export default LeadForm;
import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  FormControlLabel,
  Checkbox,
  CircularProgress,
} from "@mui/material";
import axios from "axios";
import { useRouter } from "next/navigation";

interface FormField {
  id: string;
  type: string;
  label: string;
  required?: boolean;
  options?: string[];
}

interface Lead {
  _id: string;
  userId: string;
  fields: Array<{ id: string; label: string; value: string; _id?: string }>;
  createdAt: string;
  status: "new" | "available" | "assigned" | "sold";
  distributionMethod: "manual" | "round_robin" | "marketplace";
  exclusive: boolean;
  unit: number;
  shared: boolean;
  shareNumber: number;
  isManual: boolean;
}

interface UserForm {
  _id: string;
  formId: string;
  userId: string;
  formName: string;
  industry: string;
  leadsource: string;
  fields: FormField[];
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface LeadFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  selectedLead: Lead | null;
  setSelectedLead: (lead: Lead | ((prev: Lead) => Lead)) => void;
}

const DEFAULT_ADD_LEAD_FORM: UserForm = {
  _id: "default-add-lead-form",
  formId: "default-add-lead-form",
  userId: "",
  formName: "Default Lead Form",
  industry: "general",
  leadsource: "manual",
  fields: [
    {
      id: "name",
      type: "text",
      label: "Name",
      required: true,
      options: [],
    },
    {
      id: "email",
      type: "email",
      label: "Email",
      required: true,
      options: [],
    },
    {
      id: "phone",
      type: "tel",
      label: "Phone",
      required: false,
      options: [],
    },
    {
      id: "city",
      type: "text",
      label: "City",
      required: false,
      options: [],
    },
    {
      id: "address",
      type: "text",
      label: "Address",
      required: false,
      options: [],
    },
    {
      id: "service_needed",
      type: "textarea",
      label: "Service Needed",
      required: true,
      options: [],
    },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  __v: 0,
};

const LeadForm: React.FC<LeadFormProps> = ({
  open,
  onClose,
  onSubmit,
  selectedLead,
  setSelectedLead,
}) => {
  const router = useRouter();
  const [userForms, setUserForms] = useState<UserForm[]>([]);
  const [selectedForm, setSelectedForm] = useState<UserForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [isShared, setIsShared] = useState(selectedLead?.shared || false);
  const [matchingFormLoading, setMatchingFormLoading] = useState(false);

  useEffect(() => {
    const fetchForms = async () => {
      try {
        const response = await axios.get("/api/form/userform");
        setUserForms(response.data);

        // If editing an existing lead, find matching form
        if (selectedLead?._id) {
          setMatchingFormLoading(true);
          const matchingForm = response.data.find((form: { fields: any[] }) =>
            form.fields.some((formField: { id: string }) =>
              selectedLead.fields.some(
                (leadField) => leadField.id === formField.id
              )
            )
          );

          if (matchingForm) {
            setSelectedForm(matchingForm);
          } else {
            // Use lead fields directly for editing
            setSelectedLead((prev) => ({
              ...prev!,
              fields:
                prev?.fields.map((field) => ({
                  ...field,
                  _id: field._id,
                })) || [],
            }));
          }
          setMatchingFormLoading(false);
        } else {
          // For adding new lead, use the default form
          setSelectedForm(DEFAULT_ADD_LEAD_FORM);
          initializeDefaultLeadForm();
        }
      } catch (error) {
        console.error("Error fetching forms:", error);
        setUserForms([]);
        setMatchingFormLoading(false);
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchForms();
    }
  }, [selectedLead, open]);

  const initializeDefaultLeadForm = () => {
    if (!selectedLead?._id) {
      setSelectedLead({
        _id: "",
        userId: "",
        fields: DEFAULT_ADD_LEAD_FORM.fields.map((field) => ({
          id: field.id,
          label: field.label,
          value: "",
        })),
        createdAt: new Date().toISOString(),
        status: "new",
        distributionMethod: "marketplace",
        exclusive: false,
        unit: 5,
        shared: false,
        shareNumber: 1,
        isManual: true,
      });
    }
  };

  const handleSubmit = async () => {
    try {
      await onSubmit();
      router.refresh();
      onClose();
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  if (loading || matchingFormLoading) {
    return (
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogContent
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "200px",
          }}
        >
          <CircularProgress />
        </DialogContent>
      </Dialog>
    );
  }

  if (userForms.length === 0 && !selectedLead?._id) {
    return (
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>Add New Lead</DialogTitle>
        <DialogContent>{/* Default form will be shown */}</DialogContent>
      </Dialog>
    );
  }

  // Determine which fields to display
  const displayFields = selectedLead?._id
    ? selectedForm
      ? selectedLead.fields.filter((field) =>
          selectedForm.fields.some((f) => f.id === field.id)
        )
      : selectedLead.fields
    : DEFAULT_ADD_LEAD_FORM.fields.map((f) => ({
        id: f.id,
        label: f.label,
        value: "",
      }));

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {selectedLead?._id ? "Edit Lead" : "Add Lead"}
        {selectedLead?._id &&
          selectedForm &&
          ` (Using Form: ${selectedForm.formName})`}
        {selectedLead?._id && !selectedForm && " (Using Lead Fields Directly)"}
      </DialogTitle>
      <DialogContent>
        {displayFields.map((field) => (
          <TextField
            key={field.id}
            fullWidth
            label={field.label}
            margin="normal"
            value={field.value || ""}
            onChange={(e) => {
              setSelectedLead((prev) => {
                if (!prev) return prev;
                const fieldExists = prev.fields.some((f) => f.id === field.id);
                return {
                  ...prev,
                  fields: fieldExists
                    ? prev.fields.map((f) =>
                        f.id === field.id ? { ...f, value: e.target.value } : f
                      )
                    : [
                        ...prev.fields,
                        {
                          id: field.id,
                          label: field.label,
                          value: e.target.value,
                        },
                      ],
                };
              });
            }}
          />
        ))}

        {/* Status Selection */}
        <FormControl fullWidth margin="normal">
          <InputLabel>Status</InputLabel>
          <Select
            value={selectedLead?.status || "new"}
            onChange={(e) =>
              setSelectedLead((prev) => ({
                ...prev,
                status: e.target.value as
                  | "new"
                  | "available"
                  | "assigned"
                  | "sold",
              }))
            }
          >
            <MenuItem value="new">New</MenuItem>
            <MenuItem value="available">Available</MenuItem>
            <MenuItem value="assigned">Assigned</MenuItem>
            <MenuItem value="sold">Sold Out</MenuItem>
          </Select>
        </FormControl>

        {/* Assignment Method */}
        <FormControl fullWidth margin="normal">
          <InputLabel>Assignment Method</InputLabel>
          <Select
            value={selectedLead?.distributionMethod || "marketplace"}
            onChange={(e) =>
              setSelectedLead((prev) => ({
                ...prev,
                distributionMethod: e.target.value as
                  | "manual"
                  | "round_robin"
                  | "marketplace",
              }))
            }
          >
            <MenuItem value="manual">Specific Buyer</MenuItem>
            <MenuItem value="round_robin">Automatic</MenuItem>
            <MenuItem value="marketplace">Manual</MenuItem>
          </Select>
        </FormControl>

        {/* Shared Lead Checkbox */}
        <FormControl fullWidth margin="normal">
          <FormControlLabel
            control={
              <Checkbox
                checked={isShared}
                onChange={(e) => {
                  setIsShared(e.target.checked);
                  setSelectedLead((prev) => ({
                    ...prev,
                    shared: e.target.checked,
                  }));
                }}
              />
            }
            label="Shared Lead"
          />
        </FormControl>

        {/* Number of Buyers (conditional) */}
        {isShared && (
          <FormControl fullWidth margin="normal">
            <TextField
              label="Number of Buyers to Share With"
              type="number"
              value={selectedLead?.shareNumber || 1}
              onChange={(e) =>
                setSelectedLead((prev) => ({
                  ...prev,
                  shareNumber: Number(e.target.value),
                }))
              }
            />
          </FormControl>
        )}

        {/* Lead Unit */}
        <FormControl fullWidth margin="normal">
          <TextField
            label="Lead Unit"
            type="number"
            value={selectedLead?.unit || 5}
            onChange={(e) =>
              setSelectedLead((prev) => ({
                ...prev,
                unit: Number(e.target.value),
              }))
            }
          />
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary">
          Cancel
        </Button>
        <Button onClick={handleSubmit} color="primary" variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LeadForm;
