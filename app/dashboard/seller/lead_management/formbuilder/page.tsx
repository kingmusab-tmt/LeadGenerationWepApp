"use client";
import { Container, Typography } from "@mui/material";
import FormBuilder from "@/app/components/leadcapture/formbuilder";
import UserDashboard from "../../layout";

const FormBuilderPage = () => {
  return (
    <UserDashboard>
      <Container>
        <Typography variant="h4" gutterBottom sx={{ mt: 5 }}>
          Form Builder
        </Typography>
        <Typography variant="body1" sx={{ mb: 4 }}>
          Add field Label and click the field to Create your custom form.
          Preview your form in real-time.
        </Typography>
        <FormBuilder />
      </Container>
    </UserDashboard>
  );
};

export default FormBuilderPage;
