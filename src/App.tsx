import { OpenAI } from "openai";
import { useEffect, useState } from "react";
import { flushSync } from "react-dom";

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_KEY,
  dangerouslyAllowBrowser: true,
});

export default function App() {
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const [chunks, setChunks] = useState<BlobPart[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    if (mediaRecorder) {
      mediaRecorder.onstart = () => {
        setChunks([]);
      };
      mediaRecorder.ondataavailable = (e) => {
        // onstop happens right after ondataavailable, and we end up with a stale
        // reference to chunks. Synchronously flushing the state update fixes this.
        flushSync(() => {
          setChunks((prev) => [...prev, e.data]);
        });
      };
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/mp4" });
        const file = new File([blob], "audio.mp4", { type: "audio/mp4" });
        const transcription = await openai.audio.transcriptions.create({
          file,
          model: "whisper-1",
        });
        const response = await openai.chat.completions.create({
          messages: [{ content: transcription.text, role: "user" }],
          model: "gpt-3.5-turbo",
        });
        console.log(transcription.text);
        
        const utterance = new SpeechSynthesisUtterance(
          response.choices[0].message.content!
        );
        speechSynthesis.speak(utterance);
      };
    }
  }, [chunks, mediaRecorder]);

  return (
    <div>
      {mediaRecorder && isRecording && (
        <button
          onClick={() => {
            setIsRecording(false);
            mediaRecorder.stop();
          }}
        >
          Stop
        </button>
      )}

      {!isRecording && (
        <button
          onClick={async () => {
            if (!mediaRecorder) {
              const mediaStram = await navigator.mediaDevices.getUserMedia({
                audio: true,
              });
              const mediaRecorder = new MediaRecorder(mediaStram);
              setMediaRecorder(mediaRecorder);
              setIsRecording(true);
              mediaRecorder.start();
            } else {
              setIsRecording(true);
              mediaRecorder.start();
            }
          }}
        >
          Start
        </button>
      )}
    </div>
  );
}
