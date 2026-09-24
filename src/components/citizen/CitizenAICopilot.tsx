import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  X,
  Sparkles,
  Scale,
  ShieldAlert,
  Barcode,
  MessageSquare,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Award,
  Minimize2,
  Maximize2,
  Cpu
} from 'lucide-react';
import { ApiClient } from '../../services/api';
import { CrimeType, CrimeSeverity, ConsumerIssueType } from '../../types';

export interface PrefillConsumerPayload {
  shopName: string;
  shopDistrict: string;
  shopThana: string;
  shopAddress: string;
  productName: string;
  issueType: ConsumerIssueType;
  mrp: string;
  pricePaid: string;
  description: string;
}

export interface PrefillCrimePayload {
  crimeType: CrimeType;
  severity: CrimeSeverity;
  district: string;
  thana: string;
  locationName: string;
  title: string;
  description: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  engine?: string;
  actions?: any[];
}

interface CitizenAICopilotProps {
  userName?: string;
  onPrefillConsumer: (payload: PrefillConsumerPayload) => void;
  onPrefillCrime: (payload: PrefillCrimePayload) => void;
  onOpenCaseChat: (caseData: { caseId: string; caseType: 'CRIME' | 'CONSUMER'; title: string; officer?: string }) => void;
  onTriggerSOS: () => void;
}

