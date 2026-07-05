'use client'

import { useState } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Document {
  id: string
  name: string
  size: string
  chunks: number
  uploadedAt: string
}

export default function Home() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [activeDoc, setActiveDoc] = useState<Document | null>(null)
  const [uploading, setUploading] = useState(false)

  const [allMessages, setAllMessages] = useState<Record<string, Message[]>>({})

  const [question, setQuestion] = useState('')
  const [searching, setSearching] = useState(false)
  const messages = activeDoc ? (allMessages[activeDoc.id] || []) : []
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return


    if (!file.name.endsWith('.pdf')) {
      alert('Only PDF files are supported.')
      e.target.value = ''
      return
    }


    if (file.size > 10 * 1024 * 1024) {
      alert('File too large. Maximum size is 10MB.')
      e.target.value = ''
      return
    }

    setUploading(true)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        alert(data.error || 'Upload failed. Please try again.')
        return
      }

      const newDoc: Document = {
        id: Date.now().toString(),
        name: file.name,
        size: `${Math.round(file.size / 1024)} KB`,
        chunks: data.chunks,
        uploadedAt: 'just now',
      }

      setDocuments(prev => [newDoc, ...prev])
      setActiveDoc(newDoc)
      setAllMessages(prev => ({
        ...prev,
        [newDoc.id]: [{
          role: 'assistant',
          content: `I've processed **${file.name}** — ${data.chunks} chunks indexed. Ask me anything about this document.`
        }]
      }))

    } catch {
      alert('Something went wrong. Please try again.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleSearch = async () => {
    if (!question.trim() || searching) return

    const userMessage: Message = { role: 'user', content: question }
    const updated = [...messages, userMessage]

    setAllMessages(prev => ({
      ...prev,
      [activeDoc!.id]: updated
    }))
    setQuestion('')
    setSearching(true)

    const res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        history: messages.map(m => ({ role: m.role, content: m.content })),
        filename: activeDoc?.name,
      }),
    })

    const data = await res.json()

    setAllMessages(prev => ({
      ...prev,
      [activeDoc!.id]: [...updated, { role: 'assistant', content: data.answer }]
    }))
    setSearching(false)
  }

  const handleDelete = async (docId: string, docName: string) => {

    await fetch('/api/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: docName }),
    })


    setDocuments(prev => prev.filter(d => d.id !== docId))


    if (activeDoc?.id === docId) {
      setActiveDoc(null)
      setAllMessages(prev => {
        const updated = { ...prev }
        delete updated[docId]
        return updated
      })
    }
  }
  const quickPills = ['Summarize document', 'Key skills', 'Work experience', 'Contact info']

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#13151E]">

      <div className="w-64 bg-[#0F1117] border-r border-white/5 flex flex-col flex-shrink-0">


        <div className="p-4 pb-3">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#534AB7] to-[#7F77DD] flex items-center justify-center text-white text-sm">
              ✦
            </div>
            <span className="text-white font-medium text-sm">
              <span className="text-[#AFA9EC]">Doc</span>Chat
            </span>
          </div>

          {/* Upload */}
          <label className="flex items-center gap-2 border border-dashed border-white/10 rounded-xl p-3 cursor-pointer hover:border-[#7F77DD]/40 hover:bg-[#7F77DD]/5 transition-all">
            <div className="w-8 h-8 rounded-lg bg-[#7F77DD]/10 flex items-center justify-center flex-shrink-0">
              <span className="text-[#AFA9EC] text-sm">↑</span>
            </div>
            <div>
              <div className="text-xs font-medium text-white/70">
                {uploading ? 'Processing...' : 'Upload document'}
              </div>
              <div className="text-xs text-white/30">PDF up to 10MB</div>
            </div>
            <input
              type="file"
              accept=".pdf"
              onChange={handleUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>


        <div className="text-[10px] font-medium text-white/20 px-4 py-2 uppercase tracking-widest">
          Your documents
        </div>

        <div className="flex-1 overflow-auto px-2 pb-2">
          {documents.length === 0 && (
            <div className="text-xs text-white/20 text-center py-8 px-3">
              No documents yet
            </div>
          )}
          {documents.map(doc => (
            <div
              key={doc.id}
              onClick={() => setActiveDoc(doc)}
              className={`flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer mb-1 transition-all group ${activeDoc?.id === doc.id
                  ? 'bg-[#534AB7]/15'
                  : 'hover:bg-white/4'
                }`}
            >
              <div className="w-8 h-10 rounded-md bg-[#1A1D2B] border border-white/8 flex items-center justify-center flex-shrink-0">
                <span className={`text-sm ${activeDoc?.id === doc.id ? 'text-[#AFA9EC]' : 'text-white/25'}`}>📄</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-medium truncate ${activeDoc?.id === doc.id ? 'text-[#AFA9EC]' : 'text-white/75'}`}>
                  {doc.name}
                </div>
                <div className={`text-[10px] ${activeDoc?.id === doc.id ? 'text-[#534AB7]/60' : 'text-white/25'}`}>
                  {doc.size} · {doc.chunks} chunks · {doc.uploadedAt}
                </div>
              </div>
              {activeDoc?.id === doc.id && (
                <div className="w-1.5 h-1.5 rounded-full bg-[#534AB7] flex-shrink-0 group-hover:hidden" />
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(doc.id, doc.name)
                }}
                className={`w-5 h-5 rounded flex items-center justify-center hover:bg-red-500/20 text-red-400 flex-shrink-0 transition-all ${activeDoc?.id === doc.id ? 'opacity-0 group-hover:opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>


        <div className="p-3.5 border-t border-white/5">
          <div className="flex justify-between mb-1.5">
            <span className="text-[10px] text-white/25">Storage</span>
            <span className="text-[10px] text-white/25">
              {documents.reduce((acc, d) => acc + parseInt(d.size), 0)} KB / 5 MB
            </span>
          </div>
          <div className="h-0.5 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full w-[35%] bg-[#534AB7] rounded-full" />
          </div>
        </div>
      </div>


      <div className="flex-1 flex flex-col overflow-hidden">


        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D2B] flex-shrink-0">
          <div>
            {activeDoc ? (
              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <span className="text-gray-400 text-xs">📄</span>
                <span className="text-xs font-medium text-gray-800 dark:text-gray-200">{activeDoc.name}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-medium">PDF</span>
              </div>
            ) : (
              <span className="text-xs text-gray-400">No document selected</span>
            )}
          </div>
          <div className="flex items-center gap-2">

            {messages.length > 0 && (
              <button
                onClick={() => {
                  setAllMessages(prev => ({
                    ...prev,
                    [activeDoc!.id]: []
                  }))
                }}
                className="text-xs px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-400 hover:text-red-500 hover:border-red-300 transition-colors"
              >
                Clear chat
              </button>
            )}


            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-xs text-gray-500 dark:text-gray-400">Cohere AI</span>
            </div>
          </div>
        </div>


        <div className="flex-1 overflow-auto p-5 flex flex-col gap-3.5">
          {messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
              <span className="text-3xl">✦</span>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Upload a document to get started</div>
              <div className="text-xs text-gray-400">Ask anything and AI will answer from your document</div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex gap-2.5 items-start max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs text-blue-500">✦</span>
                  </div>
                )}
                <div
                  className={`px-3.5 py-2.5 text-sm leading-relaxed ${msg.role === 'user'
                      ? 'bg-[#534AB7] text-white rounded-2xl rounded-tr-sm'
                      : 'bg-white dark:bg-[#1A1D2B] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-2xl rounded-tl-sm'
                    }`}
                  dangerouslySetInnerHTML={{
                    __html: msg.content
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\n/g, '<br/>')
                  }}
                />
              </div>
            </div>
          ))}
          {searching && (
            <div className="flex gap-2.5 items-start">
              <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 flex items-center justify-center flex-shrink-0">
                <span className="text-xs text-blue-500">✦</span>
              </div>
              <div className="px-3.5 py-3 bg-white dark:bg-[#1A1D2B] border border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-sm flex gap-1 items-center">
                {[0, 1, 2].map(i => (
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


        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A1D2B] flex-shrink-0">
          {activeDoc && (
            <div className="flex gap-1.5 mb-3 flex-wrap">
              {quickPills.map(pill => (
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
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder={activeDoc ? 'Ask anything about this document...' : 'Upload a document first...'}
              disabled={!activeDoc || searching}
              className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400"
            />
            <button
              onClick={handleSearch}
              disabled={!question.trim() || searching || !activeDoc}
              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${question.trim() && !searching && activeDoc
                  ? 'bg-[#534AB7] cursor-pointer'
                  : 'bg-gray-200 dark:bg-gray-700 cursor-not-allowed'
                }`}
            >
              <span className="text-white text-base">↑</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}