"use client";

import dynamic from "next/dynamic";
import { Box, CircularProgress } from "@mui/material";

const TierManagement = dynamic(() => import("./tier"), {
  loading: () => (
    <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
      <CircularProgress />
    </Box>
  ),
  ssr: false,
});

const TierManagementPage = () => {
  return <TierManagement />;
};

export default TierManagementPage;
