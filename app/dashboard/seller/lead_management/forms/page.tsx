"use client";
import { useEffect, useState } from "react";
import {
  Typography,
  Paper,
  Container,
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
import UserDashboard from "../../layout";
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

  const handleDelete = async (formId: string) => {
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

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  return (
    <UserDashboard>
      <Container sx={{ padding: { xs: 2, sm: 4 } }}>
        <Typography
          variant="h5"
          gutterBottom
          sx={{ mb: 4, mt: 4, fontWeight: "bold", color: "primary.main" }}
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
                const iframeCode = `<iframe src="${formUrl}" width="600" height="400" frameborder="0"></iframe>`;
                return (
                  <ListItem
                    key={form.formId}
                    sx={{ flexDirection: "column", alignItems: "flex-start" }}
                  >
                    <ListItemText
                      primary={form.formName}
                      secondary={`Created on: ${new Date(
                        form.createdAt
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
                        width: "100%",
                        mt: 1,
                      }}
                    >
                      <IconButton
                        onClick={() => handleDelete(form.formId)}
                        color="error"
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
      </Container>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
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
    </UserDashboard>
  );
}
