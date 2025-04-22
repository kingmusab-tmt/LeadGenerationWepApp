import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Checkbox,
  IconButton,
  Menu,
  MenuItem,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { TrackingNumber } from "@/types/trackingNumbers";
import { useEffect, useState } from "react";

interface TrackingNumbersTableProps {
  numbers: TrackingNumber[];
  onRemoveNumber: (phoneNumber: string) => void;
  onEditNumber: (number: TrackingNumber) => void; // Callback for editing a number
}

export default function TrackingNumbersTable({
  numbers,
  onRemoveNumber,
  onEditNumber,
}: TrackingNumbersTableProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedNumber, setSelectedNumber] = useState<TrackingNumber | null>(
    null
  );

  // Handle opening the three-dot menu
  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    number: TrackingNumber
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedNumber(number);
  };

  // Handle closing the three-dot menu
  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedNumber(null);
  };

  // Handle the "Edit" action
  const handleEdit = () => {
    console.log(
      `selected number in side tranking number talbe ${selectedNumber}`
    );
    if (selectedNumber) {
      onEditNumber(selectedNumber); // Pass the selected number to the parent component
      handleMenuClose();
    }
  };

  // Handle the "Remove" action
  const handleRemove = () => {
    if (selectedNumber) {
      onRemoveNumber(selectedNumber.phoneNumber); // Pass the phone number to the parent component
      handleMenuClose();
    }
  };

  //   useEffect(() => {
  //     fetchUpdatedNumbers();
  //   }, [numbers]);

  return (
    <>
      <Typography variant="h6" sx={{ mt: 2 }}>
        Your Tracking Numbers
      </Typography>
      {numbers.length === 0 ? (
        <Typography variant="body1" sx={{ mt: 2 }}>
          No tracking numbers available.
        </Typography>
      ) : (
        <Table sx={{ overflowX: "auto" }}>
          <TableHead>
            <TableRow>
              <TableCell>Phone Number</TableCell>
              <TableCell>Industry/Niche</TableCell>
              <TableCell>Response</TableCell>
              <TableCell>Record</TableCell>
              <TableCell>Reconnect</TableCell>
              <TableCell>Call ID</TableCell>
              <TableCell>Call Whisper</TableCell>
              <TableCell>Message</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {numbers.map((num) => (
              <TableRow key={num.phoneNumber}>
                <TableCell>{num.phoneNumber}</TableCell>
                <TableCell>{num.industry}</TableCell>
                <TableCell>
                  <Checkbox checked={num.requireResponse} disabled />
                </TableCell>
                <TableCell>
                  <Checkbox checked={num.recordCall} disabled />
                </TableCell>
                <TableCell>
                  <Checkbox checked={num.reconnectCaller} disabled />
                </TableCell>
                <TableCell>
                  <Checkbox checked={num.passCallerId} disabled />
                </TableCell>
                <TableCell>
                  <Checkbox checked={!!num.callWhisper} disabled />
                </TableCell>
                <TableCell>
                  <Checkbox checked={!!num.welcomeMessage} disabled />
                </TableCell>
                <TableCell>
                  <IconButton
                    onClick={(e) => handleMenuOpen(e, num)}
                    aria-label="actions"
                  >
                    <MoreVertIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Three-dot menu for actions */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>Edit</MenuItem>
        <MenuItem onClick={handleRemove}>Remove</MenuItem>
      </Menu>
    </>
  );
}
