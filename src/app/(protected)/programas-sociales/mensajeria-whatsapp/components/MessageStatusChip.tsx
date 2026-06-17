"use client";

import { Chip, Tooltip } from "@mui/material";
import {
  Schedule,
  HourglassEmpty,
  Check,
  DoneAll,
  Visibility,
  Reply,
  Error,
} from "@mui/icons-material";
import { MessageStatus, STATUS_CONFIG } from "../types";

interface MessageStatusChipProps {
  status: MessageStatus;
  statusMessage?: string;
  size?: "small" | "medium";
}

const STATUS_ICONS: Record<MessageStatus, React.ReactNode> = {
  [MessageStatus.PENDING]: <Schedule fontSize="small" />,
  [MessageStatus.SENDING]: <HourglassEmpty fontSize="small" />,
  [MessageStatus.SENT]: <Check fontSize="small" />,
  [MessageStatus.DELIVERED]: <DoneAll fontSize="small" />,
  [MessageStatus.READ]: <Visibility fontSize="small" />,
  [MessageStatus.REPLIED]: <Reply fontSize="small" />,
  [MessageStatus.FAILED]: <Error fontSize="small" />,
};

export default function MessageStatusChip({
  status,
  statusMessage,
  size = "small",
}: MessageStatusChipProps) {
  const config = STATUS_CONFIG[status];
  const icon = STATUS_ICONS[status];

  const chip = (
    <Chip
      icon={icon as React.ReactElement}
      label={config.label}
      size={size}
      sx={{
        backgroundColor: config.bgColor,
        color: config.color,
        fontWeight: 500,
        "& .MuiChip-icon": {
          color: config.color,
        },
        ...(status === MessageStatus.SENDING && {
          animation: "pulse 1.5s infinite",
          "@keyframes pulse": {
            "0%": { opacity: 1 },
            "50%": { opacity: 0.6 },
            "100%": { opacity: 1 },
          },
        }),
      }}
    />
  );

  // Si hay un mensaje de error, mostrar tooltip
  if (status === MessageStatus.FAILED && statusMessage) {
    return (
      <Tooltip title={statusMessage} arrow>
        {chip}
      </Tooltip>
    );
  }

  return chip;
}
