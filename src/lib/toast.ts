import { toast as sonnerToast } from "sonner";
import type { TranslationKey } from "./i18n/translations";

type ToastMessage = string | TranslationKey;
type TranslateFunction = (key: TranslationKey, params?: Record<string, string | number>) => string;

// Global translation function reference
let translateFn: TranslateFunction | null = null;

// Set the translation function (called from LanguageProvider)
export const setToastTranslate = (fn: TranslateFunction) => {
  translateFn = fn;
};

// Helper to get translated message
const getMessage = (message: ToastMessage, params?: Record<string, string | number>): string => {
  if (translateFn) {
    try {
      return translateFn(message as TranslationKey, params);
    } catch {
      // If translation fails, return the message as-is
      return message;
    }
  }
  return message;
};

// Toast wrapper matching Angular ngx-toastr behavior with i18n support
export const toast = {
  success: (message: ToastMessage, params?: Record<string, string | number>, duration = 2000) => {
    sonnerToast.success(getMessage(message, params), {
      duration,
      style: {
        background: "hsl(196, 73%, 56%)", // Success color from Angular
        color: "white",
        border: "none",
      },
    });
  },

  error: (message: ToastMessage, params?: Record<string, string | number>, duration = 2000) => {
    sonnerToast.error(getMessage(message, params), {
      duration,
      style: {
        background: "hsl(356, 89%, 49%)", // Danger color from Angular
        color: "white",
        border: "none",
      },
    });
  },

  warning: (message: ToastMessage, params?: Record<string, string | number>, duration = 2000) => {
    sonnerToast.warning(getMessage(message, params), {
      duration,
      style: {
        background: "hsl(28, 96%, 47%)", // Warning color from Angular
        color: "white",
        border: "none",
      },
    });
  },

  info: (message: ToastMessage, params?: Record<string, string | number>, duration = 2000) => {
    sonnerToast.info(getMessage(message, params), {
      duration,
      style: {
        background: "hsl(214, 48%, 47%)", // Info color from Angular
        color: "white",
        border: "none",
      },
    });
  },
};
