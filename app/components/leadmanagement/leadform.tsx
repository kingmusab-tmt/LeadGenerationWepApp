import React, { useEffect, useState, useCallback } from "react";
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
import axios from "@/lib/axiosInstance";
import { useRouter } from "next/navigation";
import { Lead } from "@/types/lead";
import { DEFAULT_LEAD_FORM_FIELDS } from "@/lib/defaultLeadFormFields";

interface FormField {
  id: string;
  type: string;
  label: string;
  required?: boolean;
  options?: string[];
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
  onSubmit: (lead: Lead) => void | Promise<void>;
  selectedLead: Lead | null;
  setSelectedLead: React.Dispatch<React.SetStateAction<Lead | null>>;
}

const DEFAULT_ADD_LEAD_FORM: UserForm = {
  _id: "default-add-lead-form",
  formId: "default-add-lead-form",
  userId: "",
  formName: "Default Lead Form",
  industry: "general",
  leadsource: "manual",
  fields: DEFAULT_LEAD_FORM_FIELDS.map((field) => ({ ...field, options: [] })),
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
  const [loading, setLoading] = useState(false);
  const [isShared, setIsShared] = useState(selectedLead?.shared || false);
  const [matchingFormLoading, setMatchingFormLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formFields, setFormFields] = useState<
    Array<{ id: string; label: string; value: string }>
  >([]);

  // Initialize form fields based on selectedLead or default form
  const initializeFormFields = useCallback(
    (form: UserForm, existingLead?: Lead | null) => {
      const formFieldDefs = form.fields || [];
      if (existingLead?._id) {
        // For editing existing lead, use existing field values
        const fields = formFieldDefs.map((formField) => {
          const existingField = existingLead.fields.find(
            (f) => f.id === formField.id,
          );
          return {
            id: formField.id,
            label: formField.label,
            value: existingField?.value || "",
          };
        });
        setFormFields(fields);
      } else {
        // For new lead, initialize with empty values
        const fields = formFieldDefs.map((field) => ({
          id: field.id,
          label: field.label,
          value: "",
        }));
        setFormFields(fields);
      }
    },
    [],
  );

  // Fetch user forms only when dialog opens
  useEffect(() => {
    const fetchForms = async () => {
      if (!open) return;

      setLoading(true);
      try {
        const response = await axios.get("/api/form/userform");
        const forms = response.data;
        setUserForms(forms);

        if (selectedLead?._id) {
          // Editing existing lead - find matching form
          setMatchingFormLoading(true);
          const matchingForm = forms.find((form: UserForm) =>
            (form.fields || []).some((formField: FormField) =>
              selectedLead.fields.some(
                (leadField) => leadField.id === formField.id,
              ),
            ),
          );

          if (matchingForm) {
            setSelectedForm(matchingForm);
            initializeFormFields(matchingForm, selectedLead);
          } else {
            // No matching form found, use lead fields directly
            setSelectedForm(null);
            setFormFields(
              selectedLead.fields.map((field) => ({
                id: field.id,
                label: field.label,
                value: field.value,
              })),
            );
          }
          setMatchingFormLoading(false);
        } else {
          // Adding new lead. Default to the first form (or the only one, if
          // there's just one) — when there's more than one, the "Select
          // Form" dropdown below lets the seller change this pick; with
          // zero or one form there's nothing to choose, so no prompt shows.
          if (forms.length > 0) {
            setSelectedForm(forms[0]);
            initializeFormFields(forms[0], null);
          } else {
            // No user forms available, use default
            setSelectedForm(DEFAULT_ADD_LEAD_FORM);
            initializeFormFields(DEFAULT_ADD_LEAD_FORM, null);
          }
        }
      } catch (error) {
        console.error("Error fetching forms:", error);
        setUserForms([]);
        // Use default form on error
        setSelectedForm(DEFAULT_ADD_LEAD_FORM);
        initializeFormFields(DEFAULT_ADD_LEAD_FORM, selectedLead);
      } finally {
        setLoading(false);
      }
    };

    fetchForms();
  }, [open, selectedLead?._id]); // Only depend on open and lead ID

  // Update form fields when selectedLead changes
  useEffect(() => {
    if (selectedLead && selectedForm) {
      setIsShared(selectedLead.shared || false);
    }
  }, [selectedLead, selectedForm]);

  const handleFieldChange = (fieldId: string, value: string) => {
    setFormFields((prev) =>
      prev.map((field) => (field.id === fieldId ? { ...field, value } : field)),
    );
  };

  const handleSubmit = async () => {
    if (!selectedLead || submitting) return;

    // Build the final lead object and pass it directly to onSubmit rather
    // than relying on setSelectedLead + reading the parent's state back —
    // setSelectedLead schedules an async update, so onSubmit (a callback
    // closed over the parent's *previous* render) would otherwise still see
    // the old fields/shared/shareNumber values, silently discarding
    // whatever the user just typed into the form.
    const updatedLead: Lead = {
      ...selectedLead,
      fields: formFields,
      shared: isShared,
      shareNumber: selectedLead.shareNumber || 1,
      unit: selectedLead.unit || 5,
    };

    setSubmitting(true);
    try {
      setSelectedLead(updatedLead);
      await onSubmit(updatedLead);
      router.refresh();
      onClose();

      // Reset form state after successful submission
      setFormFields([]);
      setSelectedForm(null);
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset states when closing
    setFormFields([]);
    setSelectedForm(null);
    setIsShared(false);
    onClose();
  };

  if (loading || matchingFormLoading) {
    return (
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
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

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {selectedLead?._id ? "Edit Lead" : "Add Lead"}
        {selectedForm && ` (Using Form: ${selectedForm.formName})`}
      </DialogTitle>
      <DialogContent>
        {/* Form Selection for New Leads — only shown when there's an actual
            choice to make. One form (or zero, using the default) is used
            directly with no prompt; multiple forms means the seller picks
            which field structure this lead should use. */}
        {!selectedLead?._id && userForms.length > 1 && (
          <FormControl fullWidth margin="normal">
            <InputLabel>Select Form</InputLabel>
            <Select
              value={selectedForm?._id || ""}
              onChange={(e) => {
                const form =
                  userForms.find((f) => f._id === e.target.value) ||
                  DEFAULT_ADD_LEAD_FORM;
                setSelectedForm(form);
                initializeFormFields(form, null);
              }}
              label="Select Form"
            >
              {userForms.map((form) => (
                <MenuItem key={form._id} value={form._id}>
                  {form.formName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {/* Form Fields */}
        {formFields.map((field) => (
          <TextField
            key={field.id}
            fullWidth
            label={field.label}
            margin="normal"
            value={field.value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
          />
        ))}

        {/* Status Selection */}
        <FormControl fullWidth margin="normal">
          <InputLabel>Status</InputLabel>
          <Select
            value={selectedLead?.status || "new"}
            label="Status"
            onChange={(e) =>
              setSelectedLead((prev) => ({
                ...prev!,
                status: e.target.value as Lead["status"],
              }))
            }
          >
            <MenuItem value="new">New</MenuItem>
            <MenuItem value="available">Available</MenuItem>
            <MenuItem value="qualified">Qualified</MenuItem>
            <MenuItem value="unqualified">Unqualified</MenuItem>
            <MenuItem value="assigned">Assigned</MenuItem>
            <MenuItem value="sold">Sold Out</MenuItem>
            <MenuItem value="transferred">Transferred</MenuItem>
          </Select>
        </FormControl>

        {/* Assignment Method */}
        <FormControl fullWidth margin="normal">
          <InputLabel>Assignment Method</InputLabel>
          <Select
            value={selectedLead?.distributionMethod || "marketplace"}
            label="Assignment Method"
            onChange={(e) =>
              setSelectedLead((prev) => ({
                ...prev!,
                distributionMethod: e.target.value as
                  | "manual"
                  | "round_robin"
                  | "marketplace",
              }))
            }
          >
            <MenuItem value="manual">Assign to Specific Buyer</MenuItem>
            <MenuItem value="round_robin">Automatic Round-Robin</MenuItem>
            <MenuItem value="marketplace">List on Marketplace</MenuItem>
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
                    ...prev!,
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
                  ...prev!,
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
                ...prev!,
                unit: Number(e.target.value),
              }))
            }
          />
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="secondary" disabled={submitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          color="primary"
          variant="contained"
          disabled={submitting}
        >
          {submitting ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LeadForm;
