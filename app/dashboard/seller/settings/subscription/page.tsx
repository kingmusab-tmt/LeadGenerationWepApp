"use client";

import React, { useState } from "react";
import { Box, Container, Paper, Tabs, Tab } from "@mui/material";
import SubscriptionManagement from "./SubscriptionManagement";
import PaymentMethodsManager from "./PaymentMethodsManager";
import ChangePlanModal from "./ChangePlanModal";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function SubscriptionSettingsPage() {
  const [tabValue, setTabValue] = useState(0);
  const [changePlanModalOpen, setChangePlanModalOpen] = useState(false);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          <Tab label="Overview" />
          <Tab label="Payment Methods" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <SubscriptionManagement
            onOpenChangePlanModal={() => setChangePlanModalOpen(true)}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <PaymentMethodsManager />
        </TabPanel>
      </Paper>

      <ChangePlanModal
        open={changePlanModalOpen}
        onClose={() => setChangePlanModalOpen(false)}
        onSuccess={() => {
          setChangePlanModalOpen(false);
          setTabValue(0); // Go back to Overview tab
        }}
      />
    </Container>
  );
}
