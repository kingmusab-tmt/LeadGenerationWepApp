"use client";
import { useState } from "react";
import { TextField, Button, Box, Typography, Alert } from "@mui/material";

const TawkSetupForm = () => {
  const [form, setForm] = useState({
    // email: "",
    tawkPropertyId: "",
    tawkWidgetId: "",
  });
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    setStatus("idle");
    setMessage("");
    try {
      const res = await fetch("/api/settings/sellerlivechat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (data.success) {
        setStatus("success");
        setMessage("Tawk IDs updated successfully!");
      } else {
        throw new Error(data.message || "Something went wrong");
      }
    } catch (error: any) {
      setStatus("error");
      setMessage(error.message);
    }
  };

  return (
    <Box maxWidth={400} mx="auto" p={2}>
      <Typography variant="h6" gutterBottom>
        Setup Tawk.to for Seller
      </Typography>

      {/* <TextField
        label="Seller Email"
        name="email"
        fullWidth
        margin="normal"
        value={form.email}
        onChange={handleChange}
      /> */}
      <TextField
        label="Tawk Property ID"
        name="tawkPropertyId"
        fullWidth
        margin="normal"
        value={form.tawkPropertyId}
        onChange={handleChange}
      />
      <TextField
        label="Tawk Widget ID"
        name="tawkWidgetId"
        fullWidth
        margin="normal"
        value={form.tawkWidgetId}
        onChange={handleChange}
      />

      <Button
        variant="contained"
        fullWidth
        sx={{ mt: 2 }}
        onClick={handleSubmit}
      >
        Save Tawk Configuration
      </Button>

      {status !== "idle" && (
        <Alert
          severity={status === "success" ? "success" : "error"}
          sx={{ mt: 2 }}
        >
          {message}
        </Alert>
      )}
    </Box>
  );
};

export default TawkSetupForm;
