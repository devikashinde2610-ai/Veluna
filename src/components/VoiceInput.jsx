import { useEffect, useMemo, useRef, useState } from 'react'
import { MessageCircleHeart, Mic, Send, Sparkles, X } from 'lucide-react'
import { GROQ_KEY } from '../lib/supabase.js'

const WELCOME_MESSAGE =
  'Hi! I am Veluna, your personal health assistant. You can ask me anything about your cycle, symptoms, or health. Or just tap the mic and speak!'

const SUGGESTED_PROMPTS = [
  'How are you feeling today?',
  'Would you like to log your period?',
  'Have you noticed any new symptoms?',
  'Would you like a health tip for your current cycle phase?',
]

function appendTranscript(current, next) {
  const trimmedCurrent = current.trim()
  const trimmedNext = next.trim()

  if (!trimmedNext) {
    return current
  }

  return trimmedCurrent ? `${trimmedCurrent} ${trimmedNext}` : trimmedNext
}

export default function VoiceInput() {
  const recognitionRef = useRef(null)
  const finalTranscriptRef = useRef('')
  const draftRef = useRef('')
  const scrollRef = useRef(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [isSpeechSupported, setIsSpeechSupported] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: WELCOME_MESSAGE,
    },
  ])
  const [isLoading, setIsLoading] = useState(false)

  const SpeechRecognitionApi = useMemo(
    () => window.SpeechRecognition || window.webkitSpeechRecognition || null,
    [],
  )

  useEffect(() => {
    draftRef.current = draft
  }, [draft])

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, isPanelOpen])

  useEffect(() => {
    if (!SpeechRecognitionApi) {
      setIsSpeechSupported(false)
      return undefined
    }

    setIsSpeechSupported(true)

    const recognition = new SpeechRecognitionApi()
    recognition.lang = 'en-IN'
    recognition.interimResults = true
    recognition.continuous = false

    recognition.onstart = () => {
      finalTranscriptRef.current = ''
      setIsListening(true)
      setIsPanelOpen(true)
    }

    recognition.onresult = (event) => {
      let interim = ''

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index]
        const transcript = result[0]?.transcript ?? ''

        if (result.isFinal) {
          finalTranscriptRef.current = appendTranscript(finalTranscriptRef.current, transcript)
        } else {
          interim = appendTranscript(interim, transcript)
        }
      }

      setDraft(appendTranscript(finalTranscriptRef.current, interim))
    }

    recognition.onerror = () => {
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
      const transcript = finalTranscriptRef.current.trim() || draftRef.current.trim()

      finalTranscriptRef.current = ''
      setDraft('')

      if (transcript) {
        void sendMessage(transcript)
      }
    }

    recognitionRef.current = recognition

    return () => {
      recognition.stop()
      recognitionRef.current = null
    }
  }, [SpeechRecognitionApi])

  async function sendMessage(messageText) {
    const trimmedMessage = messageText.trim()

    if (!trimmedMessage || isLoading) {
      return
    }

    const nextUserMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmedMessage,
    }

    const nextConversation = [...messages, nextUserMessage]
    setMessages(nextConversation)
    setDraft('')
    setIsLoading(true)

    try {
      if (!GROQ_KEY) {
        throw new Error('Missing Groq API key.')
      }

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content:
                "You are Veluna, a warm and caring women's health assistant built into the Veluna app. You have access to these features in the app: Dashboard (shows period countdown, cycle phase, today's tip), Log Period (log period start and end dates, flow and symptoms), Analysis (AI health analysis using blood reports and health data), Diet (log meals and get nutrition feedback), Symptoms (track daily symptoms), Wellness (exercises and meditation for period pain), and Learn (education about periods, menopause and cycle health).\nWhen users ask about tracking periods, logging symptoms, or anything health related always guide them to the relevant page inside Veluna. For example if someone asks when their next period is say: You can check your Dashboard which shows your next predicted period date. If someone wants to log their period say: Go to the Log Period page from the sidebar to record your dates and symptoms. Never suggest external apps like Flo, Clue or any other app. Always keep the user inside Veluna. Be warm, friendly and supportive. Keep responses to 2-3 sentences maximum. Never diagnose medical conditions - suggest the Analysis page for health insights and recommend seeing a doctor for medical concerns.",
            },
            ...nextConversation.map((message) => ({
              role: message.role === 'assistant' ? 'assistant' : 'user',
              content: message.text,
            })),
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      })

      if (!response.ok) {
        throw new Error('Veluna Assistant could not respond right now.')
      }

      const result = await response.json()
      const reply = result.choices?.[0]?.message?.content?.trim()

      if (!reply) {
        throw new Error('No response was returned by Veluna Assistant.')
      }

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: reply,
        },
      ])
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          text:
            error.message ||
            'I could not answer just now. Please try again, and for urgent medical concerns talk to a doctor.',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    await sendMessage(draft)
  }

  const handleToggleListening = () => {
    if (!isSpeechSupported || !recognitionRef.current || isLoading) {
      return
    }

    if (isListening) {
      recognitionRef.current.stop()
      return
    }

    recognitionRef.current.start()
  }

  return (
    <div className="voice-input-root">
      {isPanelOpen ? (
        <section className="voice-assistant-panel" aria-label="Veluna Assistant">
          <header className="voice-assistant-header">
            <div className="voice-assistant-title-group">
              <div className="voice-assistant-title-row">
                <h2>Veluna Assistant</h2>
                <span className="voice-assistant-online" aria-hidden="true"></span>
              </div>
              <p>Online and ready to help</p>
            </div>
            <button
              type="button"
              className="voice-assistant-close"
              onClick={() => setIsPanelOpen(false)}
              aria-label="Close Veluna Assistant"
            >
              <X size={18} strokeWidth={2} />
            </button>
          </header>

          <div className="voice-assistant-messages" ref={scrollRef}>
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={`voice-message-row${message.role === 'user' ? ' is-user' : ''}`}
              >
                <article className={`voice-message-bubble${message.role === 'user' ? ' is-user' : ' is-assistant'}`}>
                  {message.text}
                </article>
                {index === 0 && message.role === 'assistant' ? (
                  <div className="voice-suggestion-list">
                    {SUGGESTED_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        className="voice-suggestion-chip"
                        onClick={() => void sendMessage(prompt)}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}

            {isLoading ? (
              <div className="voice-message-row">
                <article className="voice-message-bubble is-assistant is-loading">
                  Veluna is thinking...
                </article>
              </div>
            ) : null}
          </div>

          <form className="voice-assistant-input-row" onSubmit={handleSubmit}>
            <input
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask about your cycle, symptoms, or wellness..."
            />
            <button
              type="button"
              className={`voice-assistant-mic${isListening ? ' is-listening' : ''}`}
              onClick={handleToggleListening}
              aria-label={isSpeechSupported ? 'Speak to Veluna Assistant' : 'Speech input unavailable'}
              disabled={!isSpeechSupported || isLoading}
            >
              <Mic size={18} strokeWidth={2} />
            </button>
            <button
              type="submit"
              className="voice-assistant-send"
              aria-label="Send message"
              disabled={isLoading || !draft.trim()}
            >
              <Send size={18} strokeWidth={2} />
            </button>
          </form>
        </section>
      ) : null}

      <button
        type="button"
        className="voice-input-button"
        onClick={() => setIsPanelOpen((current) => !current)}
        aria-label={isPanelOpen ? 'Close Veluna Assistant' : 'Open Veluna Assistant'}
      >
        <Sparkles size={24} strokeWidth={2} />
        <span className="voice-input-button-icon-fallback" aria-hidden="true">
          <MessageCircleHeart size={24} strokeWidth={2} />
        </span>
      </button>
    </div>
  )
}
