import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { ChatContext } from '../../context/ChatContext';
import assets from '../assets/assets';
import toast from 'react-hot-toast';

const FriendRequestsPanel = ({ onClose, onAccepted }) => {
  const { axios } = useContext(AuthContext);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState({}); // { requestId: true }

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/friends/incoming-requests');
      if (data.success) setRequests(data.requests);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleRespond = async (requestId, action) => {
    setActing((p) => ({ ...p, [requestId]: true }));
    try {
      const { data } = await axios.put('/api/friends/respond', { requestId, action });
      if (data.success) {
        toast.success(action === 'accept' ? 'Friend added! 🎉' : 'Request rejected');
        setRequests((prev) => prev.filter((r) => r._id !== requestId));
        if (action === 'accept') onAccepted?.(); // refresh contacts in sidebar
      } else {
        toast.error(data.message);
      }
    } catch { toast.error('Something went wrong'); }
    setActing((p) => ({ ...p, [requestId]: false }));
  };

  return (
    <div className='fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4'>
      <div className='bg-[#1a1a2e] border border-gray-600 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[85vh]'>

        {/* Header */}
        <div className='flex items-center justify-between p-5 border-b border-gray-700'>
          <div>
            <h2 className='text-white text-lg font-semibold'>Friend Requests</h2>
            <p className='text-gray-400 text-xs mt-0.5'>
              {requests.length === 0 ? 'No pending requests' : `${requests.length} pending`}
            </p>
          </div>
          <button onClick={onClose} className='text-gray-400 hover:text-white text-2xl leading-none'>×</button>
        </div>

        {/* List */}
        <div className='flex-1 overflow-y-auto p-4 flex flex-col gap-3'>
          {loading && (
            <p className='text-gray-400 text-sm text-center mt-8 animate-pulse'>Loading requests...</p>
          )}
          {!loading && requests.length === 0 && (
            <div className='flex flex-col items-center gap-3 mt-8 text-gray-500'>
              <span className='text-4xl'>🤝</span>
              <p className='text-sm'>No pending friend requests</p>
              <p className='text-xs text-gray-600'>When someone adds you, they'll appear here</p>
            </div>
          )}
          {requests.map((req) => (
            <div key={req._id}
              className='flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-gray-700'>
              <img
                src={req.sender.profilePic || assets.avatar_icon}
                alt=''
                className='w-11 h-11 rounded-full object-cover flex-shrink-0'
              />
              <div className='flex-1 min-w-0'>
                <p className='text-white font-medium text-sm truncate'>{req.sender.fullName}</p>
                <p className='text-gray-400 text-xs truncate'>{req.sender.email}</p>
                {req.sender.bio && (
                  <p className='text-gray-500 text-xs truncate mt-0.5'>{req.sender.bio}</p>
                )}
              </div>
              <div className='flex gap-2 flex-shrink-0'>
                <button
                  onClick={() => handleRespond(req._id, 'accept')}
                  disabled={acting[req._id]}
                  className='px-3 py-1.5 rounded-full bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium transition-colors disabled:opacity-50'
                >
                  Accept
                </button>
                <button
                  onClick={() => handleRespond(req._id, 'reject')}
                  disabled={acting[req._id]}
                  className='px-3 py-1.5 rounded-full border border-gray-600 hover:border-red-500 text-gray-300 hover:text-red-400 text-xs transition-colors disabled:opacity-50'
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FriendRequestsPanel;
