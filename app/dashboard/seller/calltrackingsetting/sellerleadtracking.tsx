import { useEffect, useState } from "react";
// import { io } from "socket.io-client";
import { getSession } from "next-auth/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
  Button,
  Snackbar,
  Alert,
} from "@mui/material";
import LoadingComponent from "@/app/components/generalComponent/loadingcomponent";

interface Call {
  from: string;
  to: string;
  status: string;
  recordingUrl?: string;
  callDuration?: number;
  buyerName?: string;
  industry?: string;
  createdAt: string;
}

export default function LeadTracking() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [newLead, setNewLead] = useState<Call | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sellerId, setSellerId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSellerId() {
      const session = await getSession();
      if (session && session.user) {
        setSellerId(session.user.id);
      }
    }
    fetchSellerId();
  }, []);

  useEffect(() => {
    if (!sellerId) return;

    fetch(`/api/calltracking`)
      .then((res) => res.json())
      .then((data) => {
        setCalls(data);
        setLoading(false);
      });

    // const socket = io("http://localhost:4001");

    // socket.on("new-lead", (newCall: Call) => {
    //   setCalls((prevCalls) => [newCall, ...prevCalls]);
    //   setNewLead(newCall);
    //   setOpen(true);
    // });

    // return () => {
    //   socket.disconnect();
    // };
  }, [sellerId]);

  if (loading || !sellerId) return <LoadingComponent />;

  return (
    <>
      <Snackbar
        open={open}
        autoHideDuration={3000}
        onClose={() => setOpen(false)}
      >
        <Alert severity="info">New Lead from {newLead?.from}!</Alert>
      </Snackbar>

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>From</TableCell>
            <TableCell>To</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Buyer Name</TableCell>
            <TableCell>Industry</TableCell>
            <TableCell>Duration (s)</TableCell>
            <TableCell>Recording</TableCell>
            <TableCell>Date</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {calls.map((call, index) => (
            <TableRow key={index}>
              <TableCell>{call.from}</TableCell>
              <TableCell>{call.to}</TableCell>
              <TableCell>{call.status}</TableCell>
              <TableCell>{call.buyerName || "N/A"}</TableCell>
              <TableCell>{call.industry || "N/A"}</TableCell>
              <TableCell>
                {call.callDuration ? `${call.callDuration} sec` : "N/A"}
              </TableCell>
              <TableCell>
                {call.recordingUrl ? (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => window.open(call.recordingUrl, "_blank")}
                  >
                    Listen
                  </Button>
                ) : (
                  "No Recording"
                )}
              </TableCell>
              <TableCell>{new Date(call.createdAt).toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
