import React from 'react';

function UserSelector({ users, selectedUser, onSelectUser }) {
  return (
    <div className="relative">
      <select
        id="user-select"
        value={selectedUser}
        onChange={(e) => onSelectUser(e.target.value)}
        className="github-input appearance-none pr-8">
        {users.map(user => (
          <option key={user} value={user}>{user}</option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-github-text">
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </div>
    </div>
  );
}

export default UserSelector;
