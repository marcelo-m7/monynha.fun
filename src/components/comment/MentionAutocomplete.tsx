import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User as UserIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Profile } from '@/entities/profile/profile.types';

interface MentionAutocompleteProps {
  users: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>[];
  isLoading: boolean;
  selectedIndex: number;
  onSelect: (username: string) => void;
  position: { top: number; left: number } | null;
}

export const MentionAutocomplete: React.FC<MentionAutocompleteProps> = ({
  users,
  isLoading,
  selectedIndex,
  onSelect,
  position,
}) => {
  const { t } = useTranslation();
  const listRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLDivElement>(null);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedItemRef.current && selectedItemRef.current.scrollIntoView) {
      selectedItemRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selectedIndex]);

  if (!position) return null;

  return (
    <div
      ref={listRef}
      className="absolute z-50 w-80 max-w-[calc(100vw-2rem)] max-h-60 overflow-y-auto bg-popover border border-border rounded-lg shadow-lg"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      role="listbox"
      aria-label={t('comments.form.mentionSuggestions')}
    >
      {isLoading ? (
        <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          {t('comments.form.searchingUsers')}
        </div>
      ) : users.length === 0 ? (
        <div className="p-4 text-sm text-center text-muted-foreground">
          {t('comments.noUsersFound')}
        </div>
      ) : (
        <div className="py-1">
          {users.map((user, index) => (
            <div
              key={user.id}
              ref={index === selectedIndex ? selectedItemRef : null}
              className={cn(
                'flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors',
                'hover:bg-accent focus:bg-accent',
                index === selectedIndex && 'bg-accent',
                'first:rounded-t-lg last:rounded-b-lg'
              )}
              onClick={() => onSelect(user.username)}
              onMouseEnter={() => {
                // Could optionally update selectedIndex on hover
              }}
              role="option"
              aria-selected={index === selectedIndex}
              tabIndex={-1}
            >
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarImage
                  src={user.avatar_url || undefined}
                  alt={user.display_name || user.username}
                />
                <AvatarFallback className="bg-muted/50 text-muted-foreground text-xs">
                  {user.display_name
                    ? user.display_name[0].toUpperCase()
                    : user.username
                    ? user.username[0].toUpperCase()
                    : <UserIcon className="w-4 h-4" />}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.display_name || user.username}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  @{user.username}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
