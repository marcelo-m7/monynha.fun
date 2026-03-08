export interface NotificationActor {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export interface NotificationWithActor {
  id: string;
  type: string;
  title: string | null;
  message: string | null;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
  actor?: NotificationActor | null;
}
