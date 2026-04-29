import { useState } from 'react';
import { X, Search, Star } from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import verifiedBadge from '../assets/verified-badge.png';
import { Profile } from '../utils/supabase/api';

interface UserListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  users: Profile[];
  loading?: boolean;
  onUserSelect?: (user: Profile) => void;
}

export function UserListModal({ isOpen, onClose, title, users, loading = false, onUserSelect }: UserListModalProps) {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-xl animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[#8A2BE2]">
              <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
            />
          </div>
        </div>

        {/* List */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {loading ? (
            <div className="p-8 flex justify-center">
              <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="space-y-1">
              {filteredUsers.map((user) => (
                <div 
                  key={user.id}
                  className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors"
                  onClick={() => {
                    onUserSelect?.(user);
                    onClose();
                  }}
                >
                  <div className="relative w-10 h-10 flex-shrink-0">
                    <UserAvatar
                      src={user.avatar_url}
                      name={user.full_name || 'User'}
                      className="w-full h-full"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 truncate flex items-center gap-1.5">
                      {user.full_name}
                      {user.is_organizer && (
                        <img src={verifiedBadge} alt="Verified" className="w-3.5 h-3.5 select-none" loading="lazy" decoding="async" />
                      )}
                    </h3>
                    <p className="text-xs text-gray-500 truncate">@{user.username}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-gray-500 text-sm">No users found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
