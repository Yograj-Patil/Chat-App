import React, { useContext, useEffect, useRef, useState } from 'react';
import assets from '../assets/assets';
import { formatMessageTime } from '../lib/utils';
import { ChatContext } from '../../context/ChatContext';
import { AuthContext } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const FileIcon = ({ type = '' }) => {
  if (type.startsWith('audio')) return <span>🎵</span>;
  if (type.startsWith('video')) return <span>🎬</span>;
  if (type.includes('pdf')) return <span>📕</span>;
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

const DateSeparator = ({ label }) => (
  <div className='flex items-center gap-3 my-3'>
    <div className='flex-1 h-px bg-gray-600/50'></div>
    <span className='text-gray-400 text-xs bg-gray-800/60 px-3 py-1 rounded-full border border-gray-600/40'>{label}</span>
    <div className='flex-1 h-px bg-gray-600/50'></div>
  </div>
);

const UploadProgress = ({ progress, label }) => (
  <div className='flex flex-col gap-1 px-3 pb-2'>
    <div className='flex items-center justify-between text-xs text-gray-400'>
      <span>{label}</span><span>{progress}%</span>
    </div>
    <div className='h-1.5 bg-gray-700 rounded-full overflow-hidden'>
      <div className='h-full bg-violet-500 rounded-full transition-all duration-200' style={{ width: `${progress}%` }} />
    </div>
  </div>
);

const GroupChatContainer = () => {
  const {
    groupMessages, selectedGroup, setSelectedGroup,
    sendGroupMessage, getGroupMessages, deleteGroup, deleteGroupMessage,
  } = useContext(ChatContext);
  const { authUser } = useContext(AuthContext);

  const scrollEnd = useRef();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [showMembers, setShowMembers] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteMenu, setDeleteMenu] = useState(null); // { messageId, isOwn, x, y }


  const isAdmin = selectedGroup?.admin?._id === authUser._id ||
                  selectedGroup?.admin === authUser._id;
  const grouped = groupByDate(groupMessages);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    setSending(true);
    await sendGroupMessage({ text: input.trim() });
    setInput('');
    setSending(false);
  };

  const handlePickFile = (accept, maxMB, label) => (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > maxMB * 1024 * 1024) { toast.error(`${label} must be under ${maxMB}MB`); return; }
    const formData = new FormData();
    formData.append('media', file);
    setSending(true);
    setUploadProgress({ label: `Uploading ${label}...`, percent: 0 });
    sendGroupMessage(formData, (percent) => setUploadProgress({ label: `Uploading ${label}...`, percent }))
      .then(() => { setUploadProgress(null); setSending(false); });
  };

  const handleDeleteGroup = async () => {
    await deleteGroup(selectedGroup._id);
    setShowDeleteConfirm(false);
  };

  const handleMessagePress = (e, msg, isOwn) => {
    e.preventDefault();
    e.stopPropagation();
    const x = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    const y = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
    const menuW = 200, menuH = isOwn ? 110 : 60;
    const safeX = x + menuW > window.innerWidth ? x - menuW : x;
    const safeY = y + menuH > window.innerHeight ? y - menuH : y;
    setDeleteMenu({ messageId: msg._id, isOwn, x: safeX, y: safeY });
  };

  const handleDelete = async (deleteFor) => {
    if (!deleteMenu) return;
    await deleteGroupMessage(deleteMenu.messageId, deleteFor);
    setDeleteMenu(null);
  };

  useEffect(() => {
    if (selectedGroup) getGroupMessages(selectedGroup._id);
  }, [selectedGroup]);

  useEffect(() => {
    if (scrollEnd.current) scrollEnd.current.scrollIntoView({ behavior: 'smooth' });
  }, [groupMessages]);

  return selectedGroup ? (
    <div className='h-full overflow-hidden relative backdrop-blur-lg flex flex-col'>
      {/* Header */}
      <div className='flex items-center gap-3 py-3 mx-4 border-b border-stone-500 flex-shrink-0'>
        <div className='w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden'>
          {selectedGroup.groupPic
            ? <img src={selectedGroup.groupPic} alt='' className='w-full h-full object-cover' />
            : selectedGroup.name[0].toUpperCase()}
        </div>
        <div className='flex-1 min-w-0'>
          <p className='text-white font-medium truncate'>{selectedGroup.name}</p>
          <p className='text-gray-400 text-xs'>{selectedGroup.members.length} members</p>
        </div>
        <button onClick={() => setShowMembers(!showMembers)}
          className='text-gray-400 hover:text-white text-xs px-2 py-1 rounded border border-gray-600 hover:border-gray-400 transition-colors'>
          Members
        </button>
        {isAdmin && (
          <button onClick={() => setShowDeleteConfirm(true)}
            className='text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded border border-red-700 hover:border-red-400 transition-colors'>
            Delete
          </button>
        )}
        <img onClick={() => setSelectedGroup(null)} src={assets.arrow_icon} alt='' className='md:hidden max-w-7 cursor-pointer' />
      </div>

      {/* Members panel */}
      {showMembers && (
        <div className='absolute top-16 right-0 z-30 w-64 bg-[#1a1a2e] border border-gray-600 rounded-lg shadow-xl p-4 max-h-80 overflow-y-auto'>
          <h3 className='text-white font-medium mb-3 text-sm'>Group Members</h3>
          {selectedGroup.members.map((member, i) => (
            <div key={i} className='flex items-center gap-2 py-2 border-b border-gray-700 last:border-0'>
              <img src={member.profilePic || assets.avatar_icon} alt='' className='w-7 h-7 rounded-full' />
              <div>
                <p className='text-white text-sm'>{member.fullName}</p>
                {(selectedGroup.admin._id === member._id || selectedGroup.admin === member._id) && (
                  <span className='text-violet-400 text-xs'>Admin</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div className='absolute inset-0 z-40 bg-black/70 flex items-center justify-center p-4'>
          <div className='bg-[#1a1a2e] border border-gray-600 rounded-xl p-6 max-w-xs w-full'>
            <h3 className='text-white font-semibold mb-2'>Delete Group?</h3>
            <p className='text-gray-400 text-sm mb-5'>
              Permanently delete <span className='text-white font-medium'>"{selectedGroup.name}"</span> and all its messages?
            </p>
            <div className='flex gap-3'>
              <button onClick={() => setShowDeleteConfirm(false)}
                className='flex-1 py-2 rounded-lg border border-gray-600 text-gray-300 hover:text-white text-sm transition-colors'>
                Cancel
              </button>
              <button onClick={handleDeleteGroup}
                className='flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors'>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className='flex flex-col flex-1 overflow-y-auto p-3 pb-2 gap-1' onClick={() => setShowMembers(false)}>
        {grouped.map(({ label, messages: dayMsgs }) => (
          <div key={label}>
            <DateSeparator label={label} />
            <div className='flex flex-col gap-3'>
              {dayMsgs.map((msg, index) => {
                const senderId = msg.senderId?._id?.toString() || msg.senderId?.toString();
                const isOwn = senderId === authUser._id?.toString();
                const senderInfo = msg.senderId?._id ? msg.senderId : null;

                // Deleted for everyone placeholder
                if (msg.deletedForEveryone) {
                  return (
                    <div key={index} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <p className='text-gray-500 text-xs italic px-3 py-2 border border-gray-700 rounded-lg'>
                        🚫 {isOwn ? 'You deleted this message' : 'This message was deleted'}
                      </p>
                    </div>
                  );
                }

                return (
                  <div
                    key={index}
                    className='select-none'
                    onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); handleMessagePress(e, msg, isOwn); }}
                    onTouchStart={(e) => {
                      const timer = setTimeout(() => handleMessagePress(e, msg, isOwn), 600);
                      e.currentTarget._longPressTimer = timer;
                    }}
                    onTouchEnd={(e) => clearTimeout(e.currentTarget._longPressTimer)}
                    onTouchMove={(e) => clearTimeout(e.currentTarget._longPressTimer)}
                  >
                  <div className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    {!isOwn && (
                      <img src={senderInfo?.profilePic || assets.avatar_icon} alt='' className='w-7 h-7 rounded-full flex-shrink-0 mb-5' />
                    )}
                    <div className={`flex flex-col gap-1 max-w-[240px] ${isOwn ? 'items-end' : 'items-start'}`}>
                      {!isOwn && senderInfo && (
                        <span className='text-violet-400 text-xs font-medium'>{senderInfo.fullName}</span>
                      )}
                      {msg.image && <img src={msg.image} alt='' className='max-w-[220px] rounded-lg border border-gray-700' />}
                      {msg.video && (
                        <video controls className='max-w-[220px] rounded-lg border border-gray-700'>
                          <source src={msg.video} />
                        </video>
                      )}
                      {msg.audio && (
                        <audio controls className='max-w-[220px] rounded-lg' style={{ height: 40 }}>
                          <source src={msg.audio} />
                        </audio>
                      )}
                      {msg.file && (
                        <a href={msg.file.url} target='_blank' rel='noopener noreferrer'
                          className='flex items-center gap-2 bg-white/10 border border-gray-600 rounded-lg p-3 hover:bg-white/20 transition-colors'>
                          <span className='text-xl'><FileIcon type={msg.file.type} /></span>
                          <div className='flex flex-col min-w-0'>
                            <span className='text-white text-xs truncate max-w-[130px]'>{msg.file.name}</span>
                            <span className='text-gray-400 text-xs'>{formatFileSize(msg.file.size)}</span>
                          </div>
                          <span className='text-gray-400 text-xs'>↓</span>
                        </a>
                      )}
                      {msg.text && (
                        <p className={`p-2 text-sm rounded-lg break-all text-white
                          ${isOwn ? 'bg-violet-600/50 rounded-br-none' : 'bg-white/10 rounded-bl-none'}`}>
                          {msg.text}
                        </p>
                      )}
                      <p className='text-gray-500 text-xs'>{formatMessageTime(msg.createdAt)}</p>
                    </div>
                  </div>
                  {isOwn && (
                      <img src={authUser?.profilePic || assets.avatar_icon} alt='' className='w-7 h-7 rounded-full flex-shrink-0 mb-5' />
                    )}
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

      {/* Delete context menu */}
      {deleteMenu && (
        <>
          <div
            className='fixed inset-0 z-40'
            onContextMenu={(e) => { e.preventDefault(); setDeleteMenu(null); }}
            onClick={() => setDeleteMenu(null)}
          />
          <div
            className='fixed z-50 bg-[#1e1b3a] border border-violet-800/60 rounded-2xl shadow-2xl overflow-hidden'
            style={{ top: deleteMenu.y, left: deleteMenu.x, minWidth: 190 }}
          >
            <p className='text-gray-400 text-[11px] font-semibold uppercase tracking-wider px-4 pt-3 pb-2'>
              {deleteMenu.isOwn ? 'Delete message' : 'Remove message'}
            </p>
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
      )}

      {uploadProgress && <UploadProgress label={uploadProgress.label} progress={uploadProgress.percent} />}


      {/* Input */}
      <div className='flex items-center gap-2 p-3 flex-shrink-0 bg-black/10'>
        <div className='flex-1 flex items-center bg-gray-100/12 px-3 rounded-full'>
          <input
            onChange={(e) => setInput(e.target.value)} value={input}
            onKeyDown={(e) => e.key === 'Enter' ? handleSendMessage(e) : null}
            type='text' placeholder='Message group...'
            className='flex-1 text-sm p-3 border-none rounded-lg outline-none text-white placeholder-gray-400 bg-transparent'
          />
          <input type='file' id='grp-img' accept='image/*' hidden onChange={handlePickFile('image/*', 10, 'image')} />
          <label htmlFor='grp-img' title='Image' className='mr-2 cursor-pointer'>
            <img src={assets.gallery_icon} alt='' className='w-5 opacity-70 hover:opacity-100 transition-opacity' />
          </label>
          <input type='file' id='grp-vid' accept='video/*' hidden onChange={handlePickFile('video/*', 500, 'video')} />
          <label htmlFor='grp-vid' title='Video' className='mr-2 cursor-pointer text-gray-400 hover:text-white text-sm'>🎬</label>
          <input type='file' id='grp-aud' accept='audio/*' hidden onChange={handlePickFile('audio/*', 50, 'audio')} />
          <label htmlFor='grp-aud' title='Audio' className='mr-2 cursor-pointer text-gray-400 hover:text-white text-sm'>🎵</label>
          <input type='file' id='grp-doc' accept='*/*' hidden onChange={handlePickFile(null, 100, 'file')} />
          <label htmlFor='grp-doc' title='File' className='mr-1 cursor-pointer text-gray-400 hover:text-white text-sm'>📎</label>
        </div>
        <button onClick={handleSendMessage} disabled={sending} className='disabled:opacity-50'>
          <img src={assets.send_button} alt='' className='w-7 cursor-pointer' />
        </button>
      </div>
    </div>
  ) : (
    <div className='flex flex-col items-center justify-center gap-2 text-gray-500 bg-white/10 max-md:hidden'>
      <img src={assets.logo_icon} alt='' className='max-w-16' />
      <p className='text-lg font-medium text-white'>Select a group to chat</p>
    </div>
  );
};

export default GroupChatContainer;
