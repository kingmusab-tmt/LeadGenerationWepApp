"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Typography,
  Paper,
  Container,
  Backdrop,
  Alert,
  Snackbar,
} from "@mui/material";
import FormPreview from "@/app/components/leadcapture/FormPreview";
import LoadingComponent from "@/app/components/generalComponent/loadingcomponent";

interface Field {
  id: string;
  type: string;
  label: string;
  required?: boolean;
  options?: string[];
}

interface FormData {
  userId: string;
  message: string;
  fields: Field[];
  leadSource: string;
}

export default function FormPage() {
  const params = useParams(); // Get params object
  const formId =
    typeof params.formId === "string"
      ? params.formId
      : params.formId?.[0] ?? ""; // Ensure it's always a string
  const [formStructure, setFormStructure] = useState<Field[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [leadSource, setLeadSource] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({
    open: false,
    message: "",
    severity: "info",
  });
  const [submitted, setSubmitted] = useState<boolean>(false);

  useEffect(() => {
    if (!formId) return; // Ensure formId is available before fetching

    // Fetch form structure from the backend
    const fetchForm = async () => {
      try {
        const response = await fetch(`/api/form?formId=${formId}`);
        const result: FormData = await response.json();
        if (response.ok) {
          setFormStructure(result.fields);
          setUserId(result.userId);
          setLeadSource(result.leadSource);
        } else {
          setSnackbar({
            open: true,
            message: result?.message || "Failed to fetch form",
            severity: "error",
          });
        }
      } catch (error) {
        console.error("Error fetching form:", error);
        setSnackbar({
          open: true,
          message: "An error occurred while fetching the form",
          severity: "error",
        });
      }
    };

    fetchForm();
  }, [formId]);

  const handleSubmit = async (formData: { [key: string]: any }) => {
    setLoading(true);
    setErrors({});

    // Validate required fields
    const newErrors: { [key: string]: string } = {};
    formStructure.forEach((field) => {
      if (field.required && !formData[field.id]) {
        newErrors[field.id] = `${field.label} is required`;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLoading(false);
      setSnackbar({
        open: true,
        message: "Please fill all required fields",
        severity: "error",
      });
      return;
    }

    try {
      const response = await fetch("/api/form/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          formId,
          leadSource,
          fields: formStructure.map((field) => ({
            id: field.id,
            label: field.label,
            value: formData[field.id],
          })),
        }),
      });

      const result = await response.json();
      if (response.ok) {
        setSnackbar({
          open: true,
          message: "Form submitted successfully!",
          severity: "success",
        });
        setSubmitted(true); // Show thank-you message
      } else {
        setSnackbar({
          open: true,
          message: result?.message || "Failed to submit form",
          severity: "error",
        });
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      setSnackbar({
        open: true,
        message: "An error occurred while submitting the form",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container sx={{ padding: { xs: 2, sm: 4 } }}>
      <Typography variant="h4" gutterBottom sx={{ textAlign: "center", mb: 4 }}>
        Lead Capture Form
      </Typography>
      <Paper elevation={3} sx={{ p: 3 }}>
        <FormPreview
          fields={formStructure}
          userId={userId}
          formId={formId}
          isLoggedIn={false}
          onSubmit={handleSubmit}
          errors={errors}
          loading={loading}
        />
      </Paper>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Backdrop for loading and thank-you message */}
      <Backdrop
        open={loading || submitted}
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        {loading ? (
          <LoadingComponent />
        ) : (
          <Typography variant="h5" sx={{ textAlign: "center" }}>
            Your request has been submitted. Thank you! Kindly close the tab.
          </Typography>
        )}
      </Backdrop>
    </Container>
  );
}
