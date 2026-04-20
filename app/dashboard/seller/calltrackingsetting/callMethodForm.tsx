import { useState, useEffect, useMemo } from "react";
import { useSubscriptionLimits } from "@/app/hooks/useSubscriptionLimits";
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
  Alert,
  Chip,
  Divider,
  Card,
  CardContent,
  Tooltip,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import PhoneIcon from "@mui/icons-material/Phone";
import PreviewIcon from "@mui/icons-material/Preview";
import ScheduleIcon from "@mui/icons-material/Schedule";
import GroupIcon from "@mui/icons-material/Group";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SecurityIcon from "@mui/icons-material/Security";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import AddIcon from "@mui/icons-material/Add";
import { LEAD_SOURCES } from "@/utils/leadSources";
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
    overflowNumber?: string;
    forwardingNumbers?: string[];
    leadBuyers?: { id: string; name: string }[];
    // New feature flags
    recordingConsent?: boolean;
    recordingConsentMessage?: string;
    missedCallTextBack?: boolean;
    missedCallTextMessage?: string;
    dncEnabled?: boolean;
    dncList?: string[];
    spamFilterEnabled?: boolean;
    spamFilterAction?: string;
    scheduledCallbackEnabled?: boolean;
    scheduledCallbackDigit?: string;
    multiRingEnabled?: boolean;
    geoRoutingEnabled?: boolean;
    concurrentCallLimit?: number;
    transcriptionEnabled?: boolean;
    aiSummaryEnabled?: boolean;
  }) => Promise<void>;
}

// Validation helpers
function validatePhoneNumber(num: string): string | null {
  if (!num) return "Phone number is required";
  const cleaned = num.replace(/[\s\-\(\)]/g, "");
  if (!/^\+?[1-9]\d{6,14}$/.test(cleaned)) return "Invalid phone number format";
  return null;
}

