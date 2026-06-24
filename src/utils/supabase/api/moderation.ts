import { supabase } from './client';

export type ReportContentType = 'post' | 'comment' | 'profile' | 'message' | 'event' | 'stream';

export const getBlockedUserIds = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_blocks')
    .select('blocker_id, blocked_id')
    .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);

  if (error) {
    if (String(error.message || '').toLowerCase().includes('does not exist')) return new Set<string>();
    throw error;
  }

  const ids = new Set<string>();
  (data || []).forEach((row: any) => {
    if (row.blocker_id === userId && row.blocked_id) ids.add(row.blocked_id);
    if (row.blocked_id === userId && row.blocker_id) ids.add(row.blocker_id);
  });
  return ids;
};

export const reportContent = async ({
  contentType,
  contentId,
  reason,
  details,
  reportedUserId,
}: {
  contentType: ReportContentType;
  contentId: string | number;
  reason: string;
  details?: string;
  reportedUserId?: string | null;
}) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Please sign in to report content');

  const { data, error } = await supabase
    .from('reports')
    .insert({
      reporter_id: user.id,
      reported_user_id: reportedUserId || null,
      content_type: contentType,
      content_id: String(contentId),
      reason: reason.trim() || 'Inappropriate content',
      details: details?.trim() || null,
      status: 'open',
    })
    .select()
    .single();

  if (error) {
    if ((error as any).code === '23505') return null;
    throw error;
  }

  return data;
};

export const blockUser = async (blockedUserId: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Please sign in to block users');
  if (!blockedUserId || blockedUserId === user.id) throw new Error('You cannot block this profile');

  const { error } = await supabase
    .from('user_blocks')
    .upsert(
      { blocker_id: user.id, blocked_id: blockedUserId },
      { onConflict: 'blocker_id,blocked_id' }
    );

  if (error) throw error;
};

export const unblockUser = async (blockedUserId: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Please sign in to unblock users');

  const { error } = await supabase
    .from('user_blocks')
    .delete()
    .eq('blocker_id', user.id)
    .eq('blocked_id', blockedUserId);

  if (error) throw error;
};

export const assertUsersCanInteract = async (currentUserId: string, otherUserId?: string | null) => {
  if (!currentUserId || !otherUserId || currentUserId === otherUserId) return;
  const blockedIds = await getBlockedUserIds(currentUserId);
  if (blockedIds.has(otherUserId)) {
    throw new Error('This interaction is unavailable because one of you has blocked the other.');
  }
};
