'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function DocsPage() {
  const params = useParams();
  const docName = params.docname as string;
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDoc = async () => {
      try {
        const response = await fetch(`/api/docs/${docName}`);
        if (!response.ok) {
          setContent('# Document Not Found\n\nThe requested documentation page could not be found.');
        } else {
          const text = await response.text();
          setContent(text);
        }
      } catch (error) {
        setContent('# Error Loading Document\n\nFailed to load the documentation.');
      } finally {
        setLoading(false);
      }
    };

    loadDoc();
  }, [docName]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 text-neutral-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-2xl font-semibold">Loading documentation...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100">
      <div className="max-w-4xl mx-auto px-8 py-12">
        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-8 transition-colors"
        >
          <span>←</span>
          Back to App
        </Link>

        {/* Documentation Content */}
        <div className="prose prose-invert max-w-none">
          <MarkdownContent markdown={content} />
        </div>
      </div>
    </div>
  );
}

function MarkdownContent({ markdown }: { markdown: string }) {
  const lines = markdown.split('\n');
  const elements = [];
  let codeBlock = '';
  let inCodeBlock = false;
  let codeLanguage = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle code blocks
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLanguage = line.slice(3).trim() || 'bash';
        codeBlock = '';
      } else {
        inCodeBlock = false;
        elements.push(
          <pre
            key={`code-${i}`}
            className="bg-neutral-800 rounded-lg p-4 overflow-x-auto mb-6 border border-neutral-700"
          >
            <code className={`language-${codeLanguage} text-sm`}>{codeBlock}</code>
          </pre>
        );
        codeBlock = '';
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlock += line + '\n';
      continue;
    }

    // Headings
    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={`h1-${i}`} className="text-4xl font-bold mt-10 mb-4 text-neutral-100">
          {line.slice(2)}
        </h1>
      );
    } else if (line.startsWith('## ')) {
      elements.push(
        <h2 key={`h2-${i}`} className="text-3xl font-bold mt-8 mb-3 text-neutral-100">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${i}`} className="text-2xl font-semibold mt-6 mb-2 text-neutral-200">
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith('#### ')) {
      elements.push(
        <h4 key={`h4-${i}`} className="text-xl font-semibold mt-4 mb-2 text-neutral-300">
          {line.slice(5)}
        </h4>
      );
    }
    // Bold and italic
    else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      const indent = line.match(/^(\s*)/)?.[1]?.length || 0;
      const text = line.slice(indent + 2);
      const level = Math.floor(indent / 2);
      elements.push(
        <li key={`li-${i}`} style={{ marginLeft: `${level * 1.5}rem` }} className="text-neutral-300 mb-2">
          {renderInlineText(text)}
        </li>
      );
    } else if (line.startsWith('| ')) {
      // Skip tables for now, just render as text
      elements.push(
        <p key={`table-${i}`} className="text-neutral-400 text-sm mb-2 font-mono">
          {line}
        </p>
      );
    } else if (line.trim() === '') {
      // Empty line
      if (elements.length > 0 && elements[elements.length - 1]?.key !== `spacer-${i}`) {
        elements.push(<div key={`spacer-${i}`} className="mb-4" />);
      }
    } else {
      // Regular paragraph
      elements.push(
        <p key={`p-${i}`} className="text-neutral-300 mb-4 leading-relaxed">
          {renderInlineText(line)}
        </p>
      );
    }
  }

  return <>{elements}</>;
}

function renderInlineText(text: string): React.ReactNode {
  // Handle bold
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Handle italic
  text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // Handle inline code
  text = text.replace(/`(.*?)`/g, '<code>$1</code>');
  // Handle links
  text = text.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  return (
    <span
      dangerouslySetInnerHTML={{
        __html: text,
      }}
      className="[&_strong]:font-semibold [&_strong]:text-neutral-100 [&_em]:italic [&_code]:bg-neutral-800 [&_code]:px-2 [&_code]:py-1 [&_code]:rounded [&_code]:text-blue-300 [&_a]:text-blue-400 [&_a]:hover:text-blue-300 [&_a]:underline"
    />
  );
}
