import wave, struct, math, os

RATE = 44100

def write_wav(path, segments):
    frames = []
    for freq, dur, vol in segments:
        n = int(RATE * dur)
        for i in range(n):
            t = i / RATE
            env = min(1.0, t * 40, (dur - t) * 40)
            v = math.sin(2 * math.pi * freq * t) * vol * env
            frames.append(struct.pack('<h', int(v * 32767)))
    with wave.open(path, 'w') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(RATE)
        f.writeframes(b''.join(frames))

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOUNDS = os.path.join(BASE, 'assets', 'sounds')
os.makedirs(SOUNDS, exist_ok=True)

# alert-timer.mp3 is a user-supplied MP3 — do not overwrite it here.

# alert-voice.mp3 is a user-supplied MP3 — do not overwrite it here.

for name in ['alert-timer.mp3', 'alert-voice.mp3']:
    p = os.path.join(SOUNDS, name)
    print(name, os.path.getsize(p), 'bytes')
