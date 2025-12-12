import { toast as sonnerToast } from "sonner";

// Toast wrapper matching Angular ngx-toastr behavior
export const toast = {
  success: (message: string, duration = 2000) => {
    sonnerToast.success(message, {
      duration,
      style: {
        background: "hsl(196, 73%, 56%)", // Success color from Angular
        color: "white",
        border: "none",
      },
    });
  },

  error: (message: string, duration = 2000) => {
    sonnerToast.error(message, {
      duration,
      style: {
        background: "hsl(356, 89%, 49%)", // Danger color from Angular
        color: "white",
        border: "none",
      },
    });
  },

  warning: (message: string, duration = 2000) => {
    sonnerToast.warning(message, {
      duration,
      style: {
        background: "hsl(28, 96%, 47%)", // Warning color from Angular
        color: "white",
        border: "none",
      },
    });
  },

  info: (message: string, duration = 2000) => {
    sonnerToast.info(message, {
      duration,
      style: {
        background: "hsl(214, 48%, 47%)", // Info color from Angular
        color: "white",
        border: "none",
      },
    });
  },
};
