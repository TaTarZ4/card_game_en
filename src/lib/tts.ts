import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const PUBLIC_DIR = path.join(process.cwd(), "public");
const AUDIO_DIR = path.join(PUBLIC_DIR, "audio");

const VOICE_ID = "eIl2aXPHqnZJIbyqXsAv"; // "George" - browse voices at elevenlabs.io/app/voice-library
const MODEL_ID = "eleven_v4";

let client: ElevenLabsClient | undefined;

// Clips being generated right now, so repeated clicks share one API call
const pending = new Map<string, Promise<EnsureAudioResult>>();

export type EnsureAudioResult = { url: string; created: boolean };

// Make sure the clip at `audioUrl` (e.g. "/audio/apple.mp3") exists under public/.
// If the file is already there it is reused; otherwise it is generated with ElevenLabs.
export async function ensureAudio(text: string, audioUrl: string): Promise<EnsureAudioResult> {
  const file = path.join(PUBLIC_DIR, audioUrl);
  // Only ever write inside public/audio
  if (!file.startsWith(AUDIO_DIR + path.sep) || !file.endsWith(".mp3")) {
    throw new Error(`Invalid audio path: ${audioUrl}`);
  }

  if (await exists(file)) return { url: audioUrl, created: false };

  let job = pending.get(file);
  if (!job) {
    job = generate(text, audioUrl, file).finally(() => pending.delete(file));
    pending.set(file, job);
  }
  return job;
}

async function generate(text: string, audioUrl: string, file: string): Promise<EnsureAudioResult> {
  client ??= new ElevenLabsClient(); // reads ELEVENLABS_API_KEY
  const stream = await client.textToSpeech.convert(VOICE_ID, {
    text,
    modelId: MODEL_ID,
    outputFormat: "mp3_44100_128",
  });
  const audio = Buffer.from(await new Response(stream).arrayBuffer());

  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, audio);
  return { url: audioUrl, created: true };
}

async function exists(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}
