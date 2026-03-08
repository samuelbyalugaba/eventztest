import React, { useState } from 'react';
import { 
  ArrowLeft, Share2, Bookmark, MoreHorizontal, Trash2, 
  Star, Send, MessageCircle, Calendar, MapPin, Heart, Play,
  ChevronLeft
} from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from './ui/dropdown-menu';
import { toast } from 'sonner';

interface PostDetailPageProps {
  post: any;
  currentUser: any;
  userProfile?: any; // New prop for full profile data
  onBack: () => void;
  onLike: (id: number, e?: React.MouseEvent) => void;
  onSave: (id: number, e?: React.MouseEvent) => void;
  onShare: (post: any, e?: React.MouseEvent) => void;
  onDelete: (id: number) => void;
  onProfileClick: (user: any, e?: React.MouseEvent) => void;
  onComment: (postId: number, text: string) => void;
}

export function PostDetailPage({ 
  post, 
  currentUser, 
  userProfile,
  onBack, 
  onLike, 
  onSave, 
  onShare, 
  onDelete, 
  onProfileClick,
  onComment
}: PostDetailPageProps) {
  const [commentText, setCommentText] = useState('');

  const handlePostComment = () => {
    if (!commentText.trim()) return;
    onComment(post.id, commentText);
    setCommentText('');
  };

  return (
    <div className="min-h-screen bg-white pb-20 animate-in fade-in slide-in-from-right duration-200">
      {/* Detail Header */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-lg border-b border-gray-100">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors flex items-center gap-1 text-gray-900"
            >
              <ChevronLeft className="w-6 h-6" />
              <span className="font-medium text-lg">Post</span>
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => onShare(post, e)}
                className="p-2.5 bg-gray-100 hover:bg-cyan-100 text-gray-700 hover:text-cyan-600 rounded-xl transition-all"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => onSave(post.id, e)}
                className={`p-2.5 rounded-xl transition-all ${
                  post.isSaved
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 hover:bg-purple-100 text-gray-700 hover:text-purple-600'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${post.isSaved ? 'fill-white' : ''}`} />
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {currentUser?.id === post.user.id ? (
                    <DropdownMenuItem 
                      onClick={() => {
                        onDelete(post.id);
                        onBack();
                      }} 
                      className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Post
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem 
                      onClick={() => {
                        toast.success('Post reported. We will review it shortly.');
                        onBack();
                      }}
                      className="cursor-pointer"
                    >
                      Report Post
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Hero Image/Video with Gradient Overlay */}
        <div className="relative">
          {post.video_url ? (
            <div className="relative aspect-[9/16] max-h-[70vh] w-full bg-black overflow-hidden">
              <video 
                src={post.video_url} 
                className="w-full h-full object-contain"
                controls
                autoPlay
                loop
                muted
              />
            </div>
          ) : post.image_urls?.[0] ? (
            <div className="relative aspect-[4/5] w-full bg-gray-100 overflow-hidden">
              <ImageWithFallback
                src={post.image_urls[0]}
                alt="Post detail"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none"></div>
            </div>
          ) : post.content?.image ? (
            <div className="relative aspect-[4/5] w-full bg-gray-100 overflow-hidden">
              <ImageWithFallback
                src={post.content.image}
                alt="Post detail"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none"></div>
            </div>
          ) : null}
        </div>

        {/* User & Post Info */}
        <div className="p-5 space-y-4">
          {/* User Card */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <UserAvatar
                src={post.user.avatar}
                name={post.user.name}
                className="w-14 h-14 rounded-2xl object-cover ring-4 ring-purple-100 cursor-pointer hover:ring-purple-300 transition-all"
                onClick={(e) => onProfileClick(post.user, e)}
              />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {post.user.isOrganizer && (
                    <Star className="w-4 h-4 text-purple-600 fill-purple-600" />
                  )}
                  <span 
                    className="text-gray-900 font-bold cursor-pointer hover:text-purple-600 transition-colors"
                    onClick={(e) => onProfileClick(post.user, e)}
                  >
                    {post.user.name}
                  </span>
                  {post.user.verified && !post.user.isOrganizer && (
                    <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center" title="Verified">
                      <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      </svg>
                    </div>
                  )}
                </div>
                <span className="text-gray-500 text-sm">{post.timestamp || 'Just now'}</span>
              </div>
            </div>
          </div>

          {/* Post Content */}
          <div className="text-gray-800 text-[15px] leading-relaxed">
            {post.content?.text || post.content}
          </div>

          {/* Event Card - If Available */}
          {post.event && (
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-5 border border-purple-100">
              <div className="flex items-start gap-3 mb-4">
                <div className="flex-1">
                  <h3 className="text-gray-900 font-bold text-lg mb-2">{post.event.name || post.event.title}</h3>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-gray-700 text-sm">
                      <Calendar className="w-4 h-4 text-purple-600" />
                      <span className="font-medium">{post.event.date}</span>
                      {post.event.time && <span className="text-gray-500">• {post.event.time}</span>}
                    </div>
                    <div className="flex items-center gap-2 text-gray-700 text-sm">
                      <MapPin className="w-4 h-4 text-purple-600" />
                      <span>{post.event.location}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Engagement Stats */}
          <div className="flex items-center gap-6 py-2 border-b border-gray-100 pb-4">
            <div className="flex items-center gap-2">
              <button 
                onClick={(e) => onLike(post.id, e)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  post.isLiked ? 'bg-pink-50 text-pink-600 scale-110' : 'bg-gray-100 text-gray-600 hover:bg-pink-50 hover:text-pink-600'
                }`}
              >
                <Heart className={`w-5 h-5 ${post.isLiked ? 'fill-pink-600' : ''}`} />
              </button>
              <div className="text-gray-900 font-bold text-sm">{(post.likes_count || post.likes || 0).toLocaleString()}</div>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-gray-600" />
              </div>
              <div className="text-gray-900 font-bold text-sm">{(post.comments?.length || 0).toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <div className="px-5 pb-5">
          <h3 className="text-gray-900 font-bold text-lg mb-4">
            Replies ({post.comments?.length || 0})
          </h3>
          
          {/* Add Comment First */}
          <div className="mb-8">
            <div className="flex gap-4 items-start">
              <UserAvatar
                src={userProfile?.avatar_url || currentUser?.user_metadata?.avatar_url}
                name={userProfile?.full_name || currentUser?.user_metadata?.full_name || "You"}
                className="w-10 h-10 rounded-full object-cover flex-shrink-0 ring-2 ring-gray-100"
              />
              <div className="flex-1">
                <div className="relative group">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    rows={1}
                    className="w-full bg-transparent border-b-2 border-gray-200 py-2.5 text-base text-gray-900 placeholder-gray-400 outline-none focus:border-gray-900 transition-colors resize-none overflow-hidden min-h-[44px]"
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = `${target.scrollHeight}px`;
                    }}
                  />
                  <div className="absolute right-0 bottom-2.5 flex items-center gap-2">
                    <button
                      onClick={handlePostComment}
                      disabled={!commentText.trim()}
                      className={`p-2 rounded-full transition-all ${
                        commentText.trim()
                          ? 'text-purple-600 hover:bg-purple-50'
                          : 'text-gray-300 cursor-not-allowed'
                      }`}
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Comments List */}
          <div className="space-y-4">
            {!post.comments || post.comments.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <MessageCircle className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 text-sm">
                  No replies yet. Be the first to share your thoughts!
                </p>
              </div>
            ) : (
              post.comments.map((comment: any) => (
                <div key={comment.id} className="flex gap-3">
                  <UserAvatar
                    src={comment.user.avatar}
                    name={comment.user.name}
                    className="w-9 h-9 rounded-xl object-cover flex-shrink-0"
                  />
                  <div className="flex-1">
                    <div className="bg-gray-50 rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-gray-900 text-sm font-semibold">{comment.user.name}</span>
                        <span className="text-gray-400 text-xs">•</span>
                        <span className="text-gray-500 text-xs">{comment.timestamp}</span>
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed">{comment.text}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}