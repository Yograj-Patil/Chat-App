import React, { useContext, useEffect, useState } from 'react';
import assets from '../assets/assets';
import { useNavigate } from 'react-router-dom';
import { ChatContext } from '../../context/ChatContext.jsx';
import { AuthContext } from '../../context/AuthContext.jsx';
import CreateGroupModal from './CreateGroupModal.jsx';
import AddPeoplePanel from './AddPeoplePanel.jsx';
import FriendRequestsPanel from './FriendRequestsPanel.jsx';

const Sidebar = () => {
  const {
    getUsers, users, selectedUser, setSelectedUser, unseenMessages, setUnseenMessages,
    groups, getGroups, selectedGroup, setSelectedGroup, unseenGroupMessages, setUnseenGroupMessages,
  } = useContext(ChatContext);

  const { logout, onlineUsers, socket, authUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('chats');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showAddPeople, setShowAddPeople] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);

  const filteredUsers = search
    ? users.filter((u) => u.fullName.toLowerCase().includes(search.toLowerCase()))
    : users;

  const filteredGroups = search
    ? groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()))
    : groups;

  // Fetch pending friend request count for badge
  const { axios } = useContext(AuthContext);
  const fetchRequestCount = async () => {
    try {
      const { data } = await axios.get('/api/friends/incoming-requests');
      if (data.success) setPendingRequestCount(data.requests.length);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    getUsers();
    getGroups();
    fetchRequestCount();
  }, [onlineUsers]);

  // Listen for real-time friend request notifications
  useEffect(() => {
    if (!socket) return;

    socket.on('newFriendRequest', ({ sender }) => {
      setPendingRequestCount((p) => p + 1);
    });

    socket.on('friendRequestAccepted', ({ by }) => {
      getUsers(); // refresh contacts list
    });

    return () => {
      socket.off('newFriendRequest');
      socket.off('friendRequestAccepted');
    };
  }, [socket]);

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setSelectedGroup(null);
    setUnseenMessages((prev) => ({ ...prev, [user._id]: 0 }));
  };

  const handleSelectGroup = (group) => {
    setSelectedGroup(group);
    setSelectedUser(null);
    setUnseenGroupMessages((prev) => ({ ...prev, [group._id]: 0 }));
  };

  const handleRequestsClose = () => {
    setShowRequests(false);
    fetchRequestCount();
  };

  const handleRequestAccepted = () => {
    getUsers(); // refresh contacts
    fetchRequestCount();
  };

  return (
    <>
      <div className={`bg-[#8185B2]/10 h-full p-5 rounded-r-xl overflow-y-scroll text-white flex flex-col
        ${(selectedUser || selectedGroup) ? 'max-md:hidden' : ''}`}>

        {/* Logo + menu */}
        <div className='pb-4'>
          <div className='flex justify-between items-center'>
            <img src={assets.logo} alt='logo' className='max-w-40' />
            <div className='relative py-2 group'>
              <img src={assets.menu_icon} alt='Menu' className='max-h-5 cursor-pointer' />
              <div className='absolute top-full right-0 z-20 w-40 p-4 rounded-md bg-[#282142] border border-gray-600 text-gray-100 hidden group-hover:block'>
                <p onClick={() => navigate('/profile')} className='cursor-pointer text-sm hover:text-white py-1'>Edit Profile</p>
                <p onClick={() => setShowAddPeople(true)} className='cursor-pointer text-sm hover:text-white py-1'>Add People</p>
                <p onClick={() => { setShowRequests(true); }} className='cursor-pointer text-sm hover:text-white py-1 flex items-center gap-2'>
                  Friend Requests
                  {pendingRequestCount > 0 && (
                    <span className='bg-violet-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center'>
                      {pendingRequestCount}
                    </span>
                  )}
                </p>
                <hr className='my-2 border-t border-gray-500' />
                <p onClick={logout} className='cursor-pointer text-sm hover:text-white py-1'>Logout</p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className='bg-[#282142] rounded-full flex items-center gap-2 py-3 px-4 mt-4'>
            <img src={assets.search_icon} alt='' className='w-3' />
            <input
              onChange={(e) => setSearch(e.target.value)}
              type='text'
              className='bg-transparent border-none outline-none text-white text-xs placeholder-[#c8c8c8] flex-1'
              placeholder={activeTab === 'chats' ? 'Search contacts...' : 'Search groups...'}
              value={search}
            />
          </div>

          {/* Tabs */}
          <div className='flex mt-4 bg-[#282142] rounded-full overflow-hidden'>
            <button
              onClick={() => setActiveTab('chats')}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${activeTab === 'chats' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Contacts
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${activeTab === 'groups' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Groups
            </button>
          </div>

          {/* Friend request notification strip */}
          {pendingRequestCount > 0 && (
            <div
              onClick={() => setShowRequests(true)}
              className='mt-3 flex items-center gap-2 bg-violet-600/20 border border-violet-500/40 rounded-xl px-3 py-2 cursor-pointer hover:bg-violet-600/30 transition-colors'
            >
              <span className='text-sm'>🤝</span>
              <p className='text-violet-300 text-xs flex-1'>
                {pendingRequestCount} pending friend request{pendingRequestCount > 1 ? 's' : ''}
              </p>
              <span className='text-violet-400 text-xs'>View →</span>
            </div>
          )}
        </div>

        {/* List */}
        <div className='flex flex-col flex-1 overflow-y-auto'>
          {activeTab === 'chats' ? (
            <>
              {filteredUsers.length === 0 && (
                <div className='flex flex-col items-center gap-2 mt-8 text-gray-500'>
                  <span className='text-3xl'>👥</span>
                  <p className='text-xs text-center'>No contacts yet</p>
                  <button
                    onClick={() => setShowAddPeople(true)}
                    className='text-xs text-violet-400 hover:text-violet-300 border border-violet-500/40 rounded-full px-3 py-1 mt-1 hover:border-violet-500 transition-colors'
                  >
                    + Add People
                  </button>
                </div>
              )}
              {filteredUsers.map((user, index) => (
                <div
                  onClick={() => handleSelectUser(user)}
                  key={index}
                  className={`relative flex items-center gap-2 p-2 pl-4 rounded cursor-pointer max-sm:text-sm hover:bg-[#282142]/50 transition-colors
                    ${selectedUser?._id === user._id ? 'bg-[#282142]/50' : ''}`}
                >
                  <img src={user?.profilePic || assets.avatar_icon} alt='' className='w-[35px] aspect-square rounded-full object-cover' />
                  <div className='flex flex-col leading-5 min-w-0'>
                    <p className='truncate'>{user.fullName}</p>
                    {onlineUsers.includes(user._id)
                      ? <span className='text-green-400 text-xs'>Online</span>
                      : <span className='text-neutral-400 text-xs'>Offline</span>
                    }
                  </div>
                  {unseenMessages[user._id] > 0 && (
                    <p className='absolute top-4 right-4 text-xs h-5 w-5 flex justify-center items-center rounded-full bg-violet-500/80'>
                      {unseenMessages[user._id]}
                    </p>
                  )}
                </div>
              ))}
            </>
          ) : (
            <>
              <button
                onClick={() => setShowCreateGroup(true)}
                className='flex items-center gap-2 p-2 pl-4 rounded cursor-pointer text-violet-400 hover:bg-[#282142]/50 transition-colors mb-1 border border-dashed border-violet-500/40 hover:border-violet-500'
              >
                <span className='text-lg'>+</span>
                <span className='text-sm'>Create New Group</span>
              </button>

              {filteredGroups.length === 0 && (
                <p className='text-gray-500 text-xs text-center mt-6'>No groups yet. Create one!</p>
              )}

              {filteredGroups.map((group, index) => (
                <div
                  onClick={() => handleSelectGroup(group)}
                  key={index}
                  className={`relative flex items-center gap-2 p-2 pl-4 rounded cursor-pointer max-sm:text-sm hover:bg-[#282142]/50 transition-colors
                    ${selectedGroup?._id === group._id ? 'bg-[#282142]/50' : ''}`}
                >
                  <div className='w-[35px] h-[35px] rounded-full bg-violet-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden'>
                    {group.groupPic
                      ? <img src={group.groupPic} alt='' className='w-full h-full object-cover' />
                      : group.name[0].toUpperCase()
                    }
                  </div>
                  <div className='flex flex-col leading-5 min-w-0'>
                    <p className='truncate'>{group.name}</p>
                    <span className='text-neutral-400 text-xs'>{group.members.length} members</span>
                  </div>
                  {unseenGroupMessages[group._id] > 0 && (
                    <p className='absolute top-4 right-4 text-xs h-5 w-5 flex justify-center items-center rounded-full bg-violet-500/80'>
                      {unseenGroupMessages[group._id]}
                    </p>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {showCreateGroup && <CreateGroupModal onClose={() => setShowCreateGroup(false)} />}
      {showAddPeople && <AddPeoplePanel onClose={() => setShowAddPeople(false)} />}
      {showRequests && (
        <FriendRequestsPanel
          onClose={handleRequestsClose}
          onAccepted={handleRequestAccepted}
        />
      )}
    </>
  );
};

export default Sidebar;
