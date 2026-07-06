/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { LogIn, LogOut, Send, Snowflake, MessageSquare, Megaphone, SmilePlus, Bell, Video, Upload, Play, Gamepad2, Grid3X3, Disc3, HandMetal, Blocks, Bug } from 'lucide-react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import PongGame from './PongGame';
import TicTacToeGame from './TicTacToeGame';
import Connect4Game from './Connect4Game';
import RpsGame from './RpsGame';
import SnakeGame from './SnakeGame';
import Game2048 from './Game2048';
import FrostCraft from './FrostCraft';

const TEAM_CREDENTIALS: Record<string, string> = {
  'CosmicMC1': 'icebergcrystal12',
  'En_Vixity': 'frozenocean44',
  'duoo2': 'polarbear88',
  'Player': 'snowstorm77',
  'ItVas': 'winterglacier23',
  'Xylfe': 'chillwind55',
  'Wiljan': 'arcticwolf99'
};

const TEAM_MEMBERS = Object.keys(TEAM_CREDENTIALS);

interface ChatMessage {
  id: string;
  author: string;
  text: string;
  timestamp: number;
  reactions?: Record<string, string[]>;
  videoUrl?: string;
}

type Channel = 'general' | 'announcements' | 'videos' | 'pong' | 'tictactoe' | 'connect4' | 'rps' | 'snake' | '2048' | 'frostcraft';

