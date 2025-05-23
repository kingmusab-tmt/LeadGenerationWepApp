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

  // if (userForms.length === 0 && !selectedLead?._id) {
  //   return (
  //     <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
  //       <DialogTitle>Add New Lead</DialogTitle>
  //       <DialogContent>{/* Default form will be shown */}</DialogContent>
  //     </Dialog>
  //   );
  // }

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
