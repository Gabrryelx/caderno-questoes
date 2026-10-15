'use client';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

// Markdown + LaTeX ($inline$ e $$display$$) + imagens por URL
export default function Md({ children, serif = false, className = '' }) {
  return (
    <div className={`prose-md ${serif ? 'serif' : ''} ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
        {children || ''}
      </ReactMarkdown>
    </div>
  );
}
