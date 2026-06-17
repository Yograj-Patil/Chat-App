import React, { useContext, useEffect, useRef, useState } from 'react';
import assets from '../assets/assets';
import { formatMessageTime } from '../lib/utils';
import { ChatContext } from '../../context/ChatContext';
import { AuthContext } from '../../context/AuthContext';
import toast from 'react-hot-toast';

// ─── Helpers ────────────────────────────────────────────────
const FileIcon = ({ type = '' }) => {
  if (type.startsWith('audio')) return <span>🎵</span>;
  if (type.startsWith('video')) return <span>🎬</span>;
  if (type.includes('pdf')) return <span>📕</span>;
  if (type.includes('zip') || type.includes('rar')) return <span>🗜️</span>;
  if (type.includes('sheet') || type.includes('excel') || type.includes('csv')) return <span>📊</span>;
  if (type.includes('word') || type.includes('doc')) return <span>📝</span>;
  return <span>📄</span>;
};

const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const getDateLabel = (dateStr) => {
  const msgDate = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const same = (a, b) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (same(msgDate, today)) return 'Today';
  if (same(msgDate, yesterday)) return 'Yesterday';
  return msgDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
};

const groupByDate = (msgs) => {
  const groups = [];
  let lastLabel = null;
  msgs.forEach((msg) => {
    const label = getDateLabel(msg.createdAt);
    if (label !== lastLabel) { groups.push({ label, messages: [] }); lastLabel = label; }
    groups[groups.length - 1].messages.push(msg);
  });
  return groups;
};

// ─── Sub-components ─────────────────────────────────────────
const DateSeparator = ({ label }) => (
  <div className='flex items-center gap-3 my-3'>
    <div className='flex-1 h-px bg-gray-600/50'></div>
    <span className='text-gray-400 text-xs bg-gray-800/60 px-3 py-1 rounded-full border border-gray-600/40'>{label}</span>
    <div className='flex-1 h-px bg-gray-600/50'></div>
  </div>
);

const AudioPlayer = ({ src }) => (
  <audio controls className='max-w-[230px] rounded-lg' style={{ height: 40 }}>
    <source src={src} />
    Your browser does not support audio.
  </audio>
);


// WhatsApp-style double tick — grey = delivered, blue = seen
const DoubleTick = ({ seen }) => (
  <span className={`inline-flex items-center ml-1 ${seen ? 'text-blue-400' : 'text-gray-400'}`} title={seen ? 'Seen' : 'Delivered'}>
    <svg width="16" height="10" viewBox="0 0 16 10" fill="currentColor">
      <path d="M1 5l3 3L10 1" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 5l3 3 6-7" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </span>
);

const MessageBubble = ({ msg, authUser, selectedUser }) => {
  const isOwn = msg.senderId?.toString() === authUser._id?.toString();

  // Deleted for everyone — show placeholder
  if (msg.deletedForEveryone) {
    return (
      <div className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
        <p className='text-gray-500 text-xs italic px-3 py-2 border border-gray-700 rounded-lg'>
          🚫 {isOwn ? 'You deleted this message' : 'This message was deleted'}
        </p>
      </div>
    );
  }

  return (
    <div className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
      {!isOwn && (
        <img src={selectedUser?.profilePic || assets.avatar_icon} alt='' className='w-7 rounded-full flex-shrink-0 mb-5' />
      )}
      <div className={`flex flex-col gap-1 max-w-[240px] ${isOwn ? 'items-end' : 'items-start'}`}>
        {msg.image && <img src={msg.image} alt='' className='max-w-[230px] border border-gray-700 rounded-lg' />}
        {msg.video && (
          <video controls className='max-w-[230px] rounded-lg border border-gray-700'>
            <source src={msg.video} />
          </video>
        )}
        {msg.audio && <AudioPlayer src={msg.audio} />}
        {msg.file && (
          <a href={msg.file.url} target='_blank' rel='noopener noreferrer'
            className='flex items-center gap-2 bg-white/10 border border-gray-600 rounded-lg p-3 hover:bg-white/20 transition-colors'>
            <span className='text-2xl'><FileIcon type={msg.file.type} /></span>
            <div className='flex flex-col min-w-0'>
              <span className='text-white text-xs font-medium truncate max-w-[150px]'>{msg.file.name}</span>
              <span className='text-gray-400 text-xs'>{formatFileSize(msg.file.size)}</span>
            </div>
            <span className='text-gray-400 text-xs ml-auto'>↓</span>
          </a>
        )}
        {msg.text && (
          <p className={`p-2 md:text-sm font-light rounded-lg break-all text-white
            ${isOwn ? 'bg-violet-500/30 rounded-br-none' : 'bg-white/10 rounded-bl-none'}`}>
            {msg.text}
          </p>
        )}
        <p className='text-gray-500 text-xs flex items-center gap-0.5'>
          {formatMessageTime(msg.createdAt)}
          {isOwn && <DoubleTick seen={msg.seen} />}
        </p>
      </div>
      {isOwn && (
        <img src={authUser?.profilePic || assets.avatar_icon} alt='' className='w-7 rounded-full flex-shrink-0 mb-5' />
      )}
    </div>
  );
};

