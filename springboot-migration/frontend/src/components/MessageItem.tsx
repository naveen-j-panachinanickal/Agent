import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { motion } from "framer-motion";
import { Copy, Check } from "lucide-react";
import { ChatMessage } from "../types";

type MessageItemProps = {
  message: ChatMessage;
  theme: string;
};

export function MessageItem({ message, theme }: MessageItemProps) {
  const [copied, setCopied] = React.useState(false);
  const syntaxTheme = theme === "dark" ? oneDark : oneLight;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.article 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`message ${message.role}`}
    >
      <div className="message-header">
        <span>{message.role}</span>
        <button className="copy-btn" onClick={copyToClipboard} title="Copy to clipboard">
            {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
      
      <div className="message-content">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={{
            code({ node, inline, className, children, ...props }: any) {
              const match = /language-(\w+)/.exec(className || "");
              return !inline && match ? (
                <SyntaxHighlighter
                  style={syntaxTheme}
                  language={match[1]}
                  PreTag="div"
                  {...props}
                >
                  {String(children).replace(/\n$/, "")}
                </SyntaxHighlighter>
              ) : (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            }
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>

      {message.images && message.images.length > 0 && (
        <div className="message-images">
          {message.images.map((img, i) => (
            <img key={i} src={`data:image/jpeg;base64,${img}`} alt="Attached" />
          ))}
        </div>
      )}
    </motion.article>
  );
}
