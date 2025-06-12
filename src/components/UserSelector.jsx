import React from 'react';

function UserSelector({ users, selectedUser, onSelectUser }) {
  return (
    <div className="mb-6">
      <label htmlFor="user-select" className="block text-sm font-medium text-gray-700 mb-2">
        Select GitHub User
      </label>
      <div className="relative">
        <select
          id="user-select"
          value={selectedUser}
          onChange={(e) => onSelectUser(e.target.value)}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3 bg-white border">
          {users.map(user => (
            <option key={user} value={user}>{user}</option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
          </svg>
        </div>
      </div>
    </div>
  );
}

export default UserSelector;
