import { useState } from 'react';
import { Search, ArrowLeft, PlusCircle, Trash2, MessageSquare } from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { Conversation } from '../types';
import { searchProfiles } from '../utils/supabase/api';

interface ChatListProps {
  conversations: Conversation[];
  onSelectConversation: (conversation: Conversation) => void;
  onStartNewChat?: (user: { id: string; name: string; avatar: string; username: string; verified: boolean }) => void;
  onClose: () => void;
  onlineUsers?: { id: string; name: string; avatar: string; username: string }[];
  onDeleteConversation?: (conversationId: number) => void;
}

export function ChatList({ conversations, onSelectConversation, onStartNewChat, onClose, onlineUsers = [], onDeleteConversation }: ChatListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const visibleConversations = conversations.filter(conv => conv.hasMessages === true);
  const filteredConversations = visibleConversations.filter(conv => {
    return (
      conv.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.user.username.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });
  const hasOnlyEmptyConversations = conversations.length > 0 && visibleConversations.length === 0;

  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    if (term.length > 2 && isSearching) {
      try {
        const results = await searchProfiles(term);
        setSearchResults(results);
      } catch (error) {
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleStartNewChat = () => {
    setIsSearching(true);
    setSearchTerm('');
    // Optionally focus the input
  };

  const handleBack = () => {
    if (isSearching) {
      setIsSearching(false);
      setSearchTerm('');
      setSearchResults([]);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-[70] flex flex-col h-full animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="px-5 pt-6 pb-2">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={handleBack} aria-label="Back" className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
              <ArrowLeft className="w-6 h-6 text-gray-900" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">{isSearching ? 'New Chat' : 'Messages'}</h1>
          </div>
          
          {!isSearching && (
            <button onClick={handleStartNewChat} aria-label="New chat" className="p-2 hover:bg-gray-100 rounded-full">
              <PlusCircle className="w-6 h-6 text-blue-600" />
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            placeholder={isSearching ? "Search people..." : "Search messages..."}
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full bg-gray-100 rounded-2xl py-3 pl-12 pr-4 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            autoFocus={isSearching}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Online Friends */}
        {!isSearching && onlineUsers.length > 0 && (
          <div className="pt-4 pb-2">
            <div className="px-5 mb-3">
              <h2 className="text-base font-semibold text-gray-900">Online friends</h2>
            </div>
            <div className="flex gap-4 px-5 overflow-x-auto pb-4 no-scrollbar">
              {onlineUsers.map((user) => (
                <div 
                  key={user.id} 
                  className="flex flex-col items-center space-y-1 min-w-[64px] cursor-pointer"
                  onClick={() => onStartNewChat?.({ ...user, verified: false })}
                >
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full p-0.5 border-2 border-transparent">
                      <UserAvatar 
                        src={user.avatar} 
                        name={user.name} 
                        className="w-full h-full rounded-full"
                      />
                    </div>
                    <div className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                  </div>
                  <span className="text-xs text-gray-600 truncate w-full text-center">{user.username.split('_')[0]}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="px-5 pt-2 pb-20">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            {isSearching ? (searchTerm ? 'Search Results' : 'Suggested') : 'Messages'}
          </h2>
          
          <div className="space-y-6">
            {isSearching ? (
              // Search Results List
              (searchTerm ? searchResults : onlineUsers).map((user) => (
                <div 
                  key={user.id} 
                  onClick={() => onStartNewChat?.({ 
                    id: user.id, 
                    name: user.full_name || user.name, 
                    username: user.username, 
                    avatar: user.avatar_url || user.avatar, 
                    verified: user.verified || false 
                  })}
                  className="flex items-center gap-4 cursor-pointer active:opacity-70 transition-opacity"
                >
                  <UserAvatar 
                    src={user.avatar_url || user.avatar} 
                    name={user.full_name || user.name || 'User'} 
                    className="w-14 h-14 rounded-full"
                  />
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900">{user.full_name || user.name}</h3>
                    <p className="text-sm text-gray-500">@{user.username}</p>
                  </div>
                </div>
              ))
            ) : (
              // Conversations List
              filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                    <MessageSquare className="h-7 w-7 text-gray-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900">
                    {searchTerm ? 'No matching chats' : 'No active chats'}
                  </h3>
                  <p className="mt-2 max-w-xs text-sm text-gray-500">
                    {searchTerm
                      ? 'Try searching for another person or message.'
                      : hasOnlyEmptyConversations
                        ? 'Chats will appear here after a message is sent.'
                        : 'Start a conversation from a profile to begin messaging.'}
                  </p>
                </div>
              ) : filteredConversations.map((conv) => {
                const isOnline = onlineUsers.some(u => u.id === conv.user.id);
                const previewText = conv.lastMessage.text || 'Attachment';
                return (
                  <div 
                    key={conv.id} 
                    role="button"
                    tabIndex={0}
                    aria-label={`Open conversation with ${conv.user.name}`}
                    onClick={() => onSelectConversation(conv)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectConversation(conv);
                      }
                    }}
                    className="flex items-start gap-4 cursor-pointer active:opacity-70 transition-opacity"
                  >
                    <div className="relative">
                      <UserAvatar 
                        src={conv.user.avatar} 
                        name={conv.user.name} 
                        className="w-14 h-14"
                      />
                      {isOnline && (
                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-bold text-gray-900 truncate">{conv.user.name}</h3>
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {conv.lastMessage.timestamp}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className={`text-sm truncate pr-4 ${
                          (conv.unreadCount || 0) > 0 ? 'text-gray-900 font-semibold' : 'text-gray-500'
                        }`}>
                          {previewText}
                        </p>
                        <div className="flex items-center gap-2">
                          {(conv.unreadCount || 0) > 0 && (
                            <div className="min-w-[20px] h-5 bg-blue-600 rounded-full flex items-center justify-center px-1.5">
                              <span className="text-[10px] font-bold text-white">{conv.unreadCount}</span>
                            </div>
                          )}
                          <button 
                            aria-label={`Delete conversation with ${conv.user.name}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Are you sure you want to delete this conversation?')) {
                                onDeleteConversation?.(conv.id);
                              }
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
