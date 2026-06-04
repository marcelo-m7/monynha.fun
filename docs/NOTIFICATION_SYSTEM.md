# Notification System - Complete Implementation Guide

## Overview

The notification system has been refactored from scattered Sonner toast imports across the codebase into a **centralized, reusable notification API** that provides consistent, maintainable user feedback throughout the application.

## Architecture

### Core Components

#### 1. **Notification Utility** (`src/shared/lib/notify.ts`)
Centralized notification API providing a consistent interface for all notification types.

```typescript
// Available notification methods
notify.success(message: string, options?: NotifyOptions)
notify.error(message: string, options?: NotifyOptions)
notify.info(message: string, options?: NotifyOptions)
notify.warning(message: string, options?: NotifyOptions)
notify.loading(message: string, options?: NotifyOptions)
notify.promise<T>(promise: Promise<T>, messages: PromiseMessages)
notify.dismiss(id?: string | number)
```

#### 2. **Sonner Component Wrapper** (`src/components/ui/sonner.tsx`)
Configured Sonner toaster with dark theme and Tailwind styling, exported for use in AppProviders.

#### 3. **Notification Entity** (`src/entities/notification/`)
Manages backend notifications (user notifications from the API):
- `notification.types.ts` - Type definitions
- `notification.api.ts` - API calls to Supabase RPC functions
- `notification.keys.ts` - TanStack Query key factory
- `index.ts` - Barrel export

#### 4. **Notification Feature** (`src/features/notifications/`)
Query hooks for consuming backend notifications:
- `useNotifications()` - Fetch user notifications
- `useUnreadNotificationsCount()` - Get unread count
- `useMarkNotificationAsRead()` - Mark single notification
- `useMarkAllNotificationsAsRead()` - Mark all read

## Usage Patterns

### Basic Usage

```typescript
import { notify } from '@/shared/lib/notify';

// Success notification
notify.success('Operation completed successfully');

// Error notification
notify.error('Failed to save changes', {
  description: 'Please try again later'
});

// With action button
notify.info('New comment on your video', {
  action: {
    label: 'View',
    onClick: () => navigate('/comments')
  }
});
```

### With i18n Translation

```typescript
import { notify } from '@/shared/lib/notify';
import { useTranslation } from 'react-i18next';

export function MyComponent() {
  const { t } = useTranslation();

  const handleSubmit = async () => {
    try {
      await submitForm();
      notify.success(t('form.success'));
    } catch (error) {
      notify.error(t('form.error'), {
        description: error.message
      });
    }
  };

  return <button onClick={handleSubmit}>Submit</button>;
}
```

### With Mutations (TanStack Query)

```typescript
import { useMutation } from '@tanstack/react-query';
import { notify } from '@/shared/lib/notify';

export function useMyMutation() {
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/endpoint', data);
      return response.data;
    },
    onSuccess: (data) => {
      notify.success('Operation successful!');
      // Handle success
    },
    onError: (error) => {
      notify.error('Operation failed', {
        description: error.message
      });
    },
  });
}
```

### Promise Handler

```typescript
// Automatic loading → success/error transitions
notify.promise(
  uploadVideo(file),
  {
    loading: t('common.uploading'),
    success: (data) => `Video "${data.title}" uploaded successfully!`,
    error: (err) => `Upload failed: ${err.message}`
  }
);
```

## Refactored Files

### Feature Hooks (7 files)
- `src/features/comments/queries/useComments.ts`
- `src/features/videos/queries/useEnrichVideo.ts`
- `src/features/notifications/queries/useNotifications.ts`
- `src/features/favorites/queries/useFavorites.ts`
- `src/features/follows/queries/useFollows.ts`
- `src/features/user_social_accounts/queries/useUserSocialAccounts.ts`
- `src/features/profile/queries/useProfile.ts`

### Pages (5 files)
- `src/pages/Auth.tsx`
- `src/pages/Contact.tsx`
- `src/pages/Submit.tsx`
- `src/pages/VideoDetails.tsx`
- `src/pages/EditProfile.tsx`
- `src/pages/CreateEditPlaylist.tsx`

### Components (4 files)
- `src/components/auth/ResetPasswordForm.tsx`
- `src/components/account/ChangeEmailForm.tsx`
- `src/components/account/ResendConfirmationEmail.tsx`
- `src/components/account/DeleteAccount.tsx`

## Notification Options

```typescript
interface NotifyOptions {
  description?: string;        // Secondary text explaining the notification
  duration?: number;           // How long to show (ms), default varies by type
  action?: {                   // Optional action button
    label: string;
    onClick: () => void;
  };
}
```

## Default Durations

- **Success**: 3000ms (3 seconds)
- **Error**: 4000ms (4 seconds)
- **Info**: 3000ms (3 seconds)
- **Warning**: 3500ms (3.5 seconds)
- **Loading**: No auto-dismiss

## Design Decisions

### 1. Centralization
All toast notifications flow through a single API, making it easy to:
- Change notification style globally
- Add analytics/logging
- Implement custom behaviors
- Maintain consistency

### 2. i18n Ready
- All messages support i18n translation keys
- Messages are passed as strings to support both plain text and translated keys
- Components use `useTranslation()` before calling notify

### 3. TypeScript Safety
- Full type support for options
- Intellisense for all methods
- No implicit `any` types

### 4. Promise Handling
Special method for async operations with automatic state management:
```typescript
notify.promise(asyncOperation, {
  loading: 'Processing...',
  success: 'Done!',
  error: (err) => `Failed: ${err.message}`
});
```

## Testing

All refactored code has been validated:
- ✅ TypeScript compilation: **PASSED**
- ✅ ESLint checks: **PASSED**
- ✅ No build errors
- ✅ No breaking changes

## Migration from Toast

If you encounter remaining `toast` imports in the codebase:

**Old way:**
```typescript
import { toast } from 'sonner';

toast.success('Done!');
toast.error('Failed!');
```

**New way:**
```typescript
import { notify } from '@/shared/lib/notify';

notify.success('Done!');
notify.error('Failed!');
```

## Accessibility

The notification system provides:
- ✅ ARIA labels for screen readers
- ✅ Keyboard accessible action buttons
- ✅ Appropriate role and live region announcements
- ✅ Dismissible via action or auto-timeout
- ✅ Color contrast compliant (dark theme)

## Future Enhancements

Possible improvements:
1. **Notification queue**: Manage multiple notifications
2. **Persistent notifications**: Store important ones in localStorage
3. **Notification history**: Access past notifications
4. **Custom themes**: Per-notification styling
5. **Sound notifications**: Optional audio feedback
6. **Desktop notifications**: Browser push notifications
7. **Analytics**: Track notification engagement

## Related Files

- **Setup**: [src/app/providers/AppProviders.tsx](src/app/providers/AppProviders.tsx)
- **Sonner wrapper**: [src/components/ui/sonner.tsx](src/components/ui/sonner.tsx)
- **Backend notifications**: [src/entities/notification/](src/entities/notification/)
- **Notification queries**: [src/features/notifications/](src/features/notifications/)

## Summary

The notification system is now:
- **Centralized**: Single entry point for all notifications
- **Consistent**: Unified API and styling
- **Maintainable**: Easy to update globally
- **Type-safe**: Full TypeScript support
- **i18n Ready**: Supports multi-language messages
- **Accessible**: WCAG compliant interactions
