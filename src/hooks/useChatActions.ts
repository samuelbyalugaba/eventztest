import { useState, useCallback } from 'react';
import { Message, blockUser, reportContent, deleteMessage, getMessages } from '../utils/supabase/api';
import { toast } from 'sonner';
import { confirmBlockUser } from '../utils/moderation';
import { useReportReason } from '../contexts/ReportReasonContext';

export function useChatActions(
  recipient: { id: string; full_name?: string | null; username?: string | null },
  conversationId: number,
  onBack: () => void,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
) {
  const [showMenu, setShowMenu] = useState(false);
  const [messagePendingDelete, setMessagePendingDelete] = useState<Message | null>(null);
  const [selectedMediaUrl, setSelectedMediaUrl] = useState<string | null>(null);
  const { askReportReason } = useReportReason();

  const handleBlockUser = useCallback(async () => {
    if (!confirmBlockUser(recipient.full_name || recipient.username || 'this user')) return;
    try {
      await blockUser(recipient.id);
      toast.success('User blocked');
      setShowMenu(false);
      onBack();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to block user');
    }
  }, [recipient, onBack]);

  const handleReportUser = useCallback(async () => {
    const reason = await askReportReason(recipient.full_name || recipient.username || 'this user');
    if (!reason) return;
    try {
      await reportContent({
        contentType: 'profile',
        contentId: recipient.id,
        reason,
        reportedUserId: recipient.id,
      });
      toast.success('Report submitted');
      setShowMenu(false);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to submit report');
    }
  }, [recipient, askReportReason]);

  const handleDeleteMessage = useCallback(async (messageId: number) => {
    setMessages(prev => prev.filter(m => m.id !== messageId));
    try {
      await deleteMessage(messageId);
      toast.success('Message deleted');
    } catch (error) {
      console.error('Failed to delete message:', error);
      toast.error('Failed to delete message');
      getMessages(conversationId).then(setMessages);
    }
  }, [conversationId, setMessages]);

  const handleReportMessage = useCallback(async (msg: Message) => {
    const reason = await askReportReason('this message');
    if (!reason) return;
    try {
      await reportContent({
        contentType: 'message',
        contentId: msg.id,
        reason,
        details: msg.content,
        reportedUserId: msg.sender_id,
      });
      toast.success('Report submitted');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to submit report');
    }
  }, [askReportReason]);

  return {
    showMenu,
    setShowMenu,
    messagePendingDelete,
    setMessagePendingDelete,
    selectedMediaUrl,
    setSelectedMediaUrl,
    handleBlockUser,
    handleReportUser,
    handleDeleteMessage,
    handleReportMessage,
  };
}
