"""Original adventure and urgent combat loops; synthesized instruments, no samples."""
from pathlib import Path
import subprocess, tempfile, wave
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
RATE = 32000
for mode, bpm, title in [('run', 108, 'Beyond the Ruins'), ('duel', 152, 'Rift Pursuit')]:
    beat = 60 / bpm
    mix = np.zeros((round(64 * beat * RATE), 2))
    rng = np.random.default_rng(138)
    def note(midi, at, duration, level, kind='strings', pan=0):
        t = np.arange(round(duration * beat * RATE)) / RATE
        f = 440 * 2 ** ((midi - 69) / 12)
        release = np.minimum((duration * beat - t) / .035, 1)
        if kind == 'drum':
            sound = np.sin(2*np.pi*(f*t+2.5*(1-np.exp(-t/.028))))
            env = (1-np.exp(-t/.003))*np.exp(-t*13)
        elif kind == 'snare':
            sound = rng.normal(0, 1, len(t))*.65 + np.sin(2*np.pi*180*t)*.35
            env = (1-np.exp(-t/.002))*np.exp(-t*32)
        elif kind == 'hat':
            noise = rng.normal(0, 1, len(t))
            sound = noise-np.roll(noise, 1)
            env = (1-np.exp(-t/.001))*np.exp(-t*80)
        else:
            harmonics = 5 if kind == 'horn' else 4
            sound = sum(np.sin(2*np.pi*f*h*t)/h**1.3 for h in range(1, harmonics+1))
            env = np.minimum(t/(.045 if kind == 'horn' else .009), 1)*release
            env *= np.exp(-t*(1.2 if kind == 'horn' else 7))
        sound *= env*level
        idx = (round(at*beat*RATE)+np.arange(len(t))) % len(mix)
        for channel, gain in enumerate([np.sqrt((1-pan)/2), np.sqrt((1+pan)/2)]):
            np.add.at(mix[:, channel], idx, sound*gain)
    roots = [38, 34, 41, 36, 38, 41, 34, 37]
    adventure = [[62,65,69,74,72,69,67,65], [70,69,65,62,65,67,69,72],
                 [65,69,72,77,76,72,69,65], [64,67,71,74,73,69,67,61]]
    for bar in range(16):
        root, at = roots[bar%8], bar*4
        for step in range(16 if mode == 'duel' else 8):
            interval = ([0,7,12,7,1,7,12,15] if mode == 'duel' else [0,7,12,15,12,7,14,7])[step%8]
            note(root+12+interval, at+step*(.25 if mode=='duel' else .5), .23 if mode=='duel' else .42, .1, pan=(-1 if step%2 else 1)*.28)
        for step in [0, 1.5, 2, 3.5] if mode == 'duel' else [0, 2, 3]:
            note(31, at+step, .7, .32 if mode=='duel' else .2, 'drum')
        for step in [1,3]:
            note(50, at+step, .35, .12 if mode=='duel' else .065, 'snare')
        for step in range(8):
            note(80, at+step*.5, .15, .025 if mode=='duel' else .012, 'hat', .3)
        if mode == 'run':
            for step in range(4):
                pitch = adventure[bar%4][(step+4*(bar//4%2))%8]
                note(pitch, at+step, .85, .095, 'horn', -.08)
        else:
            for offset in [0,7,13]:
                note(root+offset, at, .8, .075, 'horn', -.15)
            if bar%2:
                for step in [3,3.25,3.5,3.75]:
                    note(43, at+step, .2, .16, 'drum')
            if bar%4 == 3:
                for step in range(4):
                    note(root+24+step, at+step, .65, .085, 'horn', .15)
    mix += np.roll(mix, round(.75*beat*RATE), axis=0)*.13
    mix = np.tanh(mix*1.7)
    mix *= .82/max(.82, np.abs(mix).max())
    out = ROOT/f'public/assets/audio/trapbound-{mode}-v138.mp3'
    with tempfile.TemporaryDirectory() as temp:
        wav = Path(temp)/'score.wav'
        with wave.open(str(wav), 'wb') as f:
            f.setnchannels(2); f.setsampwidth(2); f.setframerate(RATE)
            f.writeframes((mix*32767).astype('<i2').tobytes())
        subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(wav),'-codec:a','libmp3lame','-b:a','96k','-metadata','title='+title,'-metadata','artist=TRAPBOUND Original Score',str(out)],check=True)
    print(f'{title}: {64*beat:.1f}s, {bpm} BPM, {out.stat().st_size:,} bytes')