export const CitizenAICopilot: React.FC<CitizenAICopilotProps> = ({
  userName,
  onPrefillConsumer,
  onPrefillCrime,
  onOpenCaseChat,
  onTriggerSOS
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [activeEngine, setActiveEngine] = useState('4-Tier Gemini Cascade + Local SQLite RAG');
  const [suggestions, setSuggestions] = useState<string[]>([
    'Track my latest case',
    'Shop in Uttara charged 2450 BDT for 1850 BDT baby milk',
    'Verify barcode 8901030491024',
    'How does the 25% DNCRP reward work?'
  ]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'bot',
      text: `Assalamu Alaikum **${userName || 'Citizen'}**! I am your **SentinelX AI Civic & Legal Copilot**.\n\nI am connected directly to the live **Police GD**, **DNCRP Consumer Rights**, and **BSTI Barcode** databases with a **4-Tier Model Cascade**.\n\nDescribe an incident in English, Bangla, or Banglish to **auto-fill a report**, **track your live dockets**, **verify a barcode**, or **calculate your 25% DNCRP reward**!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      engine: 'SentinelX Dual-Engine Ready'
    }
  ]);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async (promptText?: string) => {
    const textToSend = (promptText ?? input).trim();
    if (!textToSend || isSending) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const nextHistory = [...messages, userMsg].map(m => ({
      sender: m.sender,
      text: m.text
    }));

    setMessages(prev => [...prev, userMsg]);
    if (!promptText) setInput('');
    setIsSending(true);

    try {
      const res = await ApiClient.askCitizenAssistant(textToSend, nextHistory);
      if (res.success) {
        if (res.engine) setActiveEngine(res.engine);
        if (res.suggestions && res.suggestions.length > 0) {
          setSuggestions(res.suggestions);
        }
        setMessages(prev => [
          ...prev,
          {
            id: `b-${Date.now()}`,
            sender: 'bot',
            text: res.reply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            engine: res.engine,
            actions: res.actions || []
          }
        ]);
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `b-err-${Date.now()}`,
          sender: 'bot',
          text: 'I encountered a temporary connection issue while reaching the server. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const renderFormattedText = (text: string) => {
    return text.split('\n').map((line, idx) => {
      const html = line
        .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
        .replace(/`(.+?)`/g, '<code class="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[11px]">$1</code>');
      return (
        <p
          key={idx}
          className={`leading-relaxed ${line.startsWith('- ') ? 'pl-2' : ''} ${idx > 0 ? 'mt-1.5' : ''}`}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    });
  };

  return (
    <>
      {/* FLOATING COMMAND ORB BUTTON */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 group flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-gradient-to-r from-[#0147bf] via-[#0284c7] to-[#02baff] text-white shadow-2xl shadow-[#02baff]/30 border border-cyan-300/40 hover:scale-[1.03] active:scale-95 transition-all"
        >
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-slate-950/40 border border-white/20">
            <Bot className="w-5 h-5 text-cyan-200" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400" />
          </div>
          <div className="text-left pr-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black font-['Orbitron'] tracking-wider">SENTINELX AI COPILOT</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            </div>
            <p className="text-[10px] text-cyan-100/90 font-mono">
              Auto-Fill • Case Tracker • 25% DNCRP Reward
            </p>
          </div>
        </button>
      )}

      {/* EXPANDABLE AI COPILOT DRAWER */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-200 flex flex-col rounded-3xl bg-[#060b16]/95 border border-[#02baff]/35 shadow-2xl shadow-black/80 backdrop-blur-xl overflow-hidden ${
            isExpanded
              ? 'bottom-4 right-4 left-4 top-16 md:left-auto md:w-[680px] md:h-[82vh]'
              : 'bottom-5 right-5 w-[94vw] sm:w-[440px] h-[630px] max-h-[85vh]'
          }`}
        >
          {/* HEADER */}
          <div className="px-4 py-3.5 bg-gradient-to-r from-[#091326] via-[#0b1b36] to-[#081224] border-b border-[#02baff]/25 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0147bf] to-[#02baff] flex items-center justify-center shadow-md shadow-[#02baff]/20">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-black text-white font-['Orbitron'] tracking-wide">
                    SENTINELX CIVIC & LEGAL COPILOT
                  </h3>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-mono">
                    LIVE DB
                  </span>
                </div>
                <p className="text-[10px] text-cyan-300/80 font-mono flex items-center gap-1 mt-0.5">
                  <Cpu className="w-3 h-3 text-cyan-400" />
                  <span>{activeEngine}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsExpanded(prev => !prev)}
                className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700/70 transition"
                title={isExpanded ? 'Compact view' : 'Expand view'}
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-rose-950/70 text-slate-300 hover:text-rose-300 border border-slate-700/70 transition"
                title="Close Copilot"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* MESSAGE STREAM */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} space-y-2`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-3 ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-[#0147bf] to-[#0284c7] text-white rounded-br-xs shadow-md'
                      : 'bg-slate-900/90 text-slate-200 border border-slate-800/90 rounded-bl-xs'
                  }`}
                >
                  {renderFormattedText(msg.text)}
                  <div className="mt-1.5 pt-1 border-t border-white/5 flex items-center justify-between gap-3 text-[9px] font-mono opacity-65">
                    <span>{msg.timestamp}</span>
                    {msg.engine && <span>{msg.engine}</span>}
                  </div>
                </div>

                {/* INTERACTIVE ACTION CARDS */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="w-full max-w-[92%] space-y-2.5">
                    {msg.actions.map((action, aIdx) => {
                      // 1. 25% DNCRP REWARD CALCULATOR CARD
                      if (action.type === 'REWARD_CALCULATOR_CARD') {
                        return (
                          <div
                            key={aIdx}
                            className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-950/50 via-slate-900 to-slate-950 border border-amber-500/40 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono font-bold text-amber-300 uppercase flex items-center gap-1.5">
                                <Award className="w-3.5 h-3.5 text-amber-400" />
                                DNCRP Section 76(4) Statutory Reward Estimate
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
                                25% Share
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
                              <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800">
                                <span className="text-[9px] text-slate-400 block">Printed MRP</span>
                                <strong className="text-slate-200">৳{action.mrp}</strong>
                              </div>
                              <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800">
                                <span className="text-[9px] text-slate-400 block">Overcharge</span>
                                <strong className="text-amber-400">+৳{action.overcharge}</strong>
                              </div>
                              <div className="p-2 rounded-xl bg-emerald-950/50 border border-emerald-500/30">
                                <span className="text-[9px] text-emerald-300 block">25% Citizen Reward</span>
                                <strong className="text-emerald-300">৳{Number(action.statutoryReward25).toLocaleString()}</strong>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // 2. 1-CLICK AUTO-FILL CONSUMER COMPLAINT CARD
                      if (action.type === 'PREFILL_CONSUMER_COMPLAINT') {
                        const p = action.payload;
                        return (
                          <div
                            key={aIdx}
                            className="p-3.5 rounded-2xl bg-slate-900/95 border border-amber-500/40 space-y-2.5 shadow-lg"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                                <Scale className="w-3.5 h-3.5 text-amber-400" />
                                Ready to Pre-Fill DNCRP Dispute Form
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">{p.shopThana}, {p.shopDistrict}</span>
                            </div>
                            <div className="text-[11px] text-slate-300 space-y-0.5 font-mono bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                              <div>Shop: <strong className="text-white">{p.shopName}</strong></div>
                              <div>Violation: <strong className="text-amber-300">{p.issueType}</strong></div>
                              <div>MRP vs Paid: <strong className="text-emerald-300">৳{p.mrp}</strong> → <strong className="text-rose-400">৳{p.pricePaid}</strong></div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                onPrefillConsumer(p);
                                setIsOpen(false);
                              }}
                              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-md"
                            >
                              <span>1-Click Auto-Fill DNCRP Complaint Form</span>
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      }

                      // 3. 1-CLICK AUTO-FILL POLICE CRIME REPORT CARD
                      if (action.type === 'PREFILL_CRIME_REPORT') {
                        const p = action.payload;
                        return (
                          <div
                            key={aIdx}
                            className="p-3.5 rounded-2xl bg-slate-900/95 border border-cyan-500/40 space-y-2.5 shadow-lg"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-cyan-300 flex items-center gap-1.5">
                                <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
                                Ready to Pre-Fill Police GD / Crime Report
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">{p.thana}, {p.district}</span>
                            </div>
                            <div className="text-[11px] text-slate-300 space-y-0.5 font-mono bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                              <div>Category: <strong className="text-white">{p.crimeType}</strong> ({p.severity})</div>
                              <div>Jurisdiction: <strong className="text-cyan-300">{p.thana} Thana, {p.district}</strong></div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                onPrefillCrime(p);
                                setIsOpen(false);
                              }}
                              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-[#0147bf] to-[#02baff] hover:from-[#013ab0] hover:to-[#00a8e8] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-md"
                            >
                              <span>1-Click Auto-Fill Police Crime Docket</span>
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      }

                      // 4. LIVE CASE STATUS CARD
                      if (action.type === 'CASE_STATUS_CARD') {
                        return (
                          <div
                            key={aIdx}
                            className="p-3.5 rounded-2xl bg-slate-900/95 border border-blue-500/35 space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono font-bold text-cyan-300 text-[11px]">
                                {action.trackingNumber}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-mono">
                                {action.status} • {action.workflowQueue}
                              </span>
                            </div>
                            <div className="text-slate-200 font-semibold">{action.title}</div>
                            <div className="text-[11px] text-slate-400">
                              Officer: <strong className="text-slate-200">{action.assignedOfficer}</strong>
                            </div>
                            <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                              {action.latestNote}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                onOpenCaseChat({
                                  caseId: action.trackingNumber || action.id,
                                  caseType: action.caseType,
                                  title: action.title,
                                  officer: action.assignedOfficer || (action.caseType === 'CONSUMER' ? 'DNCRP Directorate' : 'Investigating Officer')
                                });
                                setIsOpen(false);
                              }}
                              className="w-full py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>Open Direct Officer Chat</span>
                            </button>
                          </div>
                        );
                      }

                      // 5. BARCODE VERIFICATION CARD
                      if (action.type === 'BARCODE_VERIFICATION_CARD') {
                        const prod = action.product;
                        return (
                          <div
                            key={aIdx}
                            className={`p-3.5 rounded-2xl border space-y-1.5 ${
                              action.found && prod?.status === 'AUTHENTIC'
                                ? 'bg-emerald-950/30 border-emerald-500/40'
                                : 'bg-rose-950/30 border-rose-500/40'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[11px] text-slate-300 flex items-center gap-1.5">
                                <Barcode className="w-3.5 h-3.5" />
                                {action.barcode}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 ${
                                  action.found && prod?.status === 'AUTHENTIC'
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : 'bg-rose-500/20 text-rose-300'
                                }`}
                              >
                                {action.found && prod?.status === 'AUTHENTIC' ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3" /> BSTI AUTHENTIC
                                  </>
                                ) : (
                                  <>
                                    <AlertTriangle className="w-3 h-3" /> FLAGGED / UNVERIFIED
                                  </>
                                )}
                              </span>
                            </div>
                            {prod && (
                              <div className="text-[11px] text-slate-200 space-y-0.5 pt-1">
                                <div><strong>{prod.productName}</strong> ({prod.companyName})</div>
                                <div className="text-slate-400 font-mono">Standard: {prod.bstiStandard} • Official MRP: <strong className="text-emerald-300">৳{prod.mrp}</strong></div>
                              </div>
                            )}
                          </div>
                        );
                      }

                      // 6. EMERGENCY SOS TRIGGER CARD
                      if (action.type === 'EMERGENCY_SOS_CARD') {
                        return (
                          <div
                            key={aIdx}
                            className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/60 space-y-2"
                          >
                            <div className="text-rose-200 font-bold flex items-center gap-1.5">
                              <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
                              {action.title}
                            </div>
                            <p className="text-[11px] text-rose-100/80">{action.description}</p>
                            <button
                              type="button"
                              onClick={() => {
                                onTriggerSOS();
                                setIsOpen(false);
                              }}
                              className="w-full py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-lg shadow-rose-600/30"
                            >
                              <Radio className="w-3.5 h-3.5" />
                              <span>Open Emergency SOS Beacon Now</span>
                            </button>
                          </div>
                        );
                      }

                      return null;
                    })}
                  </div>
                )}
              </div>
            ))}

            {isSending && (
              <div className="flex items-center gap-2 text-slate-400 text-xs pl-2">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:150ms]" />
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:300ms]" />
                <span className="font-mono text-[11px]">Analyzing live dockets & Bangladesh legal code...</span>
              </div>
            )}
          </div>

          {/* QUICK SUGGESTION CHIPS */}
          <div className="px-3 py-2 bg-slate-950/90 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {suggestions.map((sug, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(sug)}
                disabled={isSending}
                className="shrink-0 px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/25 text-[10px] font-mono transition"
              >
                {sug}
              </button>
            ))}
          </div>

          {/* INPUT BAR */}
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask in English/Bangla or describe an incident to auto-fill..."
              className="sx-input flex-1 text-xs !py-2.5"
            />
            <button
              type="submit"
              disabled={!input.trim() || isSending}
              className="p-2.5 rounded-xl bg-gradient-to-r from-[#0147bf] to-[#02baff] hover:from-[#013ab0] hover:to-[#00a8e8] disabled:opacity-40 text-white transition shadow-md"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
