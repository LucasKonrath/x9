
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';

function MarkdownPosts({ posts, onEdit }) {
    // State to track which posts are expanded
    const [expandedPosts, setExpandedPosts] = useState({});

    // Toggle expanded state for a post
    const togglePost = (postIndex) => {
        setExpandedPosts(prev => ({
            ...prev,
            [postIndex]: !prev[postIndex]
        }));
    };

    if (!posts || posts.length === 0) {
        return (
            <div className="mt-8">
                <h2 className="text-2xl font-bold text-white mb-4">Meeting Notes</h2>
                <p className="text-gray-400">No meeting notes found.</p>
            </div>
        );
    }

    return (
        <div className="mt-8">
            <h2 className="text-2xl font-bold text-white mb-4">
                Meeting Notes
                <span className="text-sm font-normal text-gray-400 ml-2">(click to expand/collapse)</span>
            </h2>
            <div className="space-y-4">
                {posts.map((post, index) => (
                    <div key={index} className="bg-[#1e293b] border border-[#334155] rounded-lg overflow-hidden transition-all duration-300">
                        <div 
                            className="flex justify-between items-center p-4 cursor-pointer hover:bg-[#2d3748] transition-colors duration-200 select-none"
                            onClick={() => togglePost(index)}
                            title={expandedPosts[index] ? 'Click to collapse' : 'Click to expand'}
                        >
                            <div className="flex items-center space-x-4">
                                <div className="flex items-center">
                                    <svg 
                                        xmlns="http://www.w3.org/2000/svg" 
                                        className={`h-5 w-5 text-[#4ade80] transition-transform duration-300 ${expandedPosts[index] ? 'transform rotate-90' : ''}`}
                                        viewBox="0 0 20 20" 
                                        fill="currentColor"
                                    >
                                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                    </svg>
                                    <h3 className="text-xl font-semibold text-white ml-2">{post.title}</h3>
                                </div>
                                <span className="text-sm text-gray-400">{post.date}</span>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent triggering the parent onClick
                                    console.log('Edit button clicked for post:', post);
                                    onEdit(post);
                                }}
                                className="px-3 py-1 bg-[#334155] text-[#4ade80] border border-[#22c55e] rounded-md hover:bg-[#475569] transition-colors duration-200 text-sm"
                            >
                                Edit
                            </button>
                        </div>

                        {/* Collapsible content */}
                        <div 
                            className={`overflow-hidden ${expandedPosts[index] ? 'post-expand' : 'post-collapse'}`}
                        >
                            <div className="p-4 pt-0 border-t border-[#334155]">
                                <div className="prose prose-invert prose-green max-w-none">
                                    <ReactMarkdown>{post.content}</ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default MarkdownPosts;