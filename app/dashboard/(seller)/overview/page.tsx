"use client";

import dynamic from "next/dynamic";
import { Box, CircularProgress } from "@mui/material";

const Overview = dynamic(() => import("./overview"), {
  loading: () => (
    <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
      <CircularProgress />
    </Box>
  ),
  ssr: false,
});

const OverViewPage = () => {
  return <Overview />;
};

export default OverViewPage;
