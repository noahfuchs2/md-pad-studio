import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  return (
    <div className={cn("prose prose-invert max-w-none p-8 pb-32", className)}>
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          code({node, inline, className, children, ...props}: any) {
            const match = /language-(\w+)/.exec(className || '')
            return !inline && match ? (
              <div className="relative rounded-md bg-zinc-900 border border-zinc-800 p-4 my-4 overflow-x-auto">
                <code className={className} {...props}>
                  {children}
                </code>
              </div>
            ) : (
              <code className={cn("bg-zinc-800 rounded px-1 py-0.5 text-pink-500", className)} {...props}>
                {children}
              </code>
            )
          },
          blockquote({children}) {
             return <blockquote className="border-l-4 border-zinc-700 pl-4 italic text-zinc-400 my-4">{children}</blockquote>
          },
          table({children}) {
            return <div className="overflow-x-auto my-4"><table className="w-full border-collapse border border-zinc-800">{children}</table></div>
          },
          th({children}) {
            return <th className="border border-zinc-700 bg-zinc-800 px-4 py-2 text-left">{children}</th>
          },
          td({children}) {
             return <td className="border border-zinc-700 px-4 py-2">{children}</td>
          },
          a({href, children}) {
            return <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{children}</a>
          },
          hr() {
            return <hr className="border-zinc-800 my-8" />
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};