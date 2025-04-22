import React from "react";
import { Box, Typography, Paper, Rating } from "@mui/material";
import { Buyer } from "@/types/buyer";

interface FeedbackSectionProps {
  feedback: Buyer["feedback"];
}

const FeedbackSection: React.FC<FeedbackSectionProps> = ({ feedback }) => {
  return (
    <Paper elevation={3} sx={{ padding: 3, marginBottom: 4 }}>
      <Typography variant="h6" gutterBottom>
        Feedback & Reviews
      </Typography>
      {feedback.map((review, index) => (
        <Box key={index} sx={{ marginBottom: 2 }}>
          <Typography>
            <strong>Rating:</strong>
          </Typography>
          <Rating value={review.rating} readOnly />
          <Typography>
            <strong>Comment:</strong> {review.comment}
          </Typography>
        </Box>
      ))}
    </Paper>
  );
};

export default FeedbackSection;
