import { useState } from "react";
import { Container, Typography, TextField, Button } from "@mui/material";

const LandingPageBuilder = () => {
  const [title, setTitle] = useState("My Landing Page");
  const [content, setContent] = useState("Welcome to our landing page!");

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Landing Page Builder
      </Typography>
      <TextField
        label="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        fullWidth
        sx={{ mb: 2 }}
      />
      <TextField
        label="Content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        fullWidth
        multiline
        rows={4}
        sx={{ mb: 2 }}
      />
      <Button variant="contained" color="primary">
        Publish Landing Page
      </Button>
    </Container>
  );
};

export default LandingPageBuilder;
