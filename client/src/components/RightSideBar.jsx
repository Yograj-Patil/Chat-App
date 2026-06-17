import React, { useContext, useEffect, useState } from 'react';
import assets from '../assets/assets';
import { ChatContext } from '../../context/ChatContext';
import { AuthContext } from '../../context/AuthContext';

const FileIcon = ({ type }) => {
  if (!type) return <span>📄</span>;
  if (type.startsWith('video')) return <span>🎬</span>;
  if (type.startsWith('audio')) return <span>🎵</span>;
  if (type.includes('pdf')) return <span>📕</span>;
  return <span>📄</span>;
};

const RightSideBar = () => {
  const { selectedUser, messages, selectedGroup, groupMessages } = useContext(ChatContext);
  const { logout, onlineUsers } = useContext(AuthContext);

  const [msgImages, setMsgImages] = useState([]);
  const [msgVideos, setMsgVideos] = useState([]);
  const [msgFiles, setMsgFiles] = useState([]);
  const [mediaTab, setMediaTab] = useState('images');

  const activeMessages = selectedGroup ? groupMessages : messages;

  useEffect(() => {
    setMsgImages(activeMessages.filter((m) => m.image).map((m) => m.image));
    setMsgVideos(activeMessages.filter((m) => m.video).map((m) => m.video));
    setMsgFiles(activeMessages.filter((m) => m.file).map((m) => m.file));
  }, [activeMessages]);

  // Show for direct chat
  if (selectedUser) {
    return (
      <div className='bg-[#8185B2]/10 text-white w-full relative overflow-y-scroll max-md:hidden'>
        {/* Profile */}
        <div className='pt-16 flex flex-col items-center gap-2 text-xs font-light mx-auto'>
          <img
            src={selectedUser?.profilePic || assets.avatar_icon}
            alt=''
            className='w-20 aspect-square rounded-full object-cover'
          />
          <h1 className='px-10 text-xl font-medium mx-auto flex items-center gap-2'>
            {onlineUsers.includes(selectedUser._id) && (
              <p className='w-2 h-2 rounded-full bg-green-500'></p>
            )}
            {selectedUser.fullName}
          </h1>
          <p className='px-10 mx-auto text-center text-gray-400'>{selectedUser.bio}</p>
        </div>

        <hr className='border-[#ffffff50] my-4' />

        {/* Media tabs */}
        <div className='px-5'>
          <div className='flex gap-1 mb-3 bg-[#282142] rounded-full overflow-hidden'>
            {['images', 'videos', 'files'].map((tab) => (
              <button
                key={tab}
                onClick={() => setMediaTab(tab)}
                className={`flex-1 py-1.5 text-xs capitalize transition-colors ${mediaTab === tab ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                {tab} {tab === 'images' ? `(${msgImages.length})` : tab === 'videos' ? `(${msgVideos.length})` : `(${msgFiles.length})`}
              </button>
            ))}
          </div>

          {mediaTab === 'images' && (
            <div className='grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto'>
              {msgImages.length === 0 && <p className='text-gray-500 text-xs col-span-2 text-center mt-2'>No images yet</p>}
              {msgImages.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt=''
                  onClick={() => window.open(url)}
                  className='rounded-lg cursor-pointer hover:opacity-90 transition-opacity object-cover aspect-square w-full'
                />
              ))}
            </div>
          )}

          {mediaTab === 'videos' && (
            <div className='flex flex-col gap-2 max-h-[220px] overflow-y-auto'>
              {msgVideos.length === 0 && <p className='text-gray-500 text-xs text-center mt-2'>No videos yet</p>}
              {msgVideos.map((url, i) => (
                <video
                  key={i}
                  src={url}
                  controls
                  className='rounded-lg w-full border border-gray-700'
                />
              ))}
            </div>
          )}

          {mediaTab === 'files' && (
            <div className='flex flex-col gap-2 max-h-[220px] overflow-y-auto'>
              {msgFiles.length === 0 && <p className='text-gray-500 text-xs text-center mt-2'>No files yet</p>}
              {msgFiles.map((file, i) => (
                <a
                  key={i}
                  href={file.url}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='flex items-center gap-2 bg-white/10 border border-gray-700 rounded-lg p-2 hover:bg-white/20 transition-colors'
                >
                  <span><FileIcon type={file.type} /></span>
                  <div className='flex flex-col min-w-0 flex-1'>
                    <span className='text-white text-xs truncate'>{file.name}</span>
                    <span className='text-gray-400 text-xs'>{file.size ? (file.size / 1024).toFixed(1) + ' KB' : ''}</span>
                  </div>
                  <span className='text-gray-400 text-xs'>↓</span>
                </a>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={logout}
          className='absolute bottom-5 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-500 to-violet-600 text-white border-none text-sm font-light py-2 px-16 rounded-full cursor-pointer hover:opacity-90 transition-opacity whitespace-nowrap'
        >
          Logout
        </button>
      </div>
    );
  }

  // Show for group chat
  if (selectedGroup) {
    return (
      <div className='bg-[#8185B2]/10 text-white w-full relative overflow-y-scroll max-md:hidden'>
        {/* Group Info */}
        <div className='pt-10 flex flex-col items-center gap-2 text-xs font-light mx-auto'>
          <div className='w-20 h-20 rounded-full bg-violet-700 flex items-center justify-center text-white text-2xl font-bold overflow-hidden'>
            {selectedGroup.groupPic
              ? <img src={selectedGroup.groupPic} alt='' className='w-full h-full object-cover' />
              : selectedGroup.name[0].toUpperCase()
            }
          </div>
          <h1 className='px-6 text-xl font-medium text-center'>{selectedGroup.name}</h1>
          {selectedGroup.description && (
            <p className='px-6 text-gray-400 text-center'>{selectedGroup.description}</p>
          )}
          <p className='text-gray-400'>{selectedGroup.members.length} members</p>
        </div>

        <hr className='border-[#ffffff50] my-4' />

        {/* Members list */}
        <div className='px-5'>
          <p className='text-xs text-gray-400 mb-2'>Members</p>
          <div className='flex flex-col gap-1 max-h-36 overflow-y-auto mb-4'>
            {selectedGroup.members.map((member, i) => (
              <div key={i} className='flex items-center gap-2 py-1'>
                <img src={member.profilePic || assets.avatar_icon} alt='' className='w-7 h-7 rounded-full object-cover' />
                <div className='flex-1 min-w-0'>
                  <p className='text-white text-xs truncate'>{member.fullName}</p>
                  {selectedGroup.admin._id === member._id && (
                    <span className='text-violet-400 text-xs'>Admin</span>
                  )}
                </div>
                {onlineUsers.includes(member._id) && (
                  <span className='w-2 h-2 rounded-full bg-green-500 flex-shrink-0'></span>
                )}
              </div>
            ))}
          </div>

          {/* Media tabs */}
          <div className='flex gap-1 mb-3 bg-[#282142] rounded-full overflow-hidden'>
            {['images', 'videos', 'files'].map((tab) => (
              <button
                key={tab}
                onClick={() => setMediaTab(tab)}
                className={`flex-1 py-1.5 text-xs capitalize transition-colors ${mediaTab === tab ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {mediaTab === 'images' && (
            <div className='grid grid-cols-2 gap-2 max-h-[180px] overflow-y-auto'>
              {msgImages.length === 0 && <p className='text-gray-500 text-xs col-span-2 text-center mt-2'>No images</p>}
              {msgImages.map((url, i) => (
                <img key={i} src={url} alt='' onClick={() => window.open(url)} className='rounded-lg cursor-pointer hover:opacity-90 object-cover aspect-square w-full' />
              ))}
            </div>
          )}
          {mediaTab === 'videos' && (
            <div className='flex flex-col gap-2 max-h-[180px] overflow-y-auto'>
              {msgVideos.length === 0 && <p className='text-gray-500 text-xs text-center mt-2'>No videos</p>}
              {msgVideos.map((url, i) => (
                <video key={i} src={url} controls className='rounded-lg w-full border border-gray-700' />
              ))}
            </div>
          )}
          {mediaTab === 'files' && (
            <div className='flex flex-col gap-2 max-h-[180px] overflow-y-auto'>
              {msgFiles.length === 0 && <p className='text-gray-500 text-xs text-center mt-2'>No files</p>}
              {msgFiles.map((file, i) => (
                <a key={i} href={file.url} target='_blank' rel='noopener noreferrer'
                  className='flex items-center gap-2 bg-white/10 border border-gray-700 rounded-lg p-2 hover:bg-white/20 transition-colors'>
                  <span><FileIcon type={file.type} /></span>
                  <div className='flex flex-col min-w-0 flex-1'>
                    <span className='text-white text-xs truncate'>{file.name}</span>
                  </div>
                  <span className='text-gray-400 text-xs'>↓</span>
                </a>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={logout}
          className='absolute bottom-5 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-500 to-violet-600 text-white border-none text-sm font-light py-2 px-16 rounded-full cursor-pointer hover:opacity-90 transition-opacity whitespace-nowrap'
        >
          Logout
        </button>
      </div>
    );
  }

  return null;
};

export default RightSideBar;
