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

interface TermsOfServiceDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function TermsOfServiceDialog({
  open,
  onClose,
}: TermsOfServiceDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Terms of Service</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body1" gutterBottom>
          Last Updated: {new Date().toLocaleDateString()}
        </Typography>

        <Typography variant="h6" gutterBottom>
          1. Acceptance of Terms
        </Typography>
        <Typography variant="body1" paragraph>
          By accessing or using our lead management platform
          (&quote;Service&quote;), you agree to be bound by these Terms of
          Service (&quote;Terms&quote;). If you disagree with any part of the
          terms, you may not access the Service.
        </Typography>

        <Typography variant="h6" gutterBottom>
          2. Service Description
        </Typography>
        <Typography variant="body1" paragraph>
          Our Service provides lead management solutions including but not
          limited to lead capture, organization, tracking, and analytics. We
          integrate with third-party payment processors (Stripe) for payment
          transactions.
        </Typography>

        <Typography variant="h6" gutterBottom>
          3. User Responsibilities
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText primary="You must provide accurate registration information and keep it updated" />
          </ListItem>
          <ListItem>
            <ListItemText primary="You are responsible for maintaining the confidentiality of your account credentials" />
          </ListItem>
          <ListItem>
            <ListItemText primary="You agree to use the Service in compliance with all applicable laws" />
          </ListItem>
          <ListItem>
            <ListItemText primary="You will not use the Service for any illegal or unauthorized purpose" />
          </ListItem>
        </List>

        <Typography variant="h6" gutterBottom>
          4. Payment Processing
        </Typography>
        <Typography variant="body1" paragraph>
          All payments are processed through PCI DSS compliant third-party
          processors (Stripe). We do not store or process credit card
          information on our servers. You agree to comply with the terms of
          service of our payment processors.
        </Typography>

        <Typography variant="h6" gutterBottom>
          5. Data Protection
        </Typography>
        <Typography variant="body1" paragraph>
          We implement industry-standard security measures to protect your data.
          However, you acknowledge that no system is completely secure and we
          cannot guarantee absolute security.
        </Typography>

        <Typography variant="h6" gutterBottom>
          6. Intellectual Property
        </Typography>
        <Typography variant="body1" paragraph>
          All content and software associated with the Service are the property
          of our company or its licensors and are protected by intellectual
          property laws.
        </Typography>

        <Typography variant="h6" gutterBottom>
          7. Limitation of Liability
        </Typography>
        <Typography variant="body1" paragraph>
          To the maximum extent permitted by law, we shall not be liable for any
          indirect, incidental, special, consequential or punitive damages
          resulting from your use of the Service.
        </Typography>

        <Typography variant="h6" gutterBottom>
          8. Termination
        </Typography>
        <Typography variant="body1" paragraph>
          We may terminate or suspend your account immediately for any breach of
          these Terms. You may terminate your account at any time by contacting
          us.
        </Typography>

        <Typography variant="h6" gutterBottom>
          9. Governing Law
        </Typography>
        <Typography variant="body1" paragraph>
          These Terms shall be governed by and construed in accordance with the
          laws of [Your Jurisdiction], without regard to its conflict of law
          provisions.
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
