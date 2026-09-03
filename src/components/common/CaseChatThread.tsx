import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Shield,
  Scale,
  User as UserIcon,
  Clock,
  CheckCheck,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Gavel,
  FileText,
  BadgeAlert,
  Radio
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ApiClient } from '../../services/api';
import { CaseMessage, UserRole } from '../../types';

interface CaseChatThreadProps {
  caseId: string;
  caseType: 'CRIME' | 'CONSUMER';
  caseTitle?: string;
  counterpartName?: string;
  counterpartRole?: string;
  compact?: boolean;
}

export const CaseChatThread: React.FC<CaseChatThreadProps> = ({
  caseId,
  caseType,
  caseTitle,
  counterpartName,
  counterpartRole,
  compact = false
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<CaseMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isOfficialNotice, setIsOfficialNotice] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const isAuthority = user?.role === UserRole.POLICE || user?.role === UserRole.CONSUMER_RIGHTS || user?.role === UserRole.ADMIN;

  const fetchMessages = async (silent = false) => {
    if (!silent && messages.length === 0) setIsLoading(true);
    try {
      const res = await ApiClient.getCaseMessages(caseId);
      if (res.success) {
        setMessages(res.messages || []);
        setError(null);
        setLastSyncTime(new Date());
      }
    } catch (err: any) {
      if (!silent) {
        setError('Failed to load message thread. Reconnecting...');
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  // Real-time synchronization: poll every 2 seconds + on window focus
  useEffect(() => {
    fetchMessages();
    const interval = setInterval(() => fetchMessages(true), 2000);

    const handleFocus = () => fetchMessages(true);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchMessages(true);
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [caseId]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    const messageText = newMessage.trim();
    const noticeFlag = isOfficialNotice;
    setNewMessage('');
    setIsOfficialNotice(false);
    setIsSending(true);

    try {
      const res = await ApiClient.sendCaseMessage(caseId, {
        message: messageText,
        caseType,
        isOfficialNotice: noticeFlag
      });

      if (res.success && res.message) {
        setMessages(prev => {
          if (prev.some(m => m.id === res.message.id)) return prev;
          return [...prev, res.message];
        });
        setError(null);
        setTimeout(() => fetchMessages(true), 300);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send message.');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickTemplates = isAuthority
    ? caseType === 'CRIME'
      ? [
          'Requesting clearer vehicle number plate or CCTV landmark.',
          'Please visit the Thana investigation room for GD statement.',
          'Assigned patrol officer is en-route for on-site inquiry.',
          'Case formally logged under Penal Code verification.'
        ]
      : [
          'Official summons: Hearing scheduled on Sunday 11:00 AM at DNCRP office.',
          'Please upload the original printed cash memo or tax invoice.',
          'Shop owner summoned for reconciliation under Section 76.',
          'Administrative fine realized; 25% reward processing.'
        ]
    : [
        'I have additional photo evidence available.',
        'Available for phone or in-person verification anytime.',
        'I confirm I will attend the scheduled hearing date.',
        'Please let me know if any other document is required.'
      ];

  const getRoleBadge = (role: UserRole, badge?: string) => {
    switch (role) {
      case UserRole.POLICE:
        return (
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">
            {badge || 'POLICE OFFICER'}
          </span>
        );
      case UserRole.CONSUMER_RIGHTS:
        return (
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
            {badge || 'DNCRP MAGISTRATE'}
          </span>
        );
      case UserRole.ADMIN:
        return (
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
            SECURITY ADMIN
          </span>
        );
      case UserRole.CITIZEN:
      default:
        return (
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            VERIFIED CITIZEN
          </span>
        );
    }
  };

  const getMyBubbleStyle = (role?: UserRole) => {
    switch (role) {
      case UserRole.POLICE:
        return 'bg-blue-600 text-white rounded-br-none shadow-blue-900/30';
      case UserRole.CONSUMER_RIGHTS:
        return 'bg-amber-600 text-slate-950 font-medium rounded-br-none shadow-amber-900/30';
      case UserRole.ADMIN:
        return 'bg-purple-600 text-white rounded-br-none shadow-purple-900/30';
      case UserRole.CITIZEN:
      default:
        return 'bg-emerald-600 text-white rounded-br-none shadow-emerald-900/30';
    }
  };

  const getCounterpartBubbleStyle = (role: UserRole) => {
    switch (role) {
      case UserRole.POLICE:
        return 'bg-slate-900 border border-blue-500/40 text-slate-100 rounded-bl-none shadow-sm';
      case UserRole.CONSUMER_RIGHTS:
        return 'bg-slate-900 border border-amber-500/40 text-slate-100 rounded-bl-none shadow-sm';
      case UserRole.ADMIN:
        return 'bg-slate-900 border border-purple-500/40 text-slate-100 rounded-bl-none shadow-sm';
      case UserRole.CITIZEN:
      default:
        return 'bg-slate-900 border border-emerald-500/40 text-slate-100 rounded-bl-none shadow-sm';
    }
  };

  return (
    <div className={`flex flex-col bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-inner ${compact ? 'h-[440px]' : 'h-[530px]'}`}>
      {/* Header */}
      <div className="px-4 py-3 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center border shadow-sm ${
            caseType === 'CRIME' ? 'bg-blue-500/15 border-blue-500/40 text-blue-400' : 'bg-amber-500/15 border-amber-500/40 text-amber-400'
          }`}>
            {caseType === 'CRIME' ? <Shield className="w-4 h-4" /> : <Scale className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white truncate font-display">
                {caseType === 'CRIME' ? 'Police Investigation Inquiry Channel' : 'DNCRP Hearing & Dispute Communication'}
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {caseId}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 truncate mt-0.5">
              <span className="flex items-center gap-1 text-emerald-400 font-mono text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live 2-Way Connected
              </span>
              <span>•</span>
              <span className="truncate">
                {counterpartName ? `Channel with ${counterpartName}` : 'Secure Official Channel'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => fetchMessages()}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            title="Refresh Messages"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900/30">
        {isLoading && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2">
            <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
            <span className="text-xs">Connecting to secure case channel...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center px-4 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h5 className="font-bold text-slate-300 text-sm">No Inquiries Lodged Yet</h5>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                {isAuthority
                  ? 'Send an official inquiry, request missing evidence, or schedule a formal hearing with the citizen.'
                  : 'You can communicate directly with the investigating officer or magistrate regarding this case.'}
              </p>
            </div>
          </div>
        ) : (
          messages.map(msg => {
            const isMe = msg.senderId === user?.id;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in fade-in`}
              >
                {/* Message Header */}
                <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-300">{isMe ? 'You' : msg.senderName}</span>
                  {getRoleBadge(msg.senderRole, msg.senderBadge)}
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Bubble */}
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 shadow-md relative ${
                    msg.isOfficialNotice
                      ? 'bg-amber-950/50 border-2 border-amber-500 text-amber-100 ring-2 ring-amber-500/30'
                      : isMe
                      ? getMyBubbleStyle(user?.role)
                      : getCounterpartBubbleStyle(msg.senderRole)
                  }`}
                >
                  {msg.isOfficialNotice && (
                    <div className="flex items-center gap-1.5 text-amber-300 font-bold text-[10px] uppercase font-mono mb-1.5 pb-1 border-b border-amber-500/40">
                      <Gavel className="w-3.5 h-3.5 text-amber-400" />
                      <span>Formal Authority Summons & Notice</span>
                    </div>
                  )}

                  <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* Quick Inquiry Templates */}
      <div className="px-3 py-1.5 bg-slate-900/70 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto text-[11px]">
        <span className="text-[10px] font-mono text-slate-400 uppercase flex-shrink-0 flex items-center gap-1 font-semibold">
          <Sparkles className="w-3 h-3 text-emerald-400" />
          Quick Reply:
        </span>
        {quickTemplates.map((tmpl, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setNewMessage(tmpl)}
            className="px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white transition whitespace-nowrap text-[11px] border border-slate-700 flex-shrink-0 active:scale-95"
          >
            {tmpl.length > 34 ? `${tmpl.slice(0, 32)}...` : tmpl}
          </button>
        ))}
      </div>

      {/* Message Input Box */}
      <form onSubmit={handleSend} className="p-3 bg-slate-900 border-t border-slate-800 space-y-2">
        {error && (
          <div className="text-[11px] text-amber-400 flex items-center gap-1 font-medium bg-amber-950/40 px-2 py-1 rounded border border-amber-500/30">
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <textarea
            rows={2}
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isAuthority
                ? 'Type official inquiry, request missing evidence, or issue notice... (Press Enter to send)'
                : 'Reply to investigating officer with statement or clarification... (Press Enter to send)'
            }
            className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
          />

          <button
            type="submit"
            disabled={!newMessage.trim() || isSending}
            className={`px-4 py-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md active:scale-95 disabled:opacity-40 flex-shrink-0 ${
              isAuthority
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/25'
                : 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 shadow-emerald-600/25 font-extrabold'
            }`}
          >
            {isSending ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Send</span>
              </>
            )}
          </button>
        </div>

        {/* Authority Options: Mark as Official Summons / Notice */}
        {isAuthority && (
          <div className="flex items-center justify-between text-[11px] pt-1">
            <label className="flex items-center gap-1.5 text-amber-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isOfficialNotice}
                onChange={e => setIsOfficialNotice(e.target.checked)}
                className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-amber-500/20"
              />
              <span className="font-semibold">Highlight as Formal Summons / Hearing Notice</span>
            </label>
            <span className="text-slate-500 text-[10px] font-mono">
              Saved permanently to official case record
            </span>
          </div>
        )}
      </form>
    </div>
  );
};
