"use client";
import { useEffect, useState } from "react";
import {
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Button,
  IconButton,
  TextField,
  Box,
  Snackbar,
  Alert,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import FileCopyIcon from "@mui/icons-material/FileCopy";
import { useRouter } from "next/navigation";
import LoadingComponent from "@/app/components/generalComponent/loadingcomponent";

type FormType = {
  formName: string;
  formId: string;
  createdAt: string;
};

export default function SellerForms() {
  const [forms, setForms] = useState<FormType[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [formToDelete, setFormToDelete] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    const fetchForms = async () => {
      try {
        const response = await fetch(`/api/form/userform`);
        if (!response.ok) throw new Error("Failed to fetch forms");
        const result: FormType[] = await response.json();
        setForms(result);
      } catch (error) {
        setSnackbar({
          open: true,
          message:
            error instanceof Error
              ? error.message
              : "An unknown error occurred",
          severity: "error",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchForms();
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setSnackbar({
      open: true,
      message: "Copied to clipboard!",
      severity: "success",
    });
  };

  const handleDeleteClick = (formId: string) => {
    setFormToDelete(formId);
    setSnackbar({
      open: true,
      message: "Are you sure you want to delete this form?",
      severity: "info",
    });
  };

  const handleConfirmDelete = async () => {
    if (!formToDelete) return;

    try {
      const response = await fetch(`/api/form/delete?id=${formToDelete}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete form");
      setForms(forms.filter((form) => form.formId !== formToDelete));
      setSnackbar({
        open: true,
        message: "Form deleted successfully",
        severity: "success",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message:
          error instanceof Error ? error.message : "An unknown error occurred",
        severity: "error",
      });
    } finally {
      setFormToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setFormToDelete(null);
    setSnackbar({
      open: false,
      message: "",
      severity: "info",
    });
  };

  const handleDelete = async (formId: string) => {
    if (!confirm("Are you sure you want to delete this form?")) {
      return;
    }

    try {
      const response = await fetch(`/api/form/delete?id=${formId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete form");
      setForms(forms.filter((form) => form.formId !== formId));
      setSnackbar({
        open: true,
        message: "Form deleted successfully",
        severity: "success",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message:
          error instanceof Error ? error.message : "An unknown error occurred",
        severity: "error",
      });
    }
  };

  const handleClone = async (formId: string) => {
    try {
      setLoading(true);
      const response = await fetch("/api/form/clone", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ formId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to clone form");
      }

      const result = await response.json();

      setSnackbar({
        open: true,
        message: result.message,
        severity: "success",
      });

      // Refresh the forms list
      const fetchResponse = await fetch(`/api/form/userform`);
      if (fetchResponse.ok) {
        const updatedForms: FormType[] = await fetchResponse.json();
        setForms(updatedForms);
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message:
          error instanceof Error ? error.message : "An unknown error occurred",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (formId: string) => {
    router.push(`/dashboard/seller/lead_management/forms/edit/${formId}`);
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Typography
        variant="h5"
        gutterBottom
        sx={{ mb: 4, fontWeight: "bold", color: "primary.main" }}
      >
        My Forms
      </Typography>
      {loading ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "50vh",
          }}
        >
          <LoadingComponent />
        </Box>
      ) : forms.length === 0 ? (
        <Box sx={{ textAlign: "center", mt: 4 }}>
          <Typography variant="h6">You have not created any forms</Typography>
          <Button
            variant="contained"
            color="primary"
            sx={{ mt: 2 }}
            onClick={() =>
              router.push("/dashboard/seller/lead_management/formbuilder")
            }
          >
            Click here to create a form
          </Button>
        </Box>
      ) : (
        <Paper elevation={3} sx={{ p: 3 }}>
          <List>
            {forms.map((form) => {
              const formUrl = `${window.location.origin}/forms/${form.formId}`;
              const iframeId = `iframeID-${form.formId}`;
              const iframeCode = `<script type="text/javascript">
\twindow.addEventListener("message", function (event) {
\t\tif (event.data.hasOwnProperty("FrameHeight")) {
\t\t\tvar iframe = document.getElementById("${iframeId}");
\t\t\tif (iframe) {
\t\t\t\tiframe.style.height = event.data.FrameHeight + "px";
\t\t\t}
\t\t}
\t\tif (event.data.hasOwnProperty("RedirectURL")) {
\t\t\twindow.location.href = event.data.RedirectURL;
\t\t}
\t});
</script>
<iframe id="${iframeId}" scrolling="no" style="border:0px;width:100%;overflow:hidden;min-height:400px;" src="${formUrl}"></iframe>`;
              return (
                <ListItem
                  key={form.formId}
                  sx={{ flexDirection: "column", alignItems: "flex-start" }}
                >
                  <ListItemText
                    primary={form.formName}
                    secondary={`Created on: ${new Date(
                      form.createdAt,
                    ).toLocaleDateString()}`}
                  />
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      width: "100%",
                    }}
                  >
                    <TextField
                      fullWidth
                      value={formUrl}
                      variant="outlined"
                      size="small"
                      disabled
                    />
                    <IconButton onClick={() => handleCopy(formUrl)}>
                      <ContentCopyIcon />
                    </IconButton>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      width: "100%",
                      mt: 1,
                    }}
                  >
                    <TextField
                      fullWidth
                      value={iframeCode}
                      variant="outlined"
                      size="small"
                      disabled
                    />
                    <IconButton onClick={() => handleCopy(iframeCode)}>
                      <ContentCopyIcon />
                    </IconButton>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 1,
                      width: "100%",
                      mt: 1,
                    }}
                  >
                    <IconButton
                      onClick={() => handleEdit(form.formId)}
                      color="primary"
                      title="Edit Form"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => handleClone(form.formId)}
                      color="info"
                      title="Clone Form"
                    >
                      <FileCopyIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDeleteClick(form.formId)}
                      color="error"
                      title="Delete Form"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </ListItem>
              );
            })}
          </List>
        </Paper>
      )}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={formToDelete ? undefined : 3000}
        onClose={formToDelete ? undefined : handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
          action={
            formToDelete ? (
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  color="inherit"
                  size="small"
                  onClick={handleConfirmDelete}
                >
                  Delete
                </Button>
                <Button
                  color="inherit"
                  size="small"
                  onClick={handleCancelDelete}
                >
                  Cancel
                </Button>
              </Box>
            ) : undefined
          }
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
