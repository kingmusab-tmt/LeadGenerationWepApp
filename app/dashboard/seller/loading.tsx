"use client";
import React from "react";
import { Box, CircularProgress, keyframes } from "@mui/material";
import Image from "next/image";
import CompanyLogo from "../../../public/BRIXCOT.png";

const pulse = keyframes`
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.9; }
  100% { transform: scale(1); opacity: 1; }
`;

export default function SellerDashboardLoading() {
  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255, 255, 255, 0.8)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        zIndex: 9999,
      }}
    >
      <Box
        sx={{
          position: "relative",
          width: 200,
          height: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress
          thickness={3}
          size={200}
          sx={{
            color: "primary.main",
            position: "absolute",
            animationDuration: "1.5s",
          }}
        />
        <Box
          sx={{
            animation: `${pulse} 2.5s infinite ease-in-out`,
            width: 120,
            height: 120,
            position: "relative",
            filter: "drop-shadow(0 0 8px rgba(0, 0, 0, 0.1))",
          }}
        >
          <Image
            src={CompanyLogo}
            alt="BRIXCOT"
            fill
            priority
            style={{
              objectFit: "contain",
              objectPosition: "center",
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}
