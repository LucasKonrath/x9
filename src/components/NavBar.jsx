import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const NavBar = ({ activeTab, onTabChange, tabs }) => {
  const { theme } = useTheme();

  return (
    <div className={`border-b transition-colors duration-300 ${
      theme === 'dark' ? 'border-github-border bg-github-dark' : 'border-gray-200 bg-white'
    }`}>
      <div className="container mx-auto px-4">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors duration-200 flex items-center space-x-2 ${
                activeTab === tab.id
                  ? theme === 'dark'
                    ? 'border-github-green text-github-green'
                    : 'border-blue-500 text-blue-600'
                  : theme === 'dark'
                    ? 'border-transparent text-gray-400 hover:text-github-text hover:border-gray-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                  theme === 'dark' 
                    ? 'bg-github-green/20 text-github-green' 
                    : 'bg-blue-100 text-blue-600'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default NavBar;
