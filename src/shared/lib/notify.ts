import { toast } from 'sonner';

/**
 * Notification options that can be passed to notify functions
 */
export interface NotifyOptions {
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Centralized notification system
 * 
 * Provides a consistent API for showing notifications across the application.
 * Uses Sonner for toast notifications and integrates with i18n for message translation.
 * 
 * @example
 * // Simple success notification
 * notify.success('Operation completed successfully');
 * 
 * // With i18n translation key
 * import { useTranslation } from 'react-i18next';
 * const { t } = useTranslation();
 * notify.success(t('common.success'));
 * 
 * // With description
 * notify.error('Failed to save', {
 *   description: 'Please try again later'
 * });
 * 
 * // With action button
 * notify.info('New comment', {
 *   action: {
 *     label: 'View',
 *     onClick: () => navigate('/comments')
 *   }
 * });
 */
export const notify = {
  /**
   * Show a success notification
   * @param message The notification message (supports i18n keys)
   * @param options Additional notification options
   */
  success: (message: string, options?: NotifyOptions) => {
    toast.success(message, {
      description: options?.description,
      duration: options?.duration ?? 3000,
      action: options?.action,
    });
  },

  /**
   * Show an error notification
   * @param message The notification message (supports i18n keys)
   * @param options Additional notification options
   */
  error: (message: string, options?: NotifyOptions) => {
    toast.error(message, {
      description: options?.description,
      duration: options?.duration ?? 4000,
      action: options?.action,
    });
  },

  /**
   * Show an info notification
   * @param message The notification message (supports i18n keys)
   * @param options Additional notification options
   */
  info: (message: string, options?: NotifyOptions) => {
    toast.info(message, {
      description: options?.description,
      duration: options?.duration ?? 3000,
      action: options?.action,
    });
  },

  /**
   * Show a warning notification
   * @param message The notification message (supports i18n keys)
   * @param options Additional notification options
   */
  warning: (message: string, options?: NotifyOptions) => {
    toast.warning(message, {
      description: options?.description,
      duration: options?.duration ?? 3500,
      action: options?.action,
    });
  },

  /**
   * Show a loading notification
   * @param message The notification message (supports i18n keys)
   * @param options Additional notification options
   * @returns Function to dismiss the notification
   */
  loading: (message: string, options?: NotifyOptions) => {
    const id = toast.loading(message, {
      description: options?.description,
      duration: options?.duration,
    });
    
    // Return dismiss function for convenience
    return () => toast.dismiss(id);
  },

  /**
   * Dismiss a specific notification or all notifications
   * @param id Optional notification ID to dismiss. If not provided, dismisses all.
   */
  dismiss: (id?: string | number) => {
    if (id) {
      toast.dismiss(id);
    } else {
      toast.dismiss();
    }
  },

  /**
   * Promise handler for async operations
   * Shows loading state, then success/error based on promise result
   * 
   * @example
   * notify.promise(
   *   uploadVideo(file),
   *   {
   *     loading: t('common.uploading'),
   *     success: t('common.uploadSuccess'),
   *     error: (err) => `Upload failed: ${err.message}`
   *   }
   * );
   */
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: Error) => string);
    }
  ) => {
    return toast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
    });
  },
};

export default notify;