interface NotificationToast {
  id: string;
  text: string;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  const [activeChannel, setActiveChannel] = useState<Channel>('general');
  const [announcements, setAnnouncements] = useState<ChatMessage[]>([]);
  const [generalMessages, setGeneralMessages] = useState<ChatMessage[]>([]);
  const [videos, setVideos] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [activePickerMsgId, setActivePickerMsgId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationToast[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const notifyUser = (text: string) => {
    const id = Date.now().toString() + Math.random().toString();
    setNotifications(prev => [...prev, { id, text }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  useEffect(() => {
    // Load from local storage on mount
    const storedAnnouncements = localStorage.getItem('frostbite_announcements');
    if (storedAnnouncements) {
      try { setAnnouncements(JSON.parse(storedAnnouncements)); } catch (e) {}
    }
    const storedGeneral = localStorage.getItem('frostbite_general');
    if (storedGeneral) {
      try { setGeneralMessages(JSON.parse(storedGeneral)); } catch (e) {}
    }
    const storedVideos = localStorage.getItem('frostbite_videos');
    if (storedVideos) {
      try { setVideos(JSON.parse(storedVideos)); } catch (e) {}
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'frostbite_general' && e.newValue) {
        const newMsgs = JSON.parse(e.newValue) as ChatMessage[];
        setGeneralMessages(newMsgs);
        if (currentUser) {
          const latestMsg = newMsgs[newMsgs.length - 1];
          if (latestMsg && latestMsg.author !== currentUser && latestMsg.text.includes(`@${currentUser}`)) {
            notifyUser(`${latestMsg.author} pinged you in #general`);
          }
        }
      }
      if (e.key === 'frostbite_announcements' && e.newValue) {
        const newAnns = JSON.parse(e.newValue) as ChatMessage[];
        setAnnouncements(newAnns);
        if (currentUser) {
          const latestMsg = newAnns[newAnns.length - 1];
          if (latestMsg && latestMsg.author !== currentUser && latestMsg.text.includes(`@${currentUser}`)) {
            notifyUser(`${latestMsg.author} pinged you in #announcements`);
          }
        }
      }
      if (e.key === 'frostbite_videos' && e.newValue) {
        const newVids = JSON.parse(e.newValue) as ChatMessage[];
        setVideos(newVids);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [currentUser]);

  useEffect(() => {
    if (activeChannel === 'general') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [generalMessages, activeChannel]);

  const handlePostMessage = () => {
    if (!newMessage.trim() && !videoFile) return;
    
    let url = undefined;
    if (videoFile) {
      url = URL.createObjectURL(videoFile);
    }

    const msg: ChatMessage = {
      id: Date.now().toString(),
      author: currentUser!,
      text: newMessage.trim(),
      timestamp: Date.now(),
      videoUrl: url,
    };

    if (activeChannel === 'announcements') {
      const newAnns = [msg, ...announcements];
      setAnnouncements(newAnns);
      localStorage.setItem('frostbite_announcements', JSON.stringify(newAnns));
    } else if (activeChannel === 'videos') {
      const newVids = [msg, ...videos];
      setVideos(newVids);
      localStorage.setItem('frostbite_videos', JSON.stringify(newVids));
    } else {
      const newMsgs = [...generalMessages, msg];
      setGeneralMessages(newMsgs);
      localStorage.setItem('frostbite_general', JSON.stringify(newMsgs));
    }
    
    setNewMessage('');
    setVideoFile(null);
  };

  const handleReaction = (msgId: string, emoji: string) => {
    const updateMsgs = (msgs: ChatMessage[]) => msgs.map(msg => {
      if (msg.id === msgId) {
        const reactions = msg.reactions ? { ...msg.reactions } : {};
        const users = reactions[emoji] || [];
        if (users.includes(currentUser!)) {
          reactions[emoji] = users.filter(u => u !== currentUser!);
          if (reactions[emoji].length === 0) delete reactions[emoji];
        } else {
          reactions[emoji] = [...users, currentUser!];
        }
        return { ...msg, reactions };
      }
      return msg;
    });

    if (activeChannel === 'announcements') {
      const newMsgs = updateMsgs(announcements);
      setAnnouncements(newMsgs);
      localStorage.setItem('frostbite_announcements', JSON.stringify(newMsgs));
    } else if (activeChannel === 'videos') {
      const newMsgs = updateMsgs(videos);
      setVideos(newMsgs);
      localStorage.setItem('frostbite_videos', JSON.stringify(newMsgs));
    } else {
      const newMsgs = updateMsgs(generalMessages);
      setGeneralMessages(newMsgs);
      localStorage.setItem('frostbite_general', JSON.stringify(newMsgs));
    }
    setActivePickerMsgId(null);
  };

  const renderMessageText = (text: string) => {
    const parts = text.split(/(@[A-Za-z0-9_]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const username = part.substring(1);
        if (TEAM_MEMBERS.includes(username)) {
          return (
            <span key={i} className={`px-1 rounded font-medium ${username === currentUser ? 'bg-cyan-500/30 text-cyan-200' : 'bg-slate-700/50 text-cyan-400'}`}>
              {part}
            </span>
          );
        }
      }
      return <span key={i}>{part}</span>;
    });
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUser && TEAM_CREDENTIALS[selectedUser] === password) {
      setCurrentUser(selectedUser);
      setSelectedUser(null);
      setPassword('');
      setLoginError('');
    } else {
      setLoginError('Incorrect password');
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-50 p-6 relative overflow-hidden">
        {/* Icey background effects */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-cyan-900/20 blur-[120px] rounded-full"></div>
          <div className="absolute top-[60%] right-[10%] w-[40%] h-[40%] bg-blue-900/20 blur-[100px] rounded-full"></div>
        </div>

        <div className="max-w-md w-full z-10 space-y-8 backdrop-blur-sm bg-slate-900/50 p-8 rounded-2xl border border-cyan-900/30 shadow-2xl shadow-cyan-900/20">
          <div className="flex flex-col items-center space-y-4">
            <div className="p-4 bg-cyan-950/50 rounded-full border border-cyan-800/50">
              <Snowflake className="w-12 h-12 text-cyan-400" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-cyan-200 to-blue-500">
              FROSTBITE
            </h1>
            <p className="text-cyan-400/60 text-sm tracking-widest uppercase">Team Portal</p>
          </div>

          <div className="space-y-4 mt-8">
            {!selectedUser ? (
              <>
                <p className="text-center text-slate-400 text-sm mb-4">Select your account to continue</p>
                <div className="grid grid-cols-2 gap-3">
                  {TEAM_MEMBERS.map(member => (
                    <button
                      key={member}
                      onClick={() => setSelectedUser(member)}
                      className="flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-slate-800/50 hover:bg-cyan-900/40 border border-slate-700/50 hover:border-cyan-500/50 transition-all text-slate-300 hover:text-cyan-100 group"
                    >
                      <LogIn className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                      <span className="font-medium">{member}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="text-center mb-6">
                  <p className="text-slate-400 text-sm">Logging in as</p>
                  <p className="text-cyan-300 font-semibold text-lg">{selectedUser}</p>
                </div>
                
                <div className="space-y-1">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setLoginError('');
                    }}
                    placeholder="Enter password"
                    className="w-full bg-slate-950/50 border border-slate-700 rounded-xl p-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all text-center"
                    autoFocus
                  />
                  {loginError && <p className="text-red-400 text-sm text-center mt-2">{loginError}</p>}
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUser(null);
                      setPassword('');
                      setLoginError('');
                    }}
                    className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all text-slate-300 font-medium"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 transition-all text-white font-medium shadow-lg shadow-cyan-900/20"
                  >
                    Login
                  </button>
                </div>
              </form>
            )}
            
            {/* Show passwords for testing purposes */}
            {!selectedUser && (
              <div className="mt-8 p-4 bg-slate-950/50 border border-slate-800 rounded-lg">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-semibold">Test Credentials</p>
                <div className="grid grid-cols-1 gap-1 text-xs text-slate-400">
                  {Object.entries(TEAM_CREDENTIALS).map(([user, pass]) => (
                    <div key={user} className="flex justify-between">
                      <span>{user}</span>
                      <span className="font-mono text-cyan-500/70">{pass}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* Navbar */}
      <nav className="border-b border-cyan-900/30 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Snowflake className="w-6 h-6 text-cyan-400" />
            <span className="font-bold text-lg tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 to-blue-400">
              FROSTBITE
            </span>
          </div>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
              <span className="text-sm text-cyan-100/70">Logged in as <span className="text-cyan-300 font-medium">{currentUser}</span></span>
            </div>
            <button
              onClick={() => setCurrentUser(null)}
              className="p-2 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Channel Selector */}
        <div className="flex space-x-2 bg-slate-900/50 p-1 rounded-xl border border-cyan-900/30 w-fit">
          <button
            onClick={() => setActiveChannel('general')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors font-medium text-sm ${
              activeChannel === 'general' 
                ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-900/20' 
                : 'text-slate-400 hover:text-cyan-100 hover:bg-slate-800 border border-transparent'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>General</span>
          </button>
          <button
            onClick={() => setActiveChannel('announcements')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors font-medium text-sm ${
              activeChannel === 'announcements' 
                ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-900/20' 
                : 'text-slate-400 hover:text-cyan-100 hover:bg-slate-800 border border-transparent'
            }`}
          >
            <Megaphone className="w-4 h-4" />
            <span>Announcements</span>
          </button>
          <button
            onClick={() => setActiveChannel('videos')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors font-medium text-sm ${
              activeChannel === 'videos' 
                ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-900/20' 
                : 'text-slate-400 hover:text-cyan-100 hover:bg-slate-800 border border-transparent'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>Videos</span>
          </button>
          <button
            onClick={() => setActiveChannel('pong')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors font-medium text-sm ${
              activeChannel === 'pong' 
                ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-900/20' 
                : 'text-slate-400 hover:text-cyan-100 hover:bg-slate-800 border border-transparent'
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            <span>Pong</span>
          </button>
          <button
            onClick={() => setActiveChannel('tictactoe')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors font-medium text-sm ${
              activeChannel === 'tictactoe' 
                ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-900/20' 
                : 'text-slate-400 hover:text-cyan-100 hover:bg-slate-800 border border-transparent'
            }`}
          >
            <Grid3X3 className="w-4 h-4" />
            <span>Tic Tac Toe</span>
          </button>
          <button
            onClick={() => setActiveChannel('connect4')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors font-medium text-sm ${
              activeChannel === 'connect4' 
                ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-900/20' 
                : 'text-slate-400 hover:text-cyan-100 hover:bg-slate-800 border border-transparent'
            }`}
          >
            <Disc3 className="w-4 h-4" />
            <span>Connect 4</span>
          </button>
          <button
            onClick={() => setActiveChannel('rps')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors font-medium text-sm ${
              activeChannel === 'rps' 
                ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow-sm shadow-purple-900/20' 
                : 'text-slate-400 hover:text-purple-100 hover:bg-slate-800 border border-transparent'
            }`}
          >
            <HandMetal className="w-4 h-4" />
            <span>RPS</span>
          </button>
          <button
            onClick={() => setActiveChannel('snake')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors font-medium text-sm ${
              activeChannel === 'snake' 
                ? 'bg-green-600/20 text-green-300 border border-green-500/30 shadow-sm shadow-green-900/20' 
                : 'text-slate-400 hover:text-green-100 hover:bg-slate-800 border border-transparent'
            }`}
          >
            <Bug className="w-4 h-4" />
            <span>Snake</span>
          </button>
          <button
            onClick={() => setActiveChannel('2048')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors font-medium text-sm ${
              activeChannel === '2048' 
                ? 'bg-orange-600/20 text-orange-300 border border-orange-500/30 shadow-sm shadow-orange-900/20' 
                : 'text-slate-400 hover:text-orange-100 hover:bg-slate-800 border border-transparent'
            }`}
          >
            <Blocks className="w-4 h-4" />
            <span>2048</span>
          </button>
          <button
            onClick={() => setActiveChannel('frostcraft')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors font-medium text-sm ${
              activeChannel === 'frostcraft' 
                ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30 shadow-sm shadow-blue-900/20' 
                : 'text-slate-400 hover:text-blue-100 hover:bg-slate-800 border border-transparent'
            }`}
          >
            <Blocks className="w-4 h-4" />
            <span>FrostCraft</span>
          </button>
        </div>

        {activeChannel === 'pong' ? (
          <PongGame />
        ) : activeChannel === 'tictactoe' ? (
          <TicTacToeGame currentUser={currentUser} />
        ) : activeChannel === 'connect4' ? (
          <Connect4Game currentUser={currentUser} />
        ) : activeChannel === 'rps' ? (
          <RpsGame currentUser={currentUser} />
        ) : activeChannel === 'snake' ? (
          <SnakeGame />
        ) : activeChannel === '2048' ? (
          <Game2048 />
        ) : activeChannel === 'frostcraft' ? (
          <FrostCraft currentUser={currentUser} />
        ) : (
          <>
            {/* Post Input */}
            {((activeChannel === 'general') || (activeChannel === 'announcements' && (currentUser === 'CosmicMC1' || currentUser === 'ItVas')) || (activeChannel === 'videos')) && (
              <section className="bg-slate-900/50 border border-cyan-900/30 rounded-2xl p-6 shadow-lg shadow-cyan-900/10 z-10 relative">
                <h2 className="text-lg font-semibold text-cyan-100 mb-4 flex items-center">
                  <span className="bg-cyan-500/20 text-cyan-400 p-1.5 rounded-lg mr-3">
                    {activeChannel === 'videos' ? <Upload className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                  </span>
                  {activeChannel === 'announcements' ? 'Post Announcement' : activeChannel === 'videos' ? 'Upload Video' : 'Send Message'}
                </h2>
                <div className="space-y-4">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={activeChannel === 'announcements' ? "Write an announcement for the team..." : activeChannel === 'videos' ? "Video title or description..." : "Message #general"}
                    className="w-full bg-slate-950/50 border border-slate-700 rounded-xl p-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all resize-none h-20"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handlePostMessage();
                      }
                    }}
                  />
                  
                  {activeChannel === 'videos' && (
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg cursor-pointer border border-slate-700 transition-colors">
                        <Video className="w-4 h-4" />
                        <span className="text-sm font-medium">{videoFile ? 'Change Video' : 'Select Video'}</span>
                        <input 
                          type="file" 
                          accept="video/*" 
                          className="hidden" 
                          onChange={(e) => {
                            if (e.target.files?.[0]) setVideoFile(e.target.files[0]);
                          }}
                        />
                      </label>
                      {videoFile && <span className="text-sm text-cyan-400 truncate max-w-xs">{videoFile.name}</span>}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      onClick={handlePostMessage}
                      disabled={!newMessage.trim() && !videoFile}
                      className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:hover:bg-cyan-600 text-white rounded-lg font-medium transition-colors flex items-center space-x-2 shadow-lg shadow-cyan-900/20"
                    >
                      <span>{activeChannel === 'announcements' ? 'Post to Team' : activeChannel === 'videos' ? 'Upload' : 'Send'}</span>
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* Messages Feed */}
            <section className="bg-slate-900/30 border border-cyan-900/20 rounded-2xl p-6 flex flex-col z-0 relative" style={{ minHeight: '50vh' }}>
              <h2 className="text-xl font-bold text-slate-200 mb-6 flex items-center space-x-2">
                {activeChannel === 'announcements' ? <Megaphone className="w-5 h-5 text-cyan-400" /> : activeChannel === 'videos' ? <Video className="w-5 h-5 text-cyan-400" /> : <MessageSquare className="w-5 h-5 text-cyan-400" />}
                <span>{activeChannel === 'announcements' ? 'Team Announcements' : activeChannel === 'videos' ? 'Team Videos' : 'General Chat'}</span>
              </h2>
              
              <div className="flex-1 space-y-4 overflow-y-auto pr-2 pb-80">
            {(activeChannel === 'announcements' ? announcements : activeChannel === 'videos' ? videos : generalMessages).length === 0 ? (
              <div className="text-center py-16">
                <Snowflake className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-400">It's quiet... like a frozen tundra.</p>
              </div>
            ) : (
              (activeChannel === 'announcements' ? announcements : activeChannel === 'videos' ? videos : generalMessages).map((msg) => (
                <div key={msg.id} className="bg-slate-900/80 border border-slate-800 hover:border-cyan-900/50 transition-colors rounded-xl p-4 relative group">
                  {activeChannel === 'announcements' && <div className="absolute top-0 left-0 w-1 h-full rounded-l-xl bg-cyan-500/50 group-hover:bg-cyan-400 transition-colors"></div>}
                  <div className="flex justify-between items-start mb-2 pl-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-cyan-300">{msg.author}</span>
                      {msg.author === 'CosmicMC1' && (
                        <span className="text-[10px] uppercase tracking-wider bg-cyan-900/50 text-cyan-200 px-2 py-0.5 rounded-full border border-cyan-700/50">
                          Leader
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500">
                      {new Date(msg.timestamp).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p className="text-slate-300 whitespace-pre-wrap pl-2 leading-relaxed text-sm">
                    {renderMessageText(msg.text)}
                  </p>

                  {msg.videoUrl && (
                    <div className="mt-4 pl-2">
                      <video 
                        src={msg.videoUrl} 
                        controls 
                        className="rounded-lg max-h-80 w-auto bg-black/50 border border-slate-800"
                      />
                    </div>
                  )}
                  
                  {/* Reactions */}
                  <div className="flex flex-wrap items-center gap-2 mt-3 pl-2 relative">
                    {msg.reactions && Object.entries(msg.reactions).map(([emoji, users]: [string, string[]]) => (
                      <button
                        key={emoji}
                        onClick={() => handleReaction(msg.id, emoji)}
                        className={`flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium border transition-colors ${
                          users.includes(currentUser!) 
                            ? 'bg-cyan-900/40 border-cyan-500/50 text-cyan-200' 
                            : 'bg-slate-800/50 border-slate-700 hover:border-cyan-700/50 text-slate-300'
                        }`}
                        title={users.join(', ')}
                      >
                        <span>{emoji}</span>
                        <span className="opacity-80">{users.length}</span>
                      </button>
                    ))}
                    
                    <button 
                      onClick={() => setActivePickerMsgId(activePickerMsgId === msg.id ? null : msg.id)}
                      className={`p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-all border ${activePickerMsgId === msg.id ? 'opacity-100 bg-slate-800 border-slate-700 text-cyan-300' : 'opacity-0 group-hover:opacity-100 border-transparent hover:border-slate-700'}`}
                    >
                      <SmilePlus className="w-4 h-4" />
                    </button>

                    {activePickerMsgId === msg.id && (
                      <div className="absolute top-full left-0 mt-2 z-50">
                        <EmojiPicker 
                          theme={Theme.DARK} 
                          onEmojiClick={(emojiData) => handleReaction(msg.id, emojiData.emoji)} 
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>
        </section>
        </>
        )}
      </main>

      {/* Notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col space-y-3 pointer-events-none">
        {notifications.map(n => (
          <div key={n.id} className="bg-cyan-950 border border-cyan-500/50 text-cyan-50 px-4 py-3 rounded-lg shadow-xl shadow-cyan-900/20 flex items-center space-x-3 pointer-events-auto transition-all animate-in fade-in slide-in-from-bottom-5 duration-300">
            <Bell className="w-5 h-5 text-cyan-400" />
            <span className="font-medium text-sm">{n.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
