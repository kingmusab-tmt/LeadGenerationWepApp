import { useState, useEffect } from "react";
import {
  Select,
  MenuItem,
  TextField,
  Switch,
  Typography,
  Button,
  FormControlLabel,
  FormControl,
  InputLabel,
  Box,
  IconButton,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { TrackingNumber } from "@/types/trackingNumbers";

interface CallMethodFormProps {
  numbers: TrackingNumber[];
  initialValues?: TrackingNumber | null;
  sellerId: string;
  onUpdateForwarding: (payload: {
    sellerId: string;
    phoneNumber: string;
    forwardingType: string;
    welcomeMessage: string;
    callWhisper: string;
    requireResponse: boolean;
    buyerResponses?: { message: string; digit: string }[];
    leadResponses?: { message: string; digit: string }[];
    recordCall: boolean;
    reconnectCaller: boolean;
    passCallerId: boolean;
    leadSource: string;
    forwardingNumbers?: string[];
    leadBuyers?: { id: string; name: string }[];
  }) => Promise<void>;
}

export default function CallMethodForm({
  numbers,
  sellerId,
  initialValues,
  onUpdateForwarding,
}: CallMethodFormProps) {
  const [selectedNumber, setSelectedNumber] = useState(
    initialValues?.phoneNumber || ""
  );
  const [forwardingType, setForwardingType] = useState(
    initialValues?.forwardingType || "direct"
  );
  const [welcomeMessage, setWelcomeMessage] = useState(
    initialValues?.welcomeMessage || ""
  );
  const [callWhisper, setCallWhisper] = useState(
    initialValues?.callWhisper || ""
  );
  const [requireResponse, setRequireResponse] = useState(
    initialValues?.requireResponse || false
  );
  const [buyerResponses, setBuyerResponses] = useState<
    { message: string; digit: string }[]
  >(initialValues?.buyerResponses || []);
  const [leadResponses, setLeadResponses] = useState<
    { message: string; digit: string }[]
  >(initialValues?.leadResponses || []);
  const [recordCall, setRecordCall] = useState(
    initialValues?.recordCall || false
  );
  const [reconnectCaller, setReconnectCaller] = useState(
    initialValues?.reconnectCaller || false
  );
  const [passCallerId, setPassCallerId] = useState(
    initialValues?.passCallerId || false
  );
  const [leadSource, setLeadSource] = useState(initialValues?.leadSource || "");
  const [forwardingNumbers, setForwardingNumbers] = useState(
    initialValues?.forwardingNumbers || [""]
  );
  const [leadBuyers, setLeadBuyers] = useState<{ id: string; name: string }[]>(
    initialValues?.leadBuyers?.map((buyer) => ({
      id: buyer.id,
      name: buyer.name,
    })) || []
  );
  const [selectedLeadBuyers, setSelectedLeadBuyers] = useState<string[]>([]);

  useEffect(() => {
    if (initialValues) {
      setSelectedNumber(initialValues.phoneNumber || "");
      setForwardingType(initialValues.forwardingType || "direct");
      setWelcomeMessage(initialValues.welcomeMessage || "");
      setCallWhisper(initialValues.callWhisper || "");
      setRequireResponse(initialValues.requireResponse || false);
      setBuyerResponses(initialValues.buyerResponses || []);
      setLeadResponses(initialValues.leadResponses || []);
      setRecordCall(initialValues.recordCall || false);
      setReconnectCaller(initialValues.reconnectCaller || false);
      setPassCallerId(initialValues.passCallerId || false);
      setLeadSource(initialValues.leadSource || "");
      setForwardingNumbers(initialValues.forwardingNumbers || [""]);
      setLeadBuyers(initialValues.leadBuyers || []);
      setSelectedLeadBuyers(
        initialValues.leadBuyers?.map((buyer) => buyer.id) || []
      );
    }
  }, [initialValues]);

  useEffect(() => {
    if (forwardingType === "specific_lead") {
      fetch(`/api/call_twillo/get_lead_buyers?sellerId=${sellerId}`)
        .then((res) => res.json())
        .then((data: { id: string; name: string }[]) => setLeadBuyers(data))
        .catch(() => setLeadBuyers([]));
    }
  }, [forwardingType, sellerId]);

  const addForwardingNumber = () => {
    setForwardingNumbers([...forwardingNumbers, ""]);
  };

  const addBuyerResponse = () => {
    setBuyerResponses([...buyerResponses, { message: "", digit: "" }]);
  };

  const addLeadResponse = () => {
    setLeadResponses([...leadResponses, { message: "", digit: "" }]);
  };

  const removeBuyerResponse = (index: number) => {
    const updated = [...buyerResponses];
    updated.splice(index, 1);
    setBuyerResponses(updated);
  };

  const removeLeadResponse = (index: number) => {
    const updated = [...leadResponses];
    updated.splice(index, 1);
    setLeadResponses(updated);
  };

  const handleUpdateForwarding = async () => {
    const payload = {
      sellerId,
      phoneNumber: selectedNumber,
      forwardingType,
      welcomeMessage,
      callWhisper,
      requireResponse,
      buyerResponses: requireResponse ? buyerResponses : undefined,
      leadResponses: requireResponse ? leadResponses : undefined,
      recordCall,
      reconnectCaller,
      passCallerId,
      leadSource,
      forwardingNumbers:
        forwardingType === "single_multiple" ? forwardingNumbers : undefined,
      leadBuyers:
        forwardingType === "specific_lead"
          ? leadBuyers.filter((buyer) => selectedLeadBuyers.includes(buyer.id))
          : undefined,
    };

    await onUpdateForwarding(payload);
    setSelectedNumber("");
    setForwardingType("direct");
    setWelcomeMessage("");
    setCallWhisper("");
    setRequireResponse(false);
    setBuyerResponses([]);
    setLeadResponses([]);
    setRecordCall(false);
    setReconnectCaller(false);
    setPassCallerId(false);
    setLeadSource("");
    setForwardingNumbers([""]);
    setLeadBuyers([]);
    setSelectedLeadBuyers([]);
  };

  return (
    <div>
      <Typography variant="h6">Set Call Forwarding Method</Typography>

      {/* Phone Number Selection */}
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Select a Phone Number</InputLabel>
        <Select
          value={selectedNumber}
          onChange={(e) => setSelectedNumber(e.target.value as string)}
          label="Select a Phone Number"
        >
          {numbers.map((num) => (
            <MenuItem key={num.phoneNumber} value={num.phoneNumber}>
              {num.phoneNumber}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Forwarding Type Selection */}
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Forwarding Type</InputLabel>
        <Select
          value={forwardingType}
          onChange={(e) => setForwardingType(e.target.value as string)}
          label="Forwarding Type"
        >
          <MenuItem value="direct">Direct to Matching Lead Buyer</MenuItem>
          <MenuItem value="single_multiple">
            Direct to Single or Multiple Numbers
          </MenuItem>
          <MenuItem value="specific_lead">
            Direct to Specific Lead Buyers
          </MenuItem>
        </Select>
      </FormControl>

      {/* Forwarding Numbers (for "single_multiple" type) */}
      {forwardingType === "single_multiple" && (
        <div>
          {forwardingNumbers.map((num, index) => (
            <TextField
              key={index}
              fullWidth
              label="Forwarding Number"
              value={num}
              onChange={(e) => {
                const newNumbers = [...forwardingNumbers];
                newNumbers[index] = e.target.value;
                setForwardingNumbers(newNumbers);
              }}
              sx={{ mb: 2 }}
            />
          ))}
          <Button onClick={addForwardingNumber} sx={{ mb: 2 }}>
            Add Number
          </Button>
        </div>
      )}

      {/* Lead Buyers Selection (for "specific_lead" type) */}
      {forwardingType === "specific_lead" && (
        <Select
          fullWidth
          multiple
          value={selectedLeadBuyers}
          onChange={(e) => {
            const selectedIds = e.target.value as string[];
            setSelectedLeadBuyers(selectedIds);
          }}
        >
          {leadBuyers.map((buyer) => (
            <MenuItem key={buyer.id} value={buyer.id}>
              {buyer.name}
            </MenuItem>
          ))}
        </Select>
      )}

      {/* Welcome Message */}
      <TextField
        fullWidth
        label="Welcome Message"
        value={welcomeMessage}
        onChange={(e) => setWelcomeMessage(e.target.value)}
        sx={{ mb: 2 }}
      />

      {/* Call Whisper */}
      <TextField
        fullWidth
        label="Call Whisper"
        value={callWhisper}
        onChange={(e) => setCallWhisper(e.target.value)}
        sx={{ mb: 2 }}
      />

      {/* Require Response Toggle */}
      <FormControlLabel
        control={
          <Switch
            checked={requireResponse}
            onChange={() => setRequireResponse(!requireResponse)}
          />
        }
        label="Require Response?"
        sx={{ mb: 2 }}
      />

      {/* Buyer Responses (shown when requireResponse is true) */}
      {requireResponse && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Buyer Response Options
          </Typography>
          <Button onClick={addBuyerResponse} variant="outlined" sx={{ mb: 2 }}>
            Add Message for Buyer
          </Button>

          {buyerResponses.map((response, index) => (
            <Box
              key={index}
              sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}
            >
              <TextField
                fullWidth
                label="Message for Buyer"
                value={response.message}
                onChange={(e) => {
                  const updated = [...buyerResponses];
                  updated[index].message = e.target.value;
                  setBuyerResponses(updated);
                }}
              />
              <TextField
                label="Digit to Press"
                value={response.digit}
                onChange={(e) => {
                  const updated = [...buyerResponses];
                  updated[index].digit = e.target.value;
                  setBuyerResponses(updated);
                }}
                inputProps={{ maxLength: 1 }}
                sx={{ width: 100 }}
              />
              <IconButton onClick={() => removeBuyerResponse(index)}>
                <DeleteIcon />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}

      {/* Lead Responses (shown when requireResponse is true) */}
      {requireResponse && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Lead Response Options
          </Typography>
          <Button onClick={addLeadResponse} variant="outlined" sx={{ mb: 2 }}>
            Add Message for Lead
          </Button>

          {leadResponses.map((response, index) => (
            <Box
              key={index}
              sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}
            >
              <TextField
                fullWidth
                label="Message for Lead"
                value={response.message}
                onChange={(e) => {
                  const updated = [...leadResponses];
                  updated[index].message = e.target.value;
                  setLeadResponses(updated);
                }}
              />
              <TextField
                label="Digit to Press"
                value={response.digit}
                onChange={(e) => {
                  const updated = [...leadResponses];
                  updated[index].digit = e.target.value;
                  setLeadResponses(updated);
                }}
                inputProps={{ maxLength: 1 }}
                sx={{ width: 100 }}
              />
              <IconButton onClick={() => removeLeadResponse(index)}>
                <DeleteIcon />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}

      {/* Record Call Toggle */}
      <FormControlLabel
        control={
          <Switch
            checked={recordCall}
            onChange={() => setRecordCall(!recordCall)}
          />
        }
        label="Record Call?"
        sx={{ mb: 2 }}
      />

      {/* Reconnect Caller Toggle */}
      <FormControlLabel
        control={
          <Switch
            checked={reconnectCaller}
            onChange={() => setReconnectCaller(!reconnectCaller)}
          />
        }
        label="Reconnect Caller Automatically?"
        sx={{ mb: 2 }}
      />

      {/* Pass Caller ID Toggle */}
      <FormControlLabel
        control={
          <Switch
            checked={passCallerId}
            onChange={() => setPassCallerId(!passCallerId)}
          />
        }
        label="Pass Caller ID to Recipient?"
        sx={{ mb: 2 }}
      />

      {/* Lead Source Dropdown */}
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Lead Source</InputLabel>
        <Select
          value={leadSource}
          onChange={(e) => setLeadSource(e.target.value as string)}
          label="Lead Source"
        >
          <MenuItem value="website">Website</MenuItem>
          <MenuItem value="advertisement">Advertisement</MenuItem>
          <MenuItem value="referral">Referral</MenuItem>
          <MenuItem value="social_media">Social Media</MenuItem>
          <MenuItem value="other">Other</MenuItem>
        </Select>
      </FormControl>

      {/* Save Settings Button */}
      <Button
        onClick={handleUpdateForwarding}
        variant="contained"
        sx={{ mt: 2 }}
      >
        Save Settings
      </Button>
    </div>
  );
}
