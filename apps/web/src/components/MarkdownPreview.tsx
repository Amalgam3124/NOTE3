'use client';

import ReactMarkdown from 'react-markdown';
import OptimizedImage from './OptimizedImage';

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

export default function MarkdownPreview({ content, className = '' }: MarkdownPreviewProps) {
  console.log('🔍 MarkdownPreview rendering content:', content);
  
  // Parse Markdown content manually since ReactMarkdown has a bug with img src
  const renderContent = () => {
    if (!content.trim()) return null;
    
    // Split content into lines
    const lines = content.split('\n');
    const renderedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if line contains an image
      const imageMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
      
      if (imageMatch) {
        const [, alt, src] = imageMatch;
        console.log('🔍 Rendering image with manual parser:', { alt, src });
        
        // Render image based on src type
        if (src.startsWith('blob:')) {
          console.log('🔍 Rendering blob URL image:', src);
          renderedLines.push(
            <div key={i} className="my-4">
              <OptimizedImage
                src={src}
                alt={alt || 'Local image'}
                width={600}
                height={400}
                className="max-w-full h-auto rounded-lg border border-gray-200 shadow-sm"
                fallbackSrc="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDYwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI2MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xODAgMTIwQzE4MCAxMDcuOTEgMTg4LjkxIDEwMCAyMDEgMTAwSDM5OUM0MTEuMDkgMTAwIDQyMCAxMDcuOTEgNDIwIDEyMEM0MjAgMTMyLjA5IDQxMS4wOSAxNDAgMzk5IDE0MEgyMDFDMTg4LjkxIDEwMCAxODAgMTMyLjA5IDE4MCAxMjBaIiBmaWxsPSIjOUI5QkEwIi8+CjxwYXRoIGQ9Ik02MCAxNDBMMTgwIDE0MEg2NFoiIGZpbGw9IiM5QjlCQTAiLz4KPC9zdmc+"
              />
              {alt && (
                <p className="text-sm text-gray-600 text-center mt-2 italic">{alt}</p>
              )}
            </div>
          );
        } else if (src.startsWith('bafy') || src.startsWith('Qm') || src.includes('gateway')) {
          console.log('🔍 Rendering CID image:', src);
          renderedLines.push(
            <div key={i} className="my-4">
              <OptimizedImage
                src={src.startsWith('http') ? src : `https://gateway.0g.ai/ipfs/${src}`}
                alt={alt || 'Inline image'}
                width={600}
                height={400}
                className="max-w-full h-auto rounded-lg border border-gray-200 shadow-sm"
                fallbackSrc="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDYwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI2MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xODAgMTIwQzE4MCAxMDcuOTEgMTg4LjkxIDEwMCAyMDEgMTAwSDM5OUM0MTEuMDkgMTAwIDQyMCAxMDcuOTEgNDIwIDEyMEM0MjAgMTMyLjA5IDQxMS4wOSAxNDAgMzk5IDE0MEgyMDFDMTg4LjkxIDEwMCAxODAgMTMyLjA5IDE4MCAxMjBaIiBmaWxsPSIjOUI5QkEwIi8+CjxwYXRoIGQ9Ik02MCAxNDBMMTgwIDE0MEg2NFoiIGZpbGw9IiM5QjlCQTAiLz4KPC9zdmc+"
              />
              {alt && (
                <p className="text-sm text-gray-600 text-center mt-2 italic">{alt}</p>
              )}
            </div>
          );
        } else {
          console.log('🔍 Rendering regular image:', src);
          renderedLines.push(
            <div key={i} className="my-4">
              <OptimizedImage
                src={src}
                alt={alt || 'Image'}
                width={600}
                height={400}
                className="max-w-full h-auto rounded-lg border border-gray-200 shadow-sm"
              />
              {alt && (
                <p className="text-sm text-gray-600 text-center mt-2 italic">{alt}</p>
              )}
            </div>
          );
        }
      } else {
        // Regular text line - use ReactMarkdown for basic Markdown
        renderedLines.push(
          <div key={i} className="mb-2">
            <ReactMarkdown>{line}</ReactMarkdown>
          </div>
        );
      }
    }
    
    return renderedLines;
  };
  
  return (
    <div className={`prose max-w-none ${className}`}>
      {renderContent()}
    </div>
  );
}
