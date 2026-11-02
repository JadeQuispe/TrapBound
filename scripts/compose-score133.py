"""Original looping dungeon and suspense scores, synthesized without samples."""
from pathlib import Path
import subprocess, tempfile, wave
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
RATE=32000
for mode,bpm,title in [('run',86,'Below the Moonstone'),('duel',128,'The Closing Rift'),('danger',100,'One Ember Remains')]:
    beat=60/bpm; length=64*beat; mix=np.zeros((int(length*RATE),2)); rng=np.random.default_rng(133)
    def note(midi,at,duration,level=.1,kind='bell',pan=0):
        t=np.arange(int(duration*beat*RATE))/RATE; f=440*2**((midi-69)/12)
        if kind=='pad':
            signal=np.sin(2*np.pi*f*t)+.18*np.sin(2*np.pi*f*1.003*t)
            env=np.minimum(t/.2,1)*np.minimum((duration*beat-t)/.3,1)
        elif kind=='drum':
            signal=np.sin(2*np.pi*(f*t+25*.03*(1-np.exp(-t/.03))))
            env=np.minimum(t/.004,1)*np.exp(-t*15)
        else:
            signal=np.sin(2*np.pi*f*t)+.22*np.sin(2*np.pi*f*2*t)+.08*np.sin(2*np.pi*f*3*t)
            env=np.minimum(t/.008,1)*np.exp(-t*(6 if kind=='bell' else 10))
        sound=signal*env*level; idx=(int(at*beat*RATE)+np.arange(len(t)))%len(mix)
        for ch,gain in enumerate([np.sqrt((1-pan)/2),np.sqrt((1+pan)/2)]):np.add.at(mix[:,ch],idx,sound*gain)
    # Minor harmony, sustained low strings and sparse pentatonic dungeon bells.
    roots=[38,38,34,37,38,41,34,37]
    melody=[62,69,65,72,70,65,61,69]
    for bar in range(16):
        root=roots[bar%8]; at=bar*4
        for j,offset in enumerate([0,7,12,15]):note(root+offset,at,4.5,.045 if mode=='run' else .06,'pad',(j-1.5)*.22)
        if mode=='run':
            for step in [0,1.5,3]:note(melody[(bar+int(step))%8],at+step,1.4,.085,'bell',.25 if bar%2 else -.25)
            note(root-12,at,1,.1,'drum')
        else:
            # Alternating semitones, low ostinato and accelerating percussion.
            for step in range(8):
                pitch=root+12+[0,7,12,7,1,7,12,7][step]
                note(pitch,at+step*.5,.43,.095 if mode=='duel' else .07,'pulse',(-1 if step%2 else 1)*.15)
            for step in [0,1,2,3]:
                note(root-12,at+step,.8,.2 if mode=='duel' else .12,'drum')
            if bar%4==3:note(root+25,at+3,1.2,.065,'pad')
            for step in range(4):
                t=np.arange(int(.06*RATE))/RATE; sound=rng.normal(0,1,len(t))*np.exp(-t*65)*.025
                idx=(int((at+step+.5)*beat*RATE)+np.arange(len(t)))%len(mix)
                for ch in [0,1]:np.add.at(mix[:,ch],idx,sound)
    # Small wrapped echoes produce a continuous loop without an abrupt tail.
    mix+=np.roll(mix,int(.75*beat*RATE),axis=0)*.12
    mix=np.tanh(mix*1.5);mix*=.62/max(.62,np.abs(mix).max())
    out=ROOT/f'public/assets/audio/trapbound-{mode}-v133.mp3'
    with tempfile.TemporaryDirectory() as tmp:
        wav=Path(tmp)/'loop.wav'
        with wave.open(str(wav),'wb') as f:
            f.setnchannels(2);f.setsampwidth(2);f.setframerate(RATE);f.writeframes((mix*32767).astype('<i2').tobytes())
        subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(wav),'-codec:a','libmp3lame','-b:a','96k','-metadata','title='+title,'-metadata','artist=TRAPBOUND Original Score',str(out)],check=True)
    print(f'{title}: {length:.1f}s, {out.stat().st_size:,} bytes')
