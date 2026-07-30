"use client";

import { Box, Button, Card, CardContent, LinearProgress, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import {
  getSellerOnboardingCompletion,
  SellerOnboardingUser,
} from "@/lib/sellerOnboarding";
import { useDashboardTerms } from "@/app/hooks";

/**
 * Surfaces the seller profile-completeness score that
 * getSellerOnboardingCompletion already computes but that, until now,
 * nothing in the app rendered — the onboarding wizard gates access once,
 * then this data was never shown again even for sellers who skipped fields.
 * Hides itself once the profile is fully filled in.
 */
export default function ProfileCompletionCard({
  user,
}: {
  user?: SellerOnboardingUser | null;
}) {
  const router = useRouter();
  const terms = useDashboardTerms();
  const { completed, total, percent, complete } =
    getSellerOnboardingCompletion(user);

  if (complete) return null;

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 1,
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Finish setting up your profile
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {completed}/{total} complete
          </Typography>
        </Box>
        <LinearProgress
          value={percent}
          variant="determinate"
          sx={{ mb: 2, height: 8, borderRadius: 4 }}
        />
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="body2" color="text.secondary">
            A complete business profile builds trust with {terms.buyersLower}{" "}
            and shows up better in the marketplace.
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={() => router.push("/dashboard/settings")}
            sx={{ whiteSpace: "nowrap", ml: 2 }}
          >
            Complete profile
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
