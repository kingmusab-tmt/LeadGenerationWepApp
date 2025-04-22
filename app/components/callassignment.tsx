import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
} from "@mui/material";
import LoadingComponent from "./generalComponent/loadingcomponent";

interface LeadBuyer {
  _id: string;
  name: string;
  phoneNumber: string;
}

export default function SellerDashboard() {
  const [buyers, setBuyers] = useState<LeadBuyer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sellers/buyers")
      .then((res) => res.json())
      .then((data) => {
        setBuyers(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <LoadingComponent />;

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Name</TableCell>
          <TableCell>Phone Number</TableCell>
          <TableCell>Actions</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {buyers.map((buyer) => (
          <TableRow key={buyer._id}>
            <TableCell>{buyer.name}</TableCell>
            <TableCell>{buyer.phoneNumber}</TableCell>
            <TableCell>
              <Button
                variant="contained"
                color="primary"
                onClick={() => assignBuyer(buyer._id)}
              >
                Assign Buyer
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function assignBuyer(buyerId: string) {
  fetch("/api/sellers/assign-buyer", {
    method: "POST",
    body: JSON.stringify({ buyerId }),
    headers: { "Content-Type": "application/json" },
  }).then(() => alert("Buyer assigned successfully!"));
}
