// src/components/MarkdownPosts.jsx
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { format, parse } from 'date-fns';

function MarkdownPost({ title, content, date }) {
    const [isExpanded, setIsExpanded] = useState(false);

    const parsedDate = parse(title.slice(0, 10), 'yyyy-MM-dd', new Date());
    const formattedDate = format(parsedDate, 'MMMM d, yyyy');

    return (
        <div className="border border-[#334155] rounded-lg mb-4 overflow-hidden bg-[#1e293b]">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-4 py-2 text-left bg-[#1e293b] hover:bg-[#334155] flex justify-between items-center"
            >
                <span className="font-medium text-[#4ade80]">{formattedDate}</span>
                <span className="text-gray-400">
          {isExpanded ? '▼' : '▶'}
        </span>
            </button>
            {isExpanded && (
                <div className="p-4 prose prose-invert max-w-none">
                    <ReactMarkdown>{content}</ReactMarkdown>
                </div>
            )}
        </div>
    );
}

export default function MarkdownPosts({ posts }) {
    if (!posts || posts.length === 0) {
        return (
            <div className="mt-8">
                <h2 className="text-2xl font-bold mb-4 text-[#4ade80]">Meeting Notes</h2>
                <div className="bg-[#1e293b] shadow rounded-lg p-6 border border-[#334155]">
                    <p className="text-gray-400 text-center">No meeting notes found for this user.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4 text-[#4ade80]">Meeting Notes</h2>
            {posts.map((post, index) => (
                <MarkdownPost
                    key={index}
                    title={post.title}
                    content={post.content}
                    date={post.date}
                />
            ))}
        </div>
    );
}
