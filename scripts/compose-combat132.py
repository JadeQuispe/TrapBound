"""Original reactive TRAPBOUND music: Rift Duel and Last Ember.
Generated entirely from synthesized instruments, with wrapped loop releases.
"""
from pathlib import Path
import tempfile, subprocess, wave
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
RATE=32000
for mode,bpm,title in [('duel',112,'Rift Duel'),('danger',114,'Last Ember')]:
    beat=60/bpm;length=32*beat;mix=np.zeros((int(length*RATE),2));rng=np.random.default_rng(132)
    def add(midi,at,beats,level=.1,kind='pluck',pan=0):
        duration=beats*beat;t=np.arange(int(duration*RATE))/RATE;f=440*2**((midi-69)/12)
        if kind=='pad':
            s=np.sin(2*np.pi*f*t)+.2*np.sin(2*np.pi*2.001*f*t)
            env=np.minimum(t/.1,1)*np.minimum((duration-t)/.18,1)
        elif kind=='pulse':
            s=np.sin(2*np.pi*f*t)+.24*np.sin(2*np.pi*2*f*t);env=np.minimum(t/.006,1)*np.exp(-t*12)
        else:
            s=np.sin(2*np.pi*f*t)+.35*np.sin(2*np.pi*2*f*t)+.1*np.sin(2*np.pi*3*f*t)
            env=np.minimum(t/.006,1)*np.exp(-t*7)*np.minimum((duration-t)/.03,1)
        s=s*env*level;i=(int(at*beat*RATE)+np.arange(len(s)))%len(mix)
        np.add.at(mix[:,0],i,s*np.sqrt((1-pan)/2));np.add.at(mix[:,1],i,s*np.sqrt((1+pan)/2))
    chords=[[50,57,62,65],[51,58,63,66],[46,53,58,62],[45,52,61,64]]
    lead=[[74,None,77,76,74,69,None,72],[75,74,None,70,75,None,78,77],[74,72,70,None,65,70,74,None],[73,None,76,73,69,None,67,73]]
    for bar in range(8):
        chord=chords[bar%4]
        for j,n in enumerate(chord):add(n,bar*4,4.2,.035,'pad',(j-1.5)/4)
        for step in range(8):
            add(chord[step%4]+(12 if mode=='duel' else 0),bar*4+step*.5,.48,.08,'pluck',(-1 if step%2 else 1)*.2)
        for step,n in enumerate(lead[bar%4]):
            if n is not None:add(n+(0 if mode=='duel' else -12),bar*4+step*.5,.7,.105 if mode=='duel' else .07,'pluck',.1)
        for step in range(4):
            add(chord[0]-12,bar*4+step,.6,.16 if mode=='danger' else .12,'pulse')
            if mode=='danger':add(chord[0]-12,bar*4+step+.23,.35,.06,'pulse')
            t=np.arange(int(.035*RATE))/RATE;s=rng.normal(0,1,len(t))*np.exp(-t*130)*.018
            at=int((bar*4+step+.5)*beat*RATE);mix[at:at+len(t),0]+=s;mix[at:at+len(t),1]+=s
    mix=np.tanh(mix*1.4);mix*=.6/max(.6,np.abs(mix).max())
    out=ROOT/f'public/assets/audio/trapbound-{mode}-v132.mp3';out.parent.mkdir(parents=True,exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        wav=Path(tmp)/'score.wav'
        with wave.open(str(wav),'wb') as f:
            f.setnchannels(2);f.setsampwidth(2);f.setframerate(RATE);f.writeframes((mix*32767).astype('<i2').tobytes())
        subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(wav),'-codec:a','libmp3lame','-b:a','96k','-metadata','title='+title,'-metadata','artist=TRAPBOUND Original Score',str(out)],check=True)
    print(f'{title}: {length:.1f}s, {out.stat().st_size:,} bytes')