// ─── Upload progress bar ─────────────────────────────────────
const UploadProgress = ({ progress, label }) => (
  <div className='flex flex-col gap-1 px-3 pb-2'>
    <div className='flex items-center justify-between text-xs text-gray-400'>
      <span>{label}</span>
      <span>{progress}%</span>
    </div>
    <div className='h-1.5 bg-gray-700 rounded-full overflow-hidden'>
      <div
        className='h-full bg-violet-500 rounded-full transition-all duration-200'
        style={{ width: `${progress}%` }}
      />
    </div>
  </div>
);

// ─── Main component ──────────────────────────────────────────
const ChatContainer = () => {
  const { messages, selectedUser, setSelectedUser, sendMessage, getMessages, deleteMessage } = useContext(ChatContext);
  const { authUser, onlineUsers } = useContext(AuthContext);

  const scrollEnd = useRef();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null); // { label, percent }
  const [deleteMenu, setDeleteMenu] = useState(null); // { messageId, isOwn, x, y }


  const grouped = groupByDate(messages);

  // Send text message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    setSending(true);
    await sendMessage({ text: input.trim() });
    setInput('');
    setSending(false);
  };

  // Generic file sender — uses FormData + axios upload progress
  const handleFileSend = async (file, accept, maxMB, label) => {
    if (!file) return;
    if (accept && !accept.split(',').some(a => {
      const t = a.trim();
      if (t.endsWith('/*')) return file.type.startsWith(t.replace('/*', '/'));
      return file.type === t;
    })) { toast.error(`Invalid file type`); return; }
    if (file.size > maxMB * 1024 * 1024) { toast.error(`${label} must be under ${maxMB}MB`); return; }

    const formData = new FormData();
    formData.append('media', file);

    setSending(true);
    setUploadProgress({ label: `Uploading ${label}...`, percent: 0 });
    await sendMessage(formData, (percent) => setUploadProgress({ label: `Uploading ${label}...`, percent }));
    setUploadProgress(null);
    setSending(false);
  };

  const handlePickFile = (accept, maxMB, label) => (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (file) handleFileSend(file, accept, maxMB, label);
  };

  const handleMessagePress = (e, msg, isOwn) => {
    e.preventDefault();
    e.stopPropagation();
    const x = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    const y = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
    // Keep menu inside viewport
    const menuW = 200, menuH = isOwn ? 110 : 60;
    const safeX = x + menuW > window.innerWidth ? x - menuW : x;
    const safeY = y + menuH > window.innerHeight ? y - menuH : y;
    setDeleteMenu({ messageId: msg._id, isOwn, x: safeX, y: safeY });
  };

  const handleDelete = async (deleteFor) => {
    if (!deleteMenu) return;
    await deleteMessage(deleteMenu.messageId, deleteFor);
    setDeleteMenu(null);
  };

  useEffect(() => {
    if (selectedUser) getMessages(selectedUser._id);
  }, [selectedUser]);

  useEffect(() => {
    if (scrollEnd.current && messages) scrollEnd.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return selectedUser ? (
    <div className='h-full overflow-hidden relative backdrop-blur-lg flex flex-col'>
      {/* Header */}
      <div className='flex items-center gap-3 py-3 mx-4 border-b border-stone-500 flex-shrink-0'>
        <img src={selectedUser.profilePic || assets.avatar_icon} alt='' className='w-8 rounded-full' />
        <p className='flex-1 text-lg text-white flex items-center gap-2'>
          {selectedUser.fullName}
          {onlineUsers.includes(selectedUser._id) && <span className='w-2 h-2 rounded-full bg-green-500'></span>}
        </p>
        <img onClick={() => setSelectedUser(null)} src={assets.arrow_icon} alt='' className='md:hidden max-w-7 cursor-pointer' />
        <img src={assets.help_icon} alt='' className='max-md:hidden max-w-5' />
      </div>

      {/* Messages */}
      <div className='flex flex-col flex-1 overflow-y-auto p-3 pb-2 gap-1'>
        {grouped.map(({ label, messages: dayMsgs }) => (
          <div key={label}>
            <DateSeparator label={label} />
            <div className='flex flex-col gap-2'>
              {dayMsgs.map((msg, i) => {
                const isOwn = msg.senderId?.toString() === authUser._id?.toString();
                return (
                  <div
                    key={i}
                    className='select-none'
                    onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); handleMessagePress(e, msg, isOwn); }}
                    onTouchStart={(e) => {
                      const timer = setTimeout(() => handleMessagePress(e, msg, isOwn), 600);
                      e.currentTarget._longPressTimer = timer;
                    }}
                    onTouchEnd={(e) => {
                      clearTimeout(e.currentTarget._longPressTimer);
                    }}
                    onTouchMove={(e) => clearTimeout(e.currentTarget._longPressTimer)}
                  >
                    <MessageBubble msg={msg} authUser={authUser} selectedUser={selectedUser} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {sending && !uploadProgress && (
          <div className='flex justify-end pr-10'>
            <span className='text-gray-400 text-xs animate-pulse'>Sending...</span>
          </div>
        )}
        <div ref={scrollEnd}></div>
      </div>

      {/* Upload progress */}
      {uploadProgress && <UploadProgress label={uploadProgress.label} progress={uploadProgress.percent} />}


      {/* Input */}
      <div className='flex items-center gap-2 p-3 shrink-0 bg-black/10'>
        <div className='flex-1 flex items-center bg-gray-100/12 px-3 rounded-full'>
          <input
            onChange={(e) => setInput(e.target.value)} value={input}
            onKeyDown={(e) => e.key === 'Enter' ? handleSendMessage(e) : null}
            type='text' placeholder='Send a message'
            className='flex-1 text-sm p-3 border-none rounded-lg outline-none text-white placeholder-gray-400 bg-transparent'
          />
          {/* Image */}
          <input type='file' id='dm-img' accept='image/*' hidden onChange={handlePickFile('image/*', 10, 'image')} />
          <label htmlFor='dm-img' title='Send image' className='mr-2 cursor-pointer'>
            <img src={assets.gallery_icon} alt='' className='w-5 opacity-70 hover:opacity-100 transition-opacity' />
          </label>
          {/* Video */}
          <input type='file' id='dm-vid' accept='video/*' hidden onChange={handlePickFile('video/*', 500, 'video')} />
          <label htmlFor='dm-vid' title='Send video' className='mr-2 cursor-pointer text-gray-400 hover:text-white text-sm'>🎬</label>
          {/* Audio */}
          <input type='file' id='dm-aud' accept='audio/*' hidden onChange={handlePickFile('audio/*', 50, 'audio')} />
          <label htmlFor='dm-aud' title='Send audio' className='mr-2 cursor-pointer text-gray-400 hover:text-white text-sm'>🎵</label>
          {/* Any file */}
          <input type='file' id='dm-doc' accept='*/*' hidden onChange={handlePickFile(null, 100, 'file')} />
          <label htmlFor='dm-doc' title='Send file' className='mr-1 cursor-pointer text-gray-400 hover:text-white text-sm'>📎</label>
        </div>
        <button onClick={handleSendMessage} disabled={sending} className='disabled:opacity-50'>
          <img src={assets.send_button} alt='' className='w-7 cursor-pointer' />
        </button>
      </div>
      {/* </div> */}
      {/* Delete context menu */} 
      {
        deleteMenu && (
          <>
            {/* Invisible backdrop to close menu */}
            <div
              className='fixed inset-0 z-40'
              onContextMenu={(e) => { e.preventDefault(); setDeleteMenu(null); }}
              onClick={() => setDeleteMenu(null)}
            />
            {/* Context menu */}
            <div
              className='fixed z-50 bg-[#1e1b3a] border border-violet-800/60 rounded-2xl shadow-2xl overflow-hidden'
              style={{ top: deleteMenu.y, left: deleteMenu.x, minWidth: 190 }}
            >
              <p className='text-gray-400 text-[11px] font-semibold uppercase tracking-wider px-4 pt-3 pb-2'>
                {deleteMenu.isOwn ? 'Delete message' : 'Remove message'}
              </p>
              {/* Delete for me — available to EVERYONE (sender and receiver) */}
              <button
                onClick={() => handleDelete('me')}
                className='w-full text-left px-4 py-2.5 text-white text-sm hover:bg-white/10 active:bg-white/20 transition-colors flex items-center gap-3 border-t border-gray-700/50'
              >
                <span className='text-base'>🙈</span>
                <div>
                  <p className='font-medium'>Delete for me</p>
                  <p className='text-gray-400 text-xs'>Only removed from your view</p>
                </div>
              </button>
              {/* Delete for everyone — ONLY for sender */}
              {deleteMenu.isOwn && (
                <button
                  onClick={() => handleDelete('everyone')}
                  className='w-full text-left px-4 py-2.5 text-red-400 text-sm hover:bg-red-500/10 active:bg-red-500/20 transition-colors flex items-center gap-3 border-t border-gray-700/50'
                >
                  <span className='text-base'>🗑️</span>
                  <div>
                    <p className='font-medium'>Delete for everyone</p>
                    <p className='text-red-400/60 text-xs'>Removed for all parties</p>
                  </div>
                </button>
              )}
              <div className='pb-1' />
            </div>
          </>
        )
      }
    </div>
  ) : (
    <div className='flex flex-col items-center justify-center gap-2 text-gray-500 bg-white/10 max-md:hidden'>
      <img src={assets.logo_icon} alt='' className='max-w-16' />
      <p className='text-lg font-medium text-white'>Chat anytime, anywhere</p>
    </div>
  );

};

export default ChatContainer;
