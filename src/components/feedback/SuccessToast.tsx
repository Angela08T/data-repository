"use client";

import { Snackbar, Alert, Slide, type SlideProps } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

function SlideUp(props: SlideProps) {
  return <Slide {...props} direction="down" />;
}

interface SuccessToastProps {
  open: boolean;
  message: string;
  onClose: () => void;
}

export default function SuccessToast({ open, message, onClose }: SuccessToastProps) {
  return (
    <Snackbar
      open={open}
      autoHideDuration={4000}
      onClose={onClose}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
      slots={{ transition: SlideUp }}
      sx={{ top: { xs: 16, sm: 24 } }}
    >
      <Alert
        onClose={onClose}
        icon={<CheckCircleIcon sx={{ fontSize: 22 }} />}
        variant="filled"
        sx={{
          borderRadius: "14px",
          fontWeight: 600,
          fontFamily: "'Poppins', sans-serif",
          fontSize: "0.875rem",
          alignItems: "center",
          background: "linear-gradient(135deg, #16a34a, #15803d)",
          boxShadow: "0 12px 32px rgba(22,101,52,0.35)",
          "& .MuiAlert-action": { paddingTop: 0 },
        }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
}
