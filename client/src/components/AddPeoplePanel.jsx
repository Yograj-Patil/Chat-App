import React, { useContext, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import assets from '../assets/assets';
import toast from 'react-hot-toast';

const StatusBadge = ({ status }) => {
  if (status === 'friends') return <span className='text-xs text-green-400 font-medium'>✓ Friends</span>;
  if (status === 'requestSent') return <span className='text-xs text-yellow-400 font-medium'>Request Sent</span>;
  if (status === 'requestReceived') return <span className='text-xs text-violet-400 font-medium'>Wants to connect</span>;
  return null;
};

const AddPeoplePanel = ({ onClose }) => {
  const { axios } = useContext(AuthContext);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState({}); // { userId: true }

  const handleSearch = async (e) => {
    const val = e.target.value;
    setQuery(val);
    if (val.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const { data } = await axios.get(`/api/friends/search?query=${encodeURIComponent(val)}`);
      if (data.success) setResults(data.users);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleSendRequest = async (userId) => {
    setSending((p) => ({ ...p, [userId]: true }));
    try {
      const { data } = await axios.post('/api/friends/send-request', { receiverId: userId });
      if (data.success) {
        toast.success('Friend request sent!');
        setResults((prev) => prev.map((u) =>
          u._id === userId ? { ...u, friendStatus: 'requestSent' } : u
        ));
      } else {
        toast.error(data.message);
      }
    } catch { toast.error('Failed to send request'); }
    setSending((p) => ({ ...p, [userId]: false }));
  };

  return (
    <div className='fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4'>
      <div className='bg-[#1a1a2e] border border-gray-600 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[85vh]'>

        {/* Header */}
        <div className='flex items-center justify-between p-5 border-b border-gray-700'>
          <div>
            <h2 className='text-white text-lg font-semibold'>Add People</h2>
            <p className='text-gray-400 text-xs mt-0.5'>Search by name or email</p>
          </div>
          <button onClick={onClose} className='text-gray-400 hover:text-white text-2xl leading-none'>×</button>
        </div>

        {/* Search input */}
        <div className='p-4 border-b border-gray-700'>
          <div className='flex items-center gap-2 bg-white/10 border border-gray-600 rounded-full px-4 py-2'>
            <img src={assets.search_icon} alt='' className='w-3 opacity-60' />
            <input
              type='text'
              value={query}
              onChange={handleSearch}
              placeholder='Search name or email...'
              autoFocus
              className='flex-1 bg-transparent text-white text-sm outline-none placeholder-gray-400'
            />
            {loading && <span className='text-gray-400 text-xs animate-pulse'>...</span>}
          </div>
        </div>

        {/* Results */}
        <div className='flex-1 overflow-y-auto p-4 flex flex-col gap-2'>
          {query.length < 2 && (
            <p className='text-gray-500 text-sm text-center mt-8'>
              Type at least 2 characters to search for people
            </p>
          )}
          {query.length >= 2 && !loading && results.length === 0 && (
            <p className='text-gray-500 text-sm text-center mt-8'>No users found for "{query}"</p>
          )}
          {results.map((user) => (
            <div key={user._id}
              className='flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-gray-700 hover:bg-white/10 transition-colors'>
              <img
                src={user.profilePic || assets.avatar_icon}
                alt=''
                className='w-10 h-10 rounded-full object-cover flex-shrink-0'
              />
              <div className='flex-1 min-w-0'>
                <p className='text-white font-medium text-sm truncate'>{user.fullName}</p>
                <p className='text-gray-400 text-xs truncate'>{user.email}</p>
                <StatusBadge status={user.friendStatus} />
              </div>

              {/* Action button */}
              {user.friendStatus === 'none' && (
                <button
                  onClick={() => handleSendRequest(user._id)}
                  disabled={sending[user._id]}
                  className='text-xs px-3 py-1.5 rounded-full bg-violet-600 hover:bg-violet-700 text-white font-medium transition-colors disabled:opacity-50 whitespace-nowrap'
                >
                  {sending[user._id] ? '...' : '+ Add'}
                </button>
              )}
              {user.friendStatus === 'requestSent' && (
                <span className='text-xs px-3 py-1.5 rounded-full border border-yellow-600 text-yellow-400 whitespace-nowrap'>Pending</span>
              )}
              {user.friendStatus === 'friends' && (
                <span className='text-xs px-3 py-1.5 rounded-full border border-green-600 text-green-400 whitespace-nowrap'>Friends</span>
              )}
              {user.friendStatus === 'requestReceived' && (
                <span className='text-xs text-violet-300 whitespace-nowrap'>Check requests</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AddPeoplePanel;
