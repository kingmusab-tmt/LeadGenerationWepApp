import {
  Box,
  Card,
  CardContent,
  Typography,
  Link as MuiLink,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

const AuthSuccessPage: React.FC = () => {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        backgroundColor: "#f5f5f5",
        padding: 2,
      }}
    >
      <Card
        sx={{
          maxWidth: 500,
          width: "100%",
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        }}
      >
        <CardContent
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            padding: 4,
          }}
        >
          {/* Success Icon */}
          <CheckCircleIcon
            sx={{
              fontSize: 80,
              color: "success.main",
              marginBottom: 2,
            }}
          />

          {/* Success Message */}
          <Typography
            variant="h5"
            component="h1"
            gutterBottom
            sx={{ fontWeight: 600 }}
          >
            Success!
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ marginBottom: 3 }}
          >
            {"Please check your email inbox for sign in link."}
          </Typography>

          {/* Help Text */}
          <Typography variant="body2" color="text.secondary">
            {
              "Didn't receive an email? To go back to the sign-in page and try again, "
            }
            <MuiLink
              href="/api/auth/signin"
              sx={{
                cursor: "pointer",
                fontWeight: 600,
                color: "primary.main",
                "&:hover": {
                  textDecoration: "underline",
                },
              }}
            >
              Click Here
            </MuiLink>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AuthSuccessPage;
