import { Suspense } from "react";
import { Box } from "@mui/material";
import LoadingComponent from "@/app/components/generalComponent/loadingcomponent";
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
          <LoadingComponent />
        </Box>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
