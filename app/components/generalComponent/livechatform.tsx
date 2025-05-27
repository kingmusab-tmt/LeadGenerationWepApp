import { useState } from "react";
import { Box, Typography, Button, Modal } from "@mui/material";
import { SupportAgent } from "@mui/icons-material";
import TawkChatWidget from "./livechat";

const LiveChatForm = () => {
  const [open, setOpen] = useState(false);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  return (
    <>
      <Box sx={{ mt: 2 }}>
        <Typography variant="body1" gutterBottom>
          Our support team is ready to help you via live chat.
        </Typography>
        <Button
          variant="contained"
          fullWidth
          sx={{ mt: 2 }}
          startIcon={<SupportAgent />}
          onClick={handleOpen}
        >
          Start Live Chat
        </Button>
      </Box>

      <Modal open={open} onClose={handleClose}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            bgcolor: "background.paper",
            p: 4,
            borderRadius: 2,
            boxShadow: 24,
            minWidth: 300,
          }}
        >
          <TawkChatWidget open={open} propertyId={""} widgetId={""} />
        </Box>
      </Modal>
    </>
  );
};

export default LiveChatForm;
