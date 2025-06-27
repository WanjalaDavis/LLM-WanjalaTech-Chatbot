import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { backend } from 'declarations/backend';
import botImg from '/bot.svg';
import userImg from '/user.svg';
import '/index.css';

const designCategories = ["Wedding Card", "Funeral Templates", "Business Cards", "Birthday Card", "Graduation Cards", "Posters"];

const renderMarkdown = (text) => {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br/>');
};

const App = () => {
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme ? savedTheme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [chatThreads, setChatThreads] = useState(() => {
    const savedThreads = localStorage.getItem('chatThreads');
    return savedThreads ? JSON.parse(savedThreads) : [
      {
        id: 'default',
        name: 'General Design',
        chats: [
          {
            role: { system: null },
            content: "👋 I am a Professional Designer. What can we design today?"
          }
        ]
      }
    ];
  });
  const [activeThreadId, setActiveThreadId] = useState('default');
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingThread, setIsCreatingThread] = useState(false);
  const [newThreadName, setNewThreadName] = useState('');
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const fileInputRef = useRef(null);
  const chatBoxRef = useRef(null);

  // Apply dark mode class to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Save chat threads to localStorage when they change
  useEffect(() => {
    localStorage.setItem('chatThreads', JSON.stringify(chatThreads));
  }, [chatThreads]);

  const formatDate = (date) => {
    const h = '0' + date.getHours();
    const m = '0' + date.getMinutes();
    return `${h.slice(-2)}:${m.slice(-2)}`;
  };

  const askAgent = async (messageText, attachments = []) => {
    try {
      const response = await backend.professionalDesignerChat(messageText, attachments);
      setChatThreads(prevThreads => {
        return prevThreads.map(thread => {
          if (thread.id === activeThreadId) {
            const newChats = [...thread.chats];
            newChats.pop(); // remove "Thinking..."
            newChats.push({ role: { assistant: null }, content: response });
            return { ...thread, chats: newChats };
          }
          return thread;
        });
      });
    } catch (e) {
      console.error("Error:", e);
      setChatThreads(prevThreads => {
        return prevThreads.map(thread => {
          if (thread.id === activeThreadId) {
            const newChats = [...thread.chats];
            newChats.pop(); // remove "Thinking..."
            newChats.push({
              role: { system: null },
              content: "⚠️ An error occurred. Please try again."
            });
            return { ...thread, chats: newChats };
          }
          return thread;
        });
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.trim() && !fileInputRef.current?.files?.length) return;

    const userMessage = {
      role: { user: null },
      content: inputValue,
      attachments: fileInputRef.current?.files?.length ? Array.from(fileInputRef.current.files) : []
    };
    const thinkingMessage = {
      role: { system: null },
      content: '⏳ Thinking ...'
    };

    setChatThreads(prevThreads => {
      return prevThreads.map(thread => {
        if (thread.id === activeThreadId) {
          return { ...thread, chats: [...thread.chats, userMessage, thinkingMessage] };
        }
        return thread;
      });
    });

    setInputValue('');
    setIsLoading(true);
    askAgent(inputValue, userMessage.attachments);
    
    // Clear file input after submission
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCategoryClick = (category) => {
    setInputValue(`Design a ${category} card`);
  };

  const createNewThread = () => {
    if (!newThreadName.trim()) return;
    
    const newThread = {
      id: Date.now().toString(),
      name: newThreadName,
      chats: [
        {
          role: { system: null },
          content: `👋 New conversation about ${newThreadName}. What would you like to design?`
        }
      ]
    };
    
    setChatThreads([...chatThreads, newThread]);
    setActiveThreadId(newThread.id);
    setNewThreadName('');
    setIsCreatingThread(false);
  };

  const deleteThread = (threadId) => {
    if (threadId === 'default') return; // Prevent deleting default thread
    
    if (window.confirm("Are you sure you want to delete this thread?")) {
      setChatThreads(chatThreads.filter(thread => thread.id !== threadId));
      if (activeThreadId === threadId) {
        setActiveThreadId('default');
      }
    }
  };

  const handleImageUpload = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      setInputValue(prev => prev ? prev : "Here's an image I want to use for design inspiration");
      setShowImageOptions(false);
      
      // Add preview message
      setChatThreads(prevThreads => {
        return prevThreads.map(thread => {
          if (thread.id === activeThreadId) {
            return { 
              ...thread, 
              chats: [...thread.chats, {
                role: { user: null },
                content: "Uploaded an image for reference",
                attachments: Array.from(files)
              }]
            };
          }
          return thread;
        });
      });
    }
  };

  const openCamera = () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          // In a real implementation, you would:
          // 1. Show a camera preview
          // 2. Add a capture button
          // 3. Convert the captured image to a file
          // For now, we'll just trigger the file input
          fileInputRef.current.click();
          
          // Stop all tracks in the stream
          stream.getTracks().forEach(track => track.stop());
        })
        .catch(err => {
          console.error("Camera error:", err);
          alert("Could not access camera. Please check permissions.");
        });
    } else {
      alert("Camera access not supported in this browser.");
    }
  };

  const generateMockResults = (query) => {
    const baseResults = [
      {
        title: `Modern ${query} Invitations`,
        url: `https://example.com/${query.toLowerCase()}`,
        snippet: `Browse our collection of modern ${query.toLowerCase()} invitation designs...`,
        image: `https://source.unsplash.com/random/300x200/?${query.toLowerCase()}`
      },
      {
        title: `Professional ${query} Templates`,
        url: `https://example.com/${query.toLowerCase()}-templates`,
        snippet: `Premium ${query.toLowerCase()} templates for your needs with customizable options...`,
        image: `https://source.unsplash.com/random/300x200/?${query.toLowerCase()},design`
      },
      {
        title: `Creative ${query} Ideas`,
        url: `https://example.com/${query.toLowerCase()}-ideas`,
        snippet: `50+ creative ${query.toLowerCase()} designs to inspire your next project...`,
        image: `https://source.unsplash.com/random/300x200/?${query.toLowerCase()},creative`
      }
    ];
    
    return baseResults.filter(result => 
      result.title.toLowerCase().includes(query.toLowerCase()) || 
      result.snippet.toLowerCase().includes(query.toLowerCase())
    );
  };

  const performSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setSearchResults([]);
    
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Generate mock results based on query
      const mockResults = generateMockResults(searchQuery);
      setSearchResults(mockResults);
      
      // Add search notification to chat
      setChatThreads(prevThreads => {
        return prevThreads.map(thread => {
          if (thread.id === activeThreadId) {
            return { 
              ...thread, 
              chats: [...thread.chats, {
                role: { system: null },
                content: `🔍 Found ${mockResults.length} design references for "${searchQuery}"`
              }]
            };
          }
          return thread;
        });
      });
    } catch (error) {
      console.error("Search error:", error);
      setChatThreads(prevThreads => {
        return prevThreads.map(thread => {
          if (thread.id === activeThreadId) {
            return { 
              ...thread, 
              chats: [...thread.chats, {
                role: { system: null },
                content: "⚠️ Search failed. Please try again later."
              }]
            };
          }
          return thread;
        });
      });
    } finally {
      setIsSearching(false);
    }
  };

  const selectSearchResult = (result) => {
    setInputValue(`I found this design reference: ${result.title} (${result.url})`);
    setShowSearchModal(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const activeChat = chatThreads.find(thread => thread.id === activeThreadId)?.chats || [];

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [activeChat]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-tr from-indigo-100 to-white dark:from-gray-800 dark:to-gray-900 p-4">
      <div className="flex h-[85vh] w-full max-w-6xl rounded-2xl bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-indigo-700 dark:text-indigo-400">Chat Threads</h2>
              <button
                onClick={() => setIsCreatingThread(true)}
                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                aria-label="Create new thread"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            
            {isCreatingThread && (
              <div className="mb-4">
                <input
                  type="text"
                  value={newThreadName}
                  onChange={(e) => setNewThreadName(e.target.value)}
                  placeholder="Thread name"
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                  autoFocus
                />
                <div className="flex justify-end mt-2 space-x-2">
                  <button
                    onClick={() => setIsCreatingThread(false)}
                    className="px-2 py-1 text-sm text-gray-600 dark:text-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createNewThread}
                    className="px-2 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                  >
                    Create
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {chatThreads.map(thread => (
              <div
                key={thread.id}
                onClick={() => setActiveThreadId(thread.id)}
                className={`p-3 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${
                  activeThreadId === thread.id ? 'bg-indigo-50 dark:bg-gray-700' : ''
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="font-medium text-gray-800 dark:text-gray-200 truncate">
                    {thread.name}
                  </div>
                  {thread.id !== 'default' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteThread(thread.id);
                      }}
                      className="text-gray-400 hover:text-red-500"
                      aria-label="Delete thread"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {thread.chats.length > 1 
                    ? thread.chats[thread.chats.length - 1].content.substring(0, 30) + '...'
                    : 'New conversation'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          <div className="px-4 pt-4 pb-2 border-b bg-white dark:bg-gray-800 sticky top-0 z-10 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-indigo-700 dark:text-indigo-400 mb-2">
                {chatThreads.find(t => t.id === activeThreadId)?.name || 'Chat'}
              </h2>
              <div className="flex flex-wrap gap-2">
                {designCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => handleCategoryClick(cat)}
                    className="rounded-full border border-indigo-300 dark:border-indigo-600 px-4 py-1 text-sm text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-gray-700 transition"
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              aria-label="Toggle dark mode"
            >
              {darkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-700" ref={chatBoxRef}>
            {activeChat.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p>Start a new conversation</p>
              </div>
            ) : (
              activeChat.map((message, index) => {
                const isUser = 'user' in message.role;
                const isAssistant = 'assistant' in message.role;
                const img = isUser ? userImg : botImg;
                const name = isUser ? 'You' : isAssistant ? 'Designer Bot' : 'System';
                const rawText = message.content;

                return (
                  <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
                    {!isUser && (
                      <div
                        className="mr-2 h-10 w-10 rounded-full flex-shrink-0"
                        style={{ backgroundImage: `url(${img})`, backgroundSize: 'cover' }}
                        aria-hidden="true"
                      ></div>
                    )}
                    <div className={`max-w-[70%] rounded-xl p-3 ${
                      isUser 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-white dark:bg-gray-800 shadow dark:shadow-gray-900'
                    }`}>
                      <div
                        className={`mb-1 flex items-center justify-between text-xs ${
                          isUser ? 'text-indigo-100' : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        <div>{name}</div>
                        <div className="ml-2">{formatDate(new Date())}</div>
                      </div>
                      <div
                        className={`text-sm leading-relaxed ${
                          isUser ? '' : 'text-gray-800 dark:text-gray-200'
                        }`}
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(rawText) }}
                      />
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {Array.from(message.attachments).map((file, i) => (
                            <div key={i} className="mt-1">
                              {file.type.startsWith('image/') ? (
                                <img 
                                  src={URL.createObjectURL(file)} 
                                  alt="Uploaded content" 
                                  className="max-h-40 max-w-full rounded-md"
                                />
                              ) : (
                                <a 
                                  href={URL.createObjectURL(file)} 
                                  download={file.name}
                                  className="text-blue-500 hover:underline flex items-center"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                                  </svg>
                                  {file.name}
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {isUser && (
                      <div
                        className="ml-2 h-10 w-10 rounded-full flex-shrink-0"
                        style={{ backgroundImage: `url(${img})`, backgroundSize: 'cover' }}
                        aria-hidden="true"
                      ></div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Image Upload Options Popup */}
          {showImageOptions && (
            <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
              <div className="flex flex-col space-y-3">
                <button
                  onClick={() => {
                    fileInputRef.current.click();
                    setShowImageOptions(false);
                  }}
                  className="flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Upload from device
                </button>
                <button
                  onClick={openCamera}
                  className="flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Take a photo
                </button>
                <button
                  onClick={() => setShowImageOptions(false)}
                  className="px-4 py-2 text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  Cancel
                </button>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
                multiple
              />
            </div>
          )}

          {/* Search Modal */}
          {showSearchModal && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md">
                <h3 className="text-lg font-bold mb-4 dark:text-white">Search Online for Designs</h3>
                <div className="flex mb-4">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && performSearch()}
                    placeholder="Search for design ideas..."
                    className="flex-1 p-2 border rounded-l dark:bg-gray-700 dark:border-gray-600"
                    autoFocus
                  />
                  <button
                    onClick={performSearch}
                    disabled={isSearching}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-r disabled:bg-indigo-400"
                  >
                    {isSearching ? (
                      <svg className="animate-spin h-5 w-5 text-white mx-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : 'Search'}
                  </button>
                </div>
                
                {searchResults.length > 0 ? (
                  <div className="max-h-64 overflow-y-auto">
                    {searchResults.map((result, index) => (
                      <div 
                        key={index} 
                        onClick={() => selectSearchResult(result)}
                        className="p-3 border-b dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                      >
                        <div className="font-medium dark:text-white">{result.title}</div>
                        {result.image && (
                          <img 
                            src={result.image} 
                            alt={result.title}
                            className="my-2 rounded-md max-h-32 w-full object-cover"
                          />
                        )}
                        <div className="text-sm text-gray-600 dark:text-gray-300">{result.snippet}</div>
                        <div className="text-xs text-blue-500 truncate">{result.url}</div>
                      </div>
                    ))}
                  </div>
                ) : isSearching ? (
                  <div className="text-center py-4">
                    <svg className="animate-spin h-8 w-8 text-indigo-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    {searchQuery ? 'No results found' : 'Enter a search term to find design inspiration'}
                  </div>
                )}
                
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => {
                      setShowSearchModal(false);
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          <form className="flex border-t bg-white dark:bg-gray-800 p-3 relative" onSubmit={handleSubmit}>
            <div className="flex items-center space-x-2 mr-2">
              <button
                type="button"
                onClick={() => setShowImageOptions(!showImageOptions)}
                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
                aria-label="Upload image"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setShowSearchModal(true)}
                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
                aria-label="Search online"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
            <input
              type="text"
              className="flex-1 rounded-l-md border p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Type your design request..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLoading}
            />
            <button
              type="submit"
              className="rounded-r-md bg-indigo-600 p-2 text-white hover:bg-indigo-700 disabled:bg-indigo-300 dark:disabled:bg-indigo-900"
              disabled={isLoading || (!inputValue.trim() && !fileInputRef.current?.files?.length)}
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5 text-white mx-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default App;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);