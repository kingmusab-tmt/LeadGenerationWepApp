import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";

interface PrivacyPolicyDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function PrivacyPolicyDialog({
  open,
  onClose,
}: PrivacyPolicyDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Privacy Policy</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body1" gutterBottom>
          Last Updated: {new Date().toLocaleDateString()}
        </Typography>

        <Typography variant="h6" gutterBottom>
          1. Information We Collect
        </Typography>
        <Typography variant="body1" paragraph>
          We collect information to provide better services to our users. This
          includes:
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText primary="Account information (name, email, contact details)" />
          </ListItem>
          <ListItem>
            <ListItemText primary="Lead data you input into our system" />
          </ListItem>
          <ListItem>
            <ListItemText primary="Usage data and analytics" />
          </ListItem>
          <ListItem>
            <ListItemText primary="Payment processing information (handled exclusively by our PCI DSS compliant partners)" />
          </ListItem>
        </List>

        <Typography variant="h6" gutterBottom>
          2. How We Use Information
        </Typography>
        <Typography variant="body1" paragraph>
          We use the information we collect to:
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText primary="Provide, maintain, and improve our services" />
          </ListItem>
          <ListItem>
            <ListItemText primary="Process transactions through our payment processors" />
          </ListItem>
          <ListItem>
            <ListItemText primary="Send service notifications and updates" />
          </ListItem>
          <ListItem>
            <ListItemText primary="Enhance security and prevent fraud" />
          </ListItem>
        </List>

        <Typography variant="h6" gutterBottom>
          3. Data Sharing and Disclosure
        </Typography>
        <Typography variant="body1" paragraph>
          We do not sell your personal information. We may share information
          with:
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText primary="Payment processors (Stripe) as necessary to complete transactions" />
          </ListItem>
          <ListItem>
            <ListItemText primary="Service providers who assist in our operations (under confidentiality agreements)" />
          </ListItem>
          <ListItem>
            <ListItemText primary="Legal authorities when required by law" />
          </ListItem>
        </List>

        <Typography variant="h6" gutterBottom>
          4. Data Security
        </Typography>
        <Typography variant="body1" paragraph>
          We implement security measures including:
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText primary="Encryption of data in transit (TLS 1.2+)" />
          </ListItem>
          <ListItem>
            <ListItemText primary="Regular security audits and vulnerability testing" />
          </ListItem>
          <ListItem>
            <ListItemText primary="Access controls and authentication mechanisms" />
          </ListItem>
          <ListItem>
            <ListItemText primary="PCI DSS compliance through our payment partners" />
          </ListItem>
        </List>

        <Typography variant="h6" gutterBottom>
          5. Your Rights
        </Typography>
        <Typography variant="body1" paragraph>
          You have the right to:
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText primary="Access, correct, or delete your personal information" />
          </ListItem>
          <ListItem>
            <ListItemText primary="Object to or restrict processing of your data" />
          </ListItem>
          <ListItem>
            <ListItemText primary="Receive your data in a portable format" />
          </ListItem>
          <ListItem>
            <ListItemText primary="Withdraw consent where applicable" />
          </ListItem>
        </List>

        <Typography variant="h6" gutterBottom>
          6. Cookies and Tracking
        </Typography>
        <Typography variant="body1" paragraph>
          We use cookies and similar technologies to analyze trends, administer
          the website, and track users' movements around the site.
        </Typography>

        <Typography variant="h6" gutterBottom>
          7. International Data Transfers
        </Typography>
        <Typography variant="body1" paragraph>
          Data may be transferred to and processed in countries other than your
          own. We ensure appropriate safeguards are in place for such transfers.
        </Typography>

        <Typography variant="h6" gutterBottom>
          8. Changes to This Policy
        </Typography>
        <Typography variant="body1" paragraph>
          We may update this policy periodically. We will notify you of
          significant changes through the Service or by email.
        </Typography>

        <Typography variant="h6" gutterBottom>
          9. Contact Us
        </Typography>
        <Typography variant="body1" paragraph>
          For questions about this policy or your data, please contact our Data
          Protection Officer at privacy@yourcompany.com.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
