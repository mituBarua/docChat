"use client";

import { useState } from "react";
import DocSidebar from "./components/DocSidebar";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Document {
  id: string;
  name: string;
  size: string;
  chunks: number;
  uploadedAt: string;
}

export default function Home() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeDoc, setActiveDoc] = useState<Document | null>(null);
  const [uploading, setUploading] = useState(false);
  const [allMessages, setAllMessages] = useState<Record<string, Message[]>>({});
  const [question, setQuestion] = useState("");
  const [searching, setSearching] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  const messages = activeDoc ? allMessages[activeDoc.id] || [] : [];

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".pdf")) {
      alert("Only PDF files are supported.");
      e.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("File too large. Maximum size is 10MB.");
      e.target.value = "";
      return;
    }

    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.error || "Upload failed. Please try again.");
        return;
      }

      const newDoc: Document = {
        id: Date.now().toString(),
        name: file.name,
        size: `${Math.round(file.size / 1024)} KB`,
        chunks: data.chunks,
        uploadedAt: "just now",
      };

      setDocuments((prev) => [newDoc, ...prev]);
      setActiveDoc(newDoc);
      setAllMessages((prev) => ({
        ...prev,
        [newDoc.id]: [
          {
            role: "assistant",
            content: `I've processed **${file.name}** — ${data.chunks} chunks indexed. Ask me anything about this document.`,
          },
        ],
      }));
      setShowSidebar(false);
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSearch = async () => {
    if (!question.trim() || searching) return;

    const userMessage: Message = { role: "user", content: question };
    const updated = [...messages, userMessage];

    setAllMessages((prev) => ({
      ...prev,
      [activeDoc!.id]: updated,
    }));
    setQuestion("");
    setSearching(true);

    const res = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        history: messages.map((m) => ({ role: m.role, content: m.content })),
        filename: activeDoc?.name,
      }),
    });

    const data = await res.json();

    setAllMessages((prev) => ({
      ...prev,
      [activeDoc!.id]: [
        ...updated,
        { role: "assistant", content: data.answer },
      ],
    }));
    setSearching(false);
  };

  const handleDelete = async (docId: string, docName: string) => {
    await fetch("/api/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: docName }),
    });

    setDocuments((prev) => prev.filter((d) => d.id !== docId));

    if (activeDoc?.id === docId) {
      setActiveDoc(null);
      setAllMessages((prev) => {
        const updated = { ...prev };
        delete updated[docId];
        return updated;
      });
    }
  };

  const quickPills = [
    "Summarize document",
    "Key skills",
    "Work experience",
    "Contact info",
  ];

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#13151E] overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 bg-[#0F1117] border-r border-white/5 flex-col flex-shrink-0">
        <DocSidebar
          documents={documents}
          activeDoc={activeDoc}
          uploading={uploading}
          onUpload={handleUpload}
          onSelectDoc={(doc) => setActiveDoc(doc)}
          onDeleteDoc={handleDelete}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {showSidebar && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-72 bg-[#0F1117] flex flex-col h-full">
            <DocSidebar
              documents={documents}
              activeDoc={activeDoc}
              uploading={uploading}
              onUpload={handleUpload}
              onSelectDoc={(doc) => setActiveDoc(doc)}
              onDeleteDoc={handleDelete}
            />
          </div>
          <div
            className="flex-1 bg-black/50"
            onClick={() => setShowSidebar(false)}
          />
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <div className="flex items-center justify-between px-4 md:px-5 py-3.5 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D2B] flex-shrink-0">
          <div className="flex items-center gap-2">
            {/* Mobile menu button */}
            <button
              onClick={() => setShowSidebar(true)}
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 mr-1"
            >
              ☰
            </button>

            {activeDoc ? (
              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <span className="text-gray-400 text-xs">📄</span>
                <span className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate max-w-[120px] md:max-w-none">
                  {activeDoc.name}
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-medium hidden sm:block">
                  PDF
                </span>
              </div>
            ) : (
              <span className="text-xs text-gray-400">
                No document selected
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={() => {
                  setAllMessages((prev) => ({
                    ...prev,
                    [activeDoc!.id]: [],
                  }));
                }}
                className="text-xs px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-400 hover:text-red-500 hover:border-red-300 transition-colors hidden sm:block"
              >
                Clear chat
              </button>
            )}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                Cohere AI
              </span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-auto p-4 md:p-5 flex flex-col gap-3.5">
          {messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
              <span className="text-3xl">◆</span>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {documents.length === 0
                  ? "Upload a document to get started"
                  : "Select a document to start chatting"}
              </div>
              <div className="text-xs text-gray-400">
                Ask anything and AI will answer from your document
              </div>
              {/* Mobile upload button */}
              <label className="md:hidden mt-4 flex items-center gap-2 bg-[#534AB7] text-white px-4 py-2.5 rounded-xl cursor-pointer">
                <span>↑</span>
                <span className="text-sm font-medium">
                  {uploading ? "Processing..." : "Upload PDF"}
                </span>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`flex gap-2.5 items-start max-w-[85%] md:max-w-[80%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs text-blue-500">◆</span>
                  </div>
                )}
                <div
                  className={`px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#534AB7] text-white rounded-2xl rounded-tr-sm"
                      : "bg-white dark:bg-[#1A1D2B] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-2xl rounded-tl-sm"
                  }`}
                  dangerouslySetInnerHTML={{
                    __html: msg.content
                      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                      .replace(/\n/g, "<br/>"),
                  }}
                />
              </div>
            </div>
          ))}
          {searching && (
            <div className="flex gap-2.5 items-start">
              <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 flex items-center justify-center flex-shrink-0">
                <span className="text-xs text-blue-500">◆</span>
              </div>
              <div className="px-3.5 py-3 bg-white dark:bg-[#1A1D2B] border border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-sm flex gap-1 items-center">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-4 md:px-5 py-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D2B] flex-shrink-0">
          {activeDoc && (
            <div className="flex gap-1.5 mb-3 flex-wrap">
              {quickPills.map((pill) => (
                <button
                  key={pill}
                  onClick={() => setQuestion(pill)}
                  className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-full bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:border-[#7F77DD] hover:text-[#534AB7] transition-colors cursor-pointer"
                >
                  {pill}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2 items-center bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 focus-within:border-[#7F77DD] transition-colors">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder={
                activeDoc
                  ? "Ask anything about this document..."
                  : "Upload a document first..."
              }
              disabled={!activeDoc || searching}
              className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400"
            />
            <button
              onClick={handleSearch}
              disabled={!question.trim() || searching || !activeDoc}
              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                question.trim() && !searching && activeDoc
                  ? "bg-[#534AB7] cursor-pointer"
                  : "bg-gray-200 dark:bg-gray-700 cursor-not-allowed"
              }`}
            >
              <span className="text-white text-base">↑</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
