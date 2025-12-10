'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
    id: string;
    role: 'user' | 'bot';
    content: string;
    timestamp: Date;
}

export default function AIChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'bot',
            content: 'Hola 👋 Soy tu Copiloto Tributario. ¿En qué puedo ayudarte con el SRI o el inventario?',
            timestamp: new Date()
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const pathname = usePathname();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    // Generate or retrieve session ID
    useEffect(() => {
        let sessionId = localStorage.getItem('chat_session_id');
        if (!sessionId) {
            sessionId = crypto.randomUUID();
            localStorage.setItem('chat_session_id', sessionId);
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: inputValue,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            // Production URL (Cloud Run)
            const API_URL = 'https://messages-uq7ypdzlda-uc.a.run.app/';

            const sessionId = localStorage.getItem('chat_session_id') || 'default-session';

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    botId: 'sri-inventario-bot',
                    message: userMessage.content,
                    sessionId: sessionId, // Send unique session ID
                    context: {
                        page: pathname,
                    }
                }),
            });

            if (!response.ok) throw new Error('Error de conexión');

            const data = await response.json();

            // Adaptar respuesta según formato del agente (assumed { result: string } or similar)
            const botResponseText = data.response || data.result || "Lo siento, no pude procesar tu solicitud.";

            const botMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'bot',
                content: botResponseText,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            console.error('Chat Error:', error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'bot',
                content: '⚠️ Lo siento, hubo un error de conexión con el agente. Intenta más tarde.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {/* Chat Window */}
            {isOpen && (
                <div className="mb-4 w-80 md:w-96 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden flex flex-col transition-all duration-300 ease-in-out transform origin-bottom-right" style={{ maxHeight: '600px', height: '500px' }}>

                    {/* Header */}
                    <div className="bg-indigo-600 p-4 flex justify-between items-center text-white">
                        <div className="flex items-center space-x-2">
                            <span className="text-xl">🤖</span>
                            <div>
                                <h3 className="font-bold text-sm">Copiloto SRI</h3>
                                <p className="text-xs text-indigo-200">Impulsado por IA</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-indigo-100 hover:text-white transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${msg.role === 'user'
                                        ? 'bg-indigo-600 text-white rounded-br-none'
                                        : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                                        }`}
                                >
                                    {/* Use ReactMarkdown for rendering */}
                                    <div className="prose prose-sm max-w-none break-words dark:prose-invert prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                // Override link styling to be visible blue/underline
                                                a: ({ node, ...props }) => <a {...props} className="text-blue-200 underline hover:text-white" target="_blank" rel="noopener noreferrer" />,
                                            }}
                                        >
                                            {msg.content}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                                    <div className="flex space-x-1">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-gray-100">
                        <div className="flex space-x-2">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Pregunta sobre SRI..."
                                className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-700 placeholder-gray-400"
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !inputValue.trim()}
                                className="bg-indigo-600 text-white rounded-full p-2 hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-400 text-center mt-2">
                            La IA puede cometer errores. Verifica la información importante.
                        </p>
                    </form>
                </div>
            )}

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-indigo-300"
            >
                {isOpen ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                ) : (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                )}
            </button>
        </div>
    );
}
