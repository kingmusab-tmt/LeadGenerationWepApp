import {
  Box,
  Card,
  CardContent,
  Typography,
  Link as MuiLink,
} from "@mui/material";
import ErrorIcon from "@mui/icons-material/Error";

const AuthErrorPage: React.FC = () => {
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
          {/* Error Icon */}
          <ErrorIcon
            sx={{
              fontSize: 80,
              color: "error.main",
              marginBottom: 2,
            }}
          />

          {/* Error Message */}
          <Typography
            variant="h5"
            component="h1"
            gutterBottom
            sx={{ fontWeight: 600 }}
          >
            Oops!
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ marginBottom: 3 }}
          >
            {"Something went wrong."}
          </Typography>

          {/* Help Text */}
          <Typography variant="body2" color="text.secondary">
            {"To go back to the sign in page, "}
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

export default AuthErrorPage;
