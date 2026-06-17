import React, { useContext, useState } from 'react';
import { ChatContext } from '../../context/ChatContext';
import assets from '../assets/assets';

const CreateGroupModal = ({ onClose }) => {
  const { users, createGroup } = useContext(ChatContext);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const filtered = search
    ? users.filter((u) => u.fullName.toLowerCase().includes(search.toLowerCase()))
    : users;

  const toggleMember = (userId) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) return alert('Please enter a group name');
    if (selectedMembers.length === 0) return alert('Select at least one member');
    setLoading(true);
    await createGroup({ name: name.trim(), description, members: selectedMembers });
    setLoading(false);
    onClose();
  };

  return (
    <div className='fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4'>
      <div className='bg-[#1a1a2e] border border-gray-600 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto'>
        <div className='flex items-center justify-between p-5 border-b border-gray-700'>
          <h2 className='text-white text-lg font-semibold'>Create New Group</h2>
          <button onClick={onClose} className='text-gray-400 hover:text-white text-xl leading-none'>×</button>
        </div>

        <div className='p-5 flex flex-col gap-4'>
          <div>
            <label className='text-gray-300 text-sm mb-1 block'>Group Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              type='text'
              placeholder='Enter group name'
              className='w-full bg-white/10 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-violet-500'
            />
          </div>

          <div>
            <label className='text-gray-300 text-sm mb-1 block'>Description (optional)</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              type='text'
              placeholder='Group description'
              className='w-full bg-white/10 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-violet-500'
            />
          </div>

          <div>
            <label className='text-gray-300 text-sm mb-2 block'>
              Add Members ({selectedMembers.length} selected)
            </label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              type='text'
              placeholder='Search users...'
              className='w-full bg-white/10 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-violet-500 mb-2'
            />
            <div className='flex flex-col gap-1 max-h-48 overflow-y-auto'>
              {filtered.map((user) => (
                <div
                  key={user._id}
                  onClick={() => toggleMember(user._id)}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                    selectedMembers.includes(user._id)
                      ? 'bg-violet-600/40 border border-violet-500'
                      : 'hover:bg-white/10 border border-transparent'
                  }`}
                >
                  <img
                    src={user.profilePic || assets.avatar_icon}
                    alt=''
                    className='w-8 h-8 rounded-full object-cover'
                  />
                  <span className='text-white text-sm flex-1'>{user.fullName}</span>
                  {selectedMembers.includes(user._id) && (
                    <span className='text-violet-400 text-xs'>✓</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className='p-5 border-t border-gray-700 flex gap-3'>
          <button
            onClick={onClose}
            className='flex-1 py-2 rounded-lg border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 text-sm transition-colors'
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={loading}
            className='flex-1 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors disabled:opacity-50'
          >
            {loading ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupModal;
