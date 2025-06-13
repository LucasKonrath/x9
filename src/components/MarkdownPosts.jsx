// src/components/MarkdownPosts.jsx
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { format, parse } from 'date-fns';

function MarkdownPost({ title, content, date }) {
    const [isExpanded, setIsExpanded] = useState(false);

    const parsedDate = parse(title.slice(0, 10), 'yyyy-MM-dd', new Date());
    const formattedDate = format(parsedDate, 'MMMM d, yyyy');

    return (
        <div className="border rounded-lg mb-4 overflow-hidden">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-4 py-2 text-left bg-gray-50 hover:bg-gray-100 flex justify-between items-center"
            >
                <span className="font-medium">{formattedDate}</span>
                <span className="text-gray-500">
          {isExpanded ? '▼' : '▶'}
        </span>
            </button>
            {isExpanded && (
                <div className="p-4 prose max-w-none">
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
                <h2 className="text-2xl font-bold mb-4">Meeting Notes</h2>
                <div className="bg-white shadow rounded-lg p-6">
                    <p className="text-gray-500 text-center">No meeting notes found for this user.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">Meeting Notes</h2>
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
