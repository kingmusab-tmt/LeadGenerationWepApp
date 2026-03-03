import { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import SignInContent from "./signin-content";

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
          }}
        >
          <CircularProgress />
        </Box>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
