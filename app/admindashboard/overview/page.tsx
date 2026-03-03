"use client";

import dynamic from "next/dynamic";
import { Box, CircularProgress } from "@mui/material";

const AdminOverview = dynamic(() => import("./overview"), {
  loading: () => (
    <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
      <CircularProgress />
    </Box>
  ),
  ssr: false,
});

const OverviewPage = () => {
  return <AdminOverview />;
};

export default OverviewPage;
