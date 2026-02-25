import React, { useEffect } from 'react';
import mermaid from 'mermaid';

// Initialize Mermaid with default config
mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'loose',
    fontFamily: 'Fira Code, monospace',
    themeVariables: {
        primaryColor: '#2563eb',
        mainBkg: '#1e293b',
        nodeBorder: '#3b82f6',
        lineColor: '#94a3b8',
    }
});

interface MermaidRendererProps {
    content: string;
}

/**
 * Component that watches for changes in content and triggers Mermaid rendering
 */
const MermaidRenderer: React.FC<MermaidRendererProps> = ({ content }) => {
    useEffect(() => {
        // We use a small delay to ensure the DOM is ready after Markdown parsing
        const timer = setTimeout(() => {
            try {
                mermaid.contentLoaded();
            } catch (error) {
                console.error('Mermaid rendering failed:', error);
            }
        }, 100);

        return () => clearTimeout(timer);
    }, [content]);

    return null; // This is a logic-only component that affects the DOM
};

export default MermaidRenderer;
