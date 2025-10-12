"use client";
import { Container, Typography } from "@mui/material";
import FormBuilder from "@/app/components/leadcapture/formbuilder";
import UserDashboard from "../../layout";

const FormBuilderPage = () => {
  return (
    <UserDashboard>
      <Container sx={{ mt: "4rem", maxWidth: "1200px" }}>
        <FormBuilder />
      </Container>
    </UserDashboard>
  );
};

export default FormBuilderPage;