function validateDigit(digit: string): string | null {
  if (!digit) return "Digit is required";
  if (!/^[0-9*#]$/.test(digit)) return "Must be a single digit (0-9, *, #)";
  return null;
}

export default function CallMethodForm({
  numbers,
  sellerId,
  initialValues,
  onUpdateForwarding,
}: CallMethodFormProps) {
  const safeNumbers = Array.isArray(numbers) ? numbers : [];

  const { limits } = useSubscriptionLimits();
  const [selectedNumber, setSelectedNumber] = useState(
    initialValues?.phoneNumber || "",
  );
  const [forwardingType, setForwardingType] = useState(
    initialValues?.forwardingType || "direct",
  );
  const [welcomeMessage, setWelcomeMessage] = useState(
    initialValues?.welcomeMessage || "",
  );
  const [callWhisper, setCallWhisper] = useState(
    initialValues?.callWhisper || "",
  );
  const [requireResponse, setRequireResponse] = useState(
    initialValues?.requireResponse || false,
  );
  const [buyerResponses, setBuyerResponses] = useState<
    { message: string; digit: string }[]
  >(initialValues?.buyerResponses || []);
  const [leadResponses, setLeadResponses] = useState<
    { message: string; digit: string }[]
  >(initialValues?.leadResponses || []);
  const [recordCall, setRecordCall] = useState(
    initialValues?.recordCall || false,
  );
  const [reconnectCaller, setReconnectCaller] = useState(
    initialValues?.reconnectCaller || false,
  );
  const [passCallerId, setPassCallerId] = useState(
    initialValues?.passCallerId || false,
  );
  const [leadSource, setLeadSource] = useState(initialValues?.leadSource || "");
  const [overflowNumber, setOverflowNumber] = useState(
    initialValues?.overflowNumber || "",
  );

  // New feature states
  const [recordingConsent, setRecordingConsent] = useState(
    initialValues?.recordingConsent || false,
  );
  const [recordingConsentMessage, setRecordingConsentMessage] = useState(
    initialValues?.recordingConsentMessage ||
      "This call may be recorded for quality assurance purposes.",
  );
  const [missedCallTextBack, setMissedCallTextBack] = useState(
    initialValues?.missedCallTextBack || false,
  );
  const [missedCallTextMessage, setMissedCallTextMessage] = useState(
    initialValues?.missedCallTextMessage ||
      "We missed your call! We will get back to you shortly.",
  );
  const [dncEnabled, setDncEnabled] = useState(
    initialValues?.dncEnabled || false,
  );
  const [dncList, setDncList] = useState<string[]>(
    initialValues?.dncList || [],
  );
  const [newDncNumber, setNewDncNumber] = useState("");
  const [spamFilterEnabled, setSpamFilterEnabled] = useState(
    initialValues?.spamFilterEnabled || false,
  );
  const [spamFilterAction, setSpamFilterAction] = useState(
    initialValues?.spamFilterAction || "block",
  );
  const [scheduledCallbackEnabled, setScheduledCallbackEnabled] = useState(
    initialValues?.scheduledCallbackEnabled || false,
  );
  const [scheduledCallbackDigit, setScheduledCallbackDigit] = useState(
    initialValues?.scheduledCallbackDigit || "1",
  );
  const [multiRingEnabled, setMultiRingEnabled] = useState(
    initialValues?.multiRingEnabled || false,
  );
  const [geoRoutingEnabled, setGeoRoutingEnabled] = useState(
    initialValues?.geoRoutingEnabled || false,
  );
  const [concurrentCallLimit, setConcurrentCallLimit] = useState(
    initialValues?.concurrentCallLimit || 0,
  );
  const [transcriptionEnabled, setTranscriptionEnabled] = useState(
    initialValues?.transcriptionEnabled || false,
  );
  const [aiSummaryEnabled, setAiSummaryEnabled] = useState(
    initialValues?.aiSummaryEnabled || false,
  );
  const [forwardingNumbers, setForwardingNumbers] = useState(
    initialValues?.forwardingNumbers || [""],
  );
  const [leadBuyers, setLeadBuyers] = useState<{ id: string; name: string }[]>(
    initialValues?.leadBuyers?.map((buyer) => ({
      id: buyer.id,
      name: buyer.name,
    })) || [],
  );
  const [selectedLeadBuyers, setSelectedLeadBuyers] = useState<string[]>([]);

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Working hours state
  const [enableWorkingHours, setEnableWorkingHours] = useState(false);
  const [workingHoursStart, setWorkingHoursStart] = useState("09:00");
  const [workingHoursEnd, setWorkingHoursEnd] = useState("17:00");

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
      setOverflowNumber(initialValues.overflowNumber || "");
      setForwardingNumbers(initialValues.forwardingNumbers || [""]);
      setLeadBuyers(initialValues.leadBuyers || []);
      setSelectedLeadBuyers(
        initialValues.leadBuyers?.map((buyer) => buyer.id) || [],
      );
      // New feature states
      setRecordingConsent(initialValues.recordingConsent || false);
      setRecordingConsentMessage(
        initialValues.recordingConsentMessage ||
          "This call may be recorded for quality assurance purposes.",
      );
      setMissedCallTextBack(initialValues.missedCallTextBack || false);
      setMissedCallTextMessage(
        initialValues.missedCallTextMessage ||
          "We missed your call! We will get back to you shortly.",
      );
      setDncEnabled(initialValues.dncEnabled || false);
      setDncList(initialValues.dncList || []);
      setSpamFilterEnabled(initialValues.spamFilterEnabled || false);
      setSpamFilterAction(initialValues.spamFilterAction || "block");
      setScheduledCallbackEnabled(
        initialValues.scheduledCallbackEnabled || false,
      );
      setScheduledCallbackDigit(initialValues.scheduledCallbackDigit || "1");
      setMultiRingEnabled(initialValues.multiRingEnabled || false);
      setGeoRoutingEnabled(initialValues.geoRoutingEnabled || false);
      setConcurrentCallLimit(initialValues.concurrentCallLimit || 0);
      setTranscriptionEnabled(initialValues.transcriptionEnabled || false);
      setAiSummaryEnabled(initialValues.aiSummaryEnabled || false);
      setErrors({});
    }
  }, [initialValues]);

  useEffect(() => {
    if (forwardingType === "specific_lead") {
      fetch(`/api/calls/twilio/get_lead_buyers?sellerId=${sellerId}`)
        .then((res) => res.json())
        .then((data: { id: string; name: string }[]) => setLeadBuyers(data))
        .catch(() => setLeadBuyers([]));
    }
  }, [forwardingType, sellerId]);

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedNumber)
      newErrors.selectedNumber = "Please select a phone number";

    if (forwardingType === "single_multiple") {
      forwardingNumbers.forEach((num, i) => {
        const err = validatePhoneNumber(num);
        if (err) newErrors[`fwdNum_${i}`] = err;
      });
      if (forwardingNumbers.filter((n) => n.trim()).length === 0) {
        newErrors.forwardingNumbers =
          "At least one forwarding number is required";
      }
    }

    if (forwardingType === "specific_lead" && selectedLeadBuyers.length === 0) {
      newErrors.leadBuyers = "Please select at least one lead buyer";
    }

    if (requireResponse) {
      buyerResponses.forEach((r, i) => {
        if (!r.message.trim())
          newErrors[`buyerMsg_${i}`] = "Message is required";
        const dErr = validateDigit(r.digit);
        if (dErr) newErrors[`buyerDigit_${i}`] = dErr;
      });
      leadResponses.forEach((r, i) => {
        if (!r.message.trim())
          newErrors[`leadMsg_${i}`] = "Message is required";
        const dErr = validateDigit(r.digit);
        if (dErr) newErrors[`leadDigit_${i}`] = dErr;
      });

      // Check duplicate digits
      const allDigits = [
        ...buyerResponses.map((r) => r.digit),
        ...leadResponses.map((r) => r.digit),
      ].filter(Boolean);
      const uniqueDigits = new Set(allDigits);
      if (uniqueDigits.size !== allDigits.length) {
        newErrors.duplicateDigits = "Response digits must be unique";
      }
    }

    if (enableWorkingHours && workingHoursStart >= workingHoursEnd) {
      newErrors.workingHours = "Start time must be before end time";
    }

    // Validate overflow number format if provided
    if (overflowNumber.trim()) {
      const overflowErr = validatePhoneNumber(overflowNumber);
      if (overflowErr) newErrors.overflowNumber = overflowErr;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const addForwardingNumber = () =>
    setForwardingNumbers([...forwardingNumbers, ""]);
  const addBuyerResponse = () =>
    setBuyerResponses([...buyerResponses, { message: "", digit: "" }]);
  const addLeadResponse = () =>
    setLeadResponses([...leadResponses, { message: "", digit: "" }]);
  const removeBuyerResponse = (index: number) => {
    setBuyerResponses((prev) => prev.filter((_, i) => i !== index));
  };
  const removeLeadResponse = (index: number) => {
    setLeadResponses((prev) => prev.filter((_, i) => i !== index));
  };
  const removeForwardingNumber = (index: number) => {
    setForwardingNumbers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateForwarding = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
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
        overflowNumber: overflowNumber.trim() || undefined,
        // Working hours
        enableWorkingHours,
        workingHoursStart: enableWorkingHours ? workingHoursStart : undefined,
        workingHoursEnd: enableWorkingHours ? workingHoursEnd : undefined,
        forwardingNumbers:
          forwardingType === "single_multiple" ? forwardingNumbers : undefined,
        leadBuyers:
          forwardingType === "specific_lead"
            ? leadBuyers.filter((buyer) =>
                selectedLeadBuyers.includes(buyer.id),
              )
            : undefined,
        // New feature flags
        recordingConsent,
        recordingConsentMessage,
        missedCallTextBack,
        missedCallTextMessage,
        dncEnabled,
        dncList,
        spamFilterEnabled,
        spamFilterAction,
        scheduledCallbackEnabled,
        scheduledCallbackDigit,
        multiRingEnabled,
        geoRoutingEnabled,
        concurrentCallLimit,
        transcriptionEnabled,
        aiSummaryEnabled,
      };

      await onUpdateForwarding(payload);

      // Reset form
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
      setOverflowNumber("");
      setForwardingNumbers([""]);
      setLeadBuyers([]);
      setSelectedLeadBuyers([]);
      setErrors({});
      setShowPreview(false);
    } finally {
      setSaving(false);
    }
  };

  // Build preview of call flow
  const previewSteps = useMemo(() => {
    const steps: string[] = [];
    steps.push(`1. Incoming call to ${selectedNumber || "[select number]"}`);
    if (welcomeMessage) steps.push(`2. Play welcome: "${welcomeMessage}"`);
    if (requireResponse && leadResponses.length > 0) {
      steps.push(
        `${steps.length + 1}. Lead IVR: ${leadResponses.map((r) => `Press ${r.digit} - ${r.message}`).join(", ")}`,
      );
    }
    if (forwardingType === "direct") {
      steps.push(
        `${steps.length + 1}. Route to next available buyer (round-robin)`,
      );
    } else if (forwardingType === "single_multiple") {
      steps.push(
        `${steps.length + 1}. Forward to: ${forwardingNumbers.filter((n) => n).join(", ") || "[none]"}`,
      );
    } else if (forwardingType === "specific_lead") {
      const selected = leadBuyers.filter((b) =>
        selectedLeadBuyers.includes(b.id),
      );
      steps.push(
        `${steps.length + 1}. Route to: ${selected.map((b) => b.name).join(", ") || "[none selected]"}`,
      );
    }
    if (callWhisper)
      steps.push(`${steps.length + 1}. Whisper to buyer: "${callWhisper}"`);
    if (requireResponse && buyerResponses.length > 0) {
      steps.push(
        `${steps.length + 1}. Buyer IVR: ${buyerResponses.map((r) => `Press ${r.digit} - ${r.message}`).join(", ")}`,
      );
    }
    if (recordCall) steps.push(`${steps.length + 1}. Call will be recorded`);
    if (reconnectCaller)
      steps.push(`${steps.length + 1}. Auto-reconnect on no-answer`);
    if (overflowNumber)
      steps.push(
        `${steps.length + 1}. Overflow to ${overflowNumber} if no buyers available`,
      );
    steps.push(`${steps.length + 1}. Voicemail if unanswered`);
    return steps;
  }, [
    selectedNumber,
    welcomeMessage,
    callWhisper,
    requireResponse,
    buyerResponses,
    leadResponses,
    forwardingType,
    forwardingNumbers,
    selectedLeadBuyers,
    leadBuyers,
    recordCall,
    reconnectCaller,
    overflowNumber,
  ]);

  // Count assigned buyers for preview
  const assignedBuyerCount = useMemo(() => {
    if (forwardingType === "specific_lead") return selectedLeadBuyers.length;
    if (forwardingType === "direct") return "auto (round-robin)";
    return forwardingNumbers.filter((n) => n.trim()).length;
  }, [forwardingType, selectedLeadBuyers, forwardingNumbers]);

  return (
    <div>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <Typography variant="h6">Set Call Forwarding Method</Typography>
        <Tooltip title="Preview call flow">
          <IconButton
            color={showPreview ? "primary" : "default"}
            onClick={() => setShowPreview(!showPreview)}
          >
            <PreviewIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Call Flow Preview */}
      {showPreview && (
        <Card
          variant="outlined"
          sx={{ mb: 3, bgcolor: "action.hover", borderRadius: 2 }}
        >
          <CardContent>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              Call Flow Preview
            </Typography>
            {previewSteps.map((step, i) => (
              <Typography key={i} variant="body2" sx={{ mb: 0.5 }}>
                {step}
              </Typography>
            ))}
            <Divider sx={{ my: 1.5 }} />
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Chip
                size="small"
                icon={<GroupIcon />}
                label={`Buyers: ${assignedBuyerCount}`}
              />
              {recordCall && (
                <Chip size="small" label="Recording: On" color="info" />
              )}
              {passCallerId && <Chip size="small" label="Caller ID: Passed" />}
              {enableWorkingHours && (
                <Chip
                  size="small"
                  icon={<ScheduleIcon />}
                  label={`Hours: ${workingHoursStart}–${workingHoursEnd}`}
                />
              )}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Global validation errors */}
      {errors.duplicateDigits && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errors.duplicateDigits}
        </Alert>
      )}

      {/* Phone Number Selection */}
      <FormControl fullWidth sx={{ mb: 2 }} error={!!errors.selectedNumber}>
        <InputLabel>Select a Phone Number</InputLabel>
        <Select
          value={selectedNumber}
          onChange={(e) => {
            setSelectedNumber(e.target.value as string);
            setErrors((prev) => ({ ...prev, selectedNumber: "" }));
          }}
          label="Select a Phone Number"
        >
          {safeNumbers.map((num) => (
            <MenuItem key={num.phoneNumber} value={num.phoneNumber}>
              {num.phoneNumber} — {num.industry || "No industry"}
            </MenuItem>
          ))}
        </Select>
        {errors.selectedNumber && (
          <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
            {errors.selectedNumber}
          </Typography>
        )}
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

      {/* Forwarding Numbers */}
      {forwardingType === "single_multiple" && (
        <Box sx={{ mb: 2 }}>
          {errors.forwardingNumbers && (
            <Alert severity="error" sx={{ mb: 1 }}>
              {errors.forwardingNumbers}
            </Alert>
          )}
          {forwardingNumbers.map((num, index) => (
            <Box
              key={index}
              sx={{ display: "flex", gap: 1, mb: 1, alignItems: "flex-start" }}
            >
              <TextField
                fullWidth
                label={`Forwarding Number ${index + 1}`}
                value={num}
                onChange={(e) => {
                  const newNumbers = [...forwardingNumbers];
                  newNumbers[index] = e.target.value;
                  setForwardingNumbers(newNumbers);
                  setErrors((prev) => ({ ...prev, [`fwdNum_${index}`]: "" }));
                }}
                error={!!errors[`fwdNum_${index}`]}
                helperText={errors[`fwdNum_${index}`]}
                placeholder="+1234567890"
                size="small"
              />
              {forwardingNumbers.length > 1 && (
                <IconButton
                  onClick={() => removeForwardingNumber(index)}
                  color="error"
                  size="small"
                  sx={{ mt: 0.5 }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          ))}
          <Button onClick={addForwardingNumber} size="small">
            + Add Number
          </Button>
        </Box>
      )}

      {/* Lead Buyers Selection */}
      {forwardingType === "specific_lead" && (
        <Box sx={{ mb: 2 }}>
          <FormControl fullWidth error={!!errors.leadBuyers}>
            <InputLabel>Select Lead Buyers</InputLabel>
            <Select
              multiple
              value={selectedLeadBuyers}
              onChange={(e) => {
                const selectedIds = e.target.value as string[];
                setSelectedLeadBuyers(selectedIds);
                setErrors((prev) => ({ ...prev, leadBuyers: "" }));
              }}
              label="Select Lead Buyers"
              renderValue={(selected) => (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {(selected as string[]).map((id) => {
                    const buyer = leadBuyers.find((b) => b.id === id);
                    return (
                      <Chip key={id} label={buyer?.name || id} size="small" />
                    );
                  })}
                </Box>
              )}
            >
              {leadBuyers.map((buyer) => (
                <MenuItem key={buyer.id} value={buyer.id}>
                  {buyer.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {errors.leadBuyers && (
            <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
              {errors.leadBuyers}
            </Typography>
          )}
          {/* Buyer assignment preview */}
          {selectedLeadBuyers.length > 0 && (
            <Box
              sx={{ mt: 1, p: 1.5, borderRadius: 1, bgcolor: "action.hover" }}
            >
              <Typography variant="caption" fontWeight={600} gutterBottom>
                Selected Buyers ({selectedLeadBuyers.length}):
              </Typography>
              <Box
                sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 0.5 }}
              >
                {leadBuyers
                  .filter((b) => selectedLeadBuyers.includes(b.id))
                  .map((b) => (
                    <Chip
                      key={b.id}
                      label={b.name}
                      size="small"
                      color="primary"
                      variant="outlined"
                      onDelete={() =>
                        setSelectedLeadBuyers((prev) =>
                          prev.filter((id) => id !== b.id),
                        )
                      }
                    />
                  ))}
              </Box>
            </Box>
          )}
        </Box>
      )}

      {/* Welcome Message */}
      <TextField
        fullWidth
        label="Welcome Message"
        value={welcomeMessage}
        onChange={(e) => setWelcomeMessage(e.target.value)}
        sx={{ mb: 2 }}
        multiline
        maxRows={3}
        helperText="Text-to-speech message played to the caller"
      />

      {/* Call Whisper */}
      <TextField
        fullWidth
        label="Call Whisper"
        value={callWhisper}
        onChange={(e) => setCallWhisper(e.target.value)}
        sx={{ mb: 2 }}
        helperText="Message whispered to the buyer before connecting"
      />

      {/* Require Response Toggle */}
      <Box sx={{ mb: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={requireResponse}
              onChange={() => setRequireResponse(!requireResponse)}
            />
          }
          label="Require Response?"
        />
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", ml: 4 }}
        >
          Plays a message to the buyer/lead requiring them to press a digit to
          accept the call, preventing voicemail pickups.
        </Typography>
      </Box>

      {/* Buyer Responses */}
      {requireResponse && (
        <Box sx={{ mb: 3, pl: 2, borderLeft: 3, borderColor: "primary.main" }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Buyer Response Options
          </Typography>
          <Button
            onClick={addBuyerResponse}
            variant="outlined"
            size="small"
            sx={{ mb: 2 }}
          >
            Add Message for Buyer
          </Button>

          {buyerResponses.map((response, index) => (
            <Box
              key={index}
              sx={{
                display: "flex",
                alignItems: "flex-start",
                gap: 1,
                mb: 1.5,
              }}
            >
              <TextField
                fullWidth
                size="small"
                label="Message for Buyer"
                value={response.message}
                onChange={(e) => {
                  const updated = [...buyerResponses];
                  updated[index].message = e.target.value;
                  setBuyerResponses(updated);
                }}
                error={!!errors[`buyerMsg_${index}`]}
                helperText={errors[`buyerMsg_${index}`]}
              />
              <TextField
                size="small"
                label="Digit"
                value={response.digit}
                onChange={(e) => {
                  const updated = [...buyerResponses];
                  updated[index].digit = e.target.value;
                  setBuyerResponses(updated);
                }}
                inputProps={{ maxLength: 1 }}
                sx={{ width: 80 }}
                error={!!errors[`buyerDigit_${index}`]}
                helperText={errors[`buyerDigit_${index}`]}
              />
              <IconButton
                onClick={() => removeBuyerResponse(index)}
                size="small"
                color="error"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}

      {/* Lead Responses */}
      {requireResponse && (
        <Box
          sx={{ mb: 3, pl: 2, borderLeft: 3, borderColor: "secondary.main" }}
        >
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Lead Response Options
          </Typography>
          <Button
            onClick={addLeadResponse}
            variant="outlined"
            size="small"
            sx={{ mb: 2 }}
          >
            Add Message for Lead
          </Button>

          {leadResponses.map((response, index) => (
            <Box
              key={index}
              sx={{
                display: "flex",
                alignItems: "flex-start",
                gap: 1,
                mb: 1.5,
              }}
            >
              <TextField
                fullWidth
                size="small"
                label="Message for Lead"
                value={response.message}
                onChange={(e) => {
                  const updated = [...leadResponses];
                  updated[index].message = e.target.value;
                  setLeadResponses(updated);
                }}
                error={!!errors[`leadMsg_${index}`]}
                helperText={errors[`leadMsg_${index}`]}
              />
              <TextField
                size="small"
                label="Digit"
                value={response.digit}
                onChange={(e) => {
                  const updated = [...leadResponses];
                  updated[index].digit = e.target.value;
                  setLeadResponses(updated);
                }}
                inputProps={{ maxLength: 1 }}
                sx={{ width: 80 }}
                error={!!errors[`leadDigit_${index}`]}
                helperText={errors[`leadDigit_${index}`]}
              />
              <IconButton
                onClick={() => removeLeadResponse(index)}
                size="small"
                color="error"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}

      <Divider sx={{ my: 2 }} />

      {/* Working Hours */}
      <Box sx={{ mb: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={enableWorkingHours}
              onChange={() => setEnableWorkingHours(!enableWorkingHours)}
            />
          }
          label="Enable Working Hours"
        />
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", ml: 4 }}
        >
          Restricts incoming calls to your specified time window. Calls outside
          these hours go to voicemail or overflow.
        </Typography>
        {enableWorkingHours && (
          <Box sx={{ display: "flex", gap: 2, mt: 1, pl: 2 }}>
            <TextField
              size="small"
              type="time"
              label="Start Time"
              value={workingHoursStart}
              onChange={(e) => setWorkingHoursStart(e.target.value)}
              InputLabelProps={{ shrink: true }}
              error={!!errors.workingHours}
            />
            <TextField
              size="small"
              type="time"
              label="End Time"
              value={workingHoursEnd}
              onChange={(e) => setWorkingHoursEnd(e.target.value)}
              InputLabelProps={{ shrink: true }}
              error={!!errors.workingHours}
            />
            {errors.workingHours && (
              <Typography
                variant="caption"
                color="error"
                sx={{ alignSelf: "center" }}
              >
                {errors.workingHours}
              </Typography>
            )}
          </Box>
        )}
      </Box>

      {/* Toggles */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 2 }}>
        {limits?.callRecording && (
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={recordCall}
                  onChange={() => setRecordCall(!recordCall)}
                />
              }
              label="Record Call"
            />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", ml: 4 }}
            >
              Records the call from the moment it is answered. Pair with
              Recording Consent to notify callers.
            </Typography>
          </Box>
        )}
        <Box>
          <FormControlLabel
            control={
              <Switch
                checked={reconnectCaller}
                onChange={() => setReconnectCaller(!reconnectCaller)}
              />
            }
            label="Auto-Reconnect"
          />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", ml: 4 }}
          >
            Automatically retries connecting the caller to another available
            buyer if the first attempt goes unanswered.
          </Typography>
        </Box>
        <Box>
          <FormControlLabel
            control={
              <Switch
                checked={passCallerId}
                onChange={() => setPassCallerId(!passCallerId)}
              />
            }
            label="Pass Caller ID"
          />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", ml: 4 }}
          >
            Forwards the original caller&apos;s phone number to the buyer
            instead of showing the tracking number.
          </Typography>
        </Box>
      </Box>

      {/* Lead Source */}
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Lead Source</InputLabel>
        <Select
          value={leadSource}
          onChange={(e) => setLeadSource(e.target.value as string)}
          label="Lead Source"
        >
          {LEAD_SOURCES.map((source) => (
            <MenuItem key={source.value} value={source.value}>
              {source.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Overflow Number */}
      <TextField
        fullWidth
        label="Overflow Number"
        value={overflowNumber}
        onChange={(e) => setOverflowNumber(e.target.value)}
        placeholder="+1234567890"
        helperText="If no buyers are available, try this number before going to voicemail (e.g., your phone or answering service)"
        error={!!errors.overflowNumber}
        sx={{ mb: 2 }}
      />

      <Divider sx={{ my: 3 }} />
      <Typography
        variant="h6"
        sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}
      >
        <SecurityIcon fontSize="small" /> Call Protection & Compliance
      </Typography>

      {/* Recording Consent */}
      {limits?.callRecording && (
        <Accordion disableGutters sx={{ mb: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <FormControlLabel
              onClick={(e) => e.stopPropagation()}
              control={
                <Switch
                  checked={recordingConsent}
                  onChange={() => setRecordingConsent(!recordingConsent)}
                />
              }
              label="Recording Consent Announcement"
            />
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Play a consent message before recording starts (required in many
              jurisdictions).
            </Typography>
            <TextField
              fullWidth
              size="small"
              label="Consent Message"
              value={recordingConsentMessage}
              onChange={(e) => setRecordingConsentMessage(e.target.value)}
              multiline
              rows={2}
              disabled={!recordingConsent}
            />
          </AccordionDetails>
        </Accordion>
      )}

      {/* Spam Filter */}
      <Accordion disableGutters sx={{ mb: 1 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <FormControlLabel
            onClick={(e) => e.stopPropagation()}
            control={
              <Switch
                checked={spamFilterEnabled}
                onChange={() => setSpamFilterEnabled(!spamFilterEnabled)}
              />
            }
            label="Spam / Robot Call Detection"
          />
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Uses STIR/SHAKEN verification to detect spam and robocalls.
          </Typography>
          <FormControl fullWidth size="small" disabled={!spamFilterEnabled}>
            <InputLabel>Action on Spam</InputLabel>
            <Select
              value={spamFilterAction}
              onChange={(e) =>
                setSpamFilterAction(e.target.value as "block" | "warn")
              }
              label="Action on Spam"
            >
              <MenuItem value="block">Block (reject the call)</MenuItem>
              <MenuItem value="warn">Warn (whisper warning to buyer)</MenuItem>
            </Select>
          </FormControl>
        </AccordionDetails>
      </Accordion>

      {/* DNC List */}
      <Accordion disableGutters sx={{ mb: 1 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <FormControlLabel
            onClick={(e) => e.stopPropagation()}
            control={
              <Switch
                checked={dncEnabled}
                onChange={() => setDncEnabled(!dncEnabled)}
              />
            }
            label="Do-Not-Call (DNC) List"
          />
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Automatically reject calls from numbers on your DNC list.
          </Typography>
          <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
            <TextField
              size="small"
              label="Add Phone Number"
              value={newDncNumber}
              onChange={(e) => setNewDncNumber(e.target.value)}
              placeholder="+1234567890"
              disabled={!dncEnabled}
              sx={{ flex: 1 }}
            />
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              disabled={!dncEnabled || !newDncNumber.trim()}
              onClick={() => {
                const cleaned = newDncNumber.replace(/[^+\d]/g, "").trim();
                if (cleaned.length >= 10 && !dncList.includes(cleaned)) {
                  setDncList([...dncList, cleaned]);
                  setNewDncNumber("");
                }
              }}
            >
              Add
            </Button>
          </Box>
          {dncList.length > 0 && (
            <List dense sx={{ maxHeight: 200, overflow: "auto" }}>
              {dncList.map((num, i) => (
                <ListItem key={i}>
                  <ListItemText primary={num} />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={() =>
                        setDncList(dncList.filter((_, j) => j !== i))
                      }
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
          <Typography variant="caption" color="text.secondary">
            {dncList.length} number{dncList.length !== 1 ? "s" : ""} on DNC list
          </Typography>
        </AccordionDetails>
      </Accordion>

      <Divider sx={{ my: 3 }} />
      <Typography
        variant="h6"
        sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}
      >
        <PhoneIcon fontSize="small" /> Call Routing & Fallback
      </Typography>

      {/* Missed Call Text-Back */}
      <Accordion disableGutters sx={{ mb: 1 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <FormControlLabel
            onClick={(e) => e.stopPropagation()}
            control={
              <Switch
                checked={missedCallTextBack}
                onChange={() => setMissedCallTextBack(!missedCallTextBack)}
              />
            }
            label="Missed Call Text-Back"
          />
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Automatically send an SMS to the caller when a call is missed.
          </Typography>
          <TextField
            fullWidth
            size="small"
            label="Text-Back Message"
            value={missedCallTextMessage}
            onChange={(e) => setMissedCallTextMessage(e.target.value)}
            multiline
            rows={2}
            disabled={!missedCallTextBack}
          />
        </AccordionDetails>
      </Accordion>

      {/* Scheduled Callbacks */}
      <Accordion disableGutters sx={{ mb: 1 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <FormControlLabel
            onClick={(e) => e.stopPropagation()}
            control={
              <Switch
                checked={scheduledCallbackEnabled}
                onChange={() =>
                  setScheduledCallbackEnabled(!scheduledCallbackEnabled)
                }
              />
            }
            label="Scheduled Callbacks"
          />
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            When no buyers are available, offer callers the option to request a
            callback via IVR.
          </Typography>
          <TextField
            size="small"
            label="Callback Request Digit"
            value={scheduledCallbackDigit}
            onChange={(e) => {
              if (/^[0-9*#]?$/.test(e.target.value)) {
                setScheduledCallbackDigit(e.target.value);
              }
            }}
            disabled={!scheduledCallbackEnabled}
            helperText={`Caller presses "${scheduledCallbackDigit}" to request a callback`}
            sx={{ width: 180 }}
          />
        </AccordionDetails>
      </Accordion>

      {/* Multi-Ring */}
      <Accordion disableGutters sx={{ mb: 1 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <FormControlLabel
            onClick={(e) => e.stopPropagation()}
            control={
              <Switch
                checked={multiRingEnabled}
                onChange={() => setMultiRingEnabled(!multiRingEnabled)}
              />
            }
            label="Multi-Ring (Simultaneous)"
          />
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary">
            Ring all eligible buyers at the same time instead of sequentially.
            The first buyer to answer gets the call.
          </Typography>
        </AccordionDetails>
      </Accordion>

      {/* Geo-Routing */}
      <Accordion disableGutters sx={{ mb: 1 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <FormControlLabel
            onClick={(e) => e.stopPropagation()}
            control={
              <Switch
                checked={geoRoutingEnabled}
                onChange={() => setGeoRoutingEnabled(!geoRoutingEnabled)}
              />
            }
            label="Geo-Routing"
          />
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary">
            Route calls to buyers based on the caller&apos;s area code and the
            buyer&apos;s configured service locations. Buyers without matching
            service areas will be skipped.
          </Typography>
        </AccordionDetails>
      </Accordion>

      {/* Concurrent Call Limit */}
      <Accordion disableGutters sx={{ mb: 1 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="body2" fontWeight={500}>
            Concurrent Call Limit
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Limit how many simultaneous calls a single buyer can handle. Set to
            0 for unlimited.
          </Typography>
          <TextField
            size="small"
            type="number"
            label="Max Concurrent Calls per Buyer"
            value={concurrentCallLimit}
            onChange={(e) =>
              setConcurrentCallLimit(Math.max(0, parseInt(e.target.value) || 0))
            }
            inputProps={{ min: 0, max: 100 }}
            sx={{ width: 260 }}
          />
        </AccordionDetails>
      </Accordion>

      {limits?.callAIAnalysis && (
        <>
          <Divider sx={{ my: 3 }} />
          <Typography
            variant="h6"
            sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}
          >
            <SmartToyIcon fontSize="small" /> AI & Analytics
          </Typography>

          {/* Transcription */}
          <Accordion disableGutters sx={{ mb: 1 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <FormControlLabel
                onClick={(e) => e.stopPropagation()}
                control={
                  <Switch
                    checked={transcriptionEnabled}
                    onChange={() =>
                      setTranscriptionEnabled(!transcriptionEnabled)
                    }
                  />
                }
                label="Call Transcription"
              />
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="text.secondary">
                Automatically transcribe recorded calls. Transcriptions appear
                in call details and can be used for AI analysis. Requires call
                recording to be enabled.
              </Typography>
              {transcriptionEnabled && !recordCall && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  Call recording must be enabled for transcription to work.
                </Alert>
              )}
            </AccordionDetails>
          </Accordion>

          {/* AI Summary */}
          <Accordion disableGutters sx={{ mb: 1 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <FormControlLabel
                onClick={(e) => e.stopPropagation()}
                control={
                  <Switch
                    checked={aiSummaryEnabled}
                    onChange={() => setAiSummaryEnabled(!aiSummaryEnabled)}
                  />
                }
                label="AI Call Summary & Lead Scoring"
              />
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="text.secondary">
                Uses Google AI to generate call summaries, sentiment analysis,
                and lead quality scores (A-D grading) from transcriptions.
                Requires transcription to be enabled.
              </Typography>
              {aiSummaryEnabled && !transcriptionEnabled && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  Call transcription must be enabled for AI analysis to work.
                </Alert>
              )}
            </AccordionDetails>
          </Accordion>
        </>
      )}

      {/* Save Button */}
      <Button
        onClick={handleUpdateForwarding}
        variant="contained"
        disabled={saving}
        startIcon={saving ? <CircularProgress size={16} /> : <PhoneIcon />}
        sx={{ mt: 1 }}
        fullWidth
      >
        {saving ? "Saving..." : "Save Forwarding Settings"}
      </Button>
    </div>
  );
}
