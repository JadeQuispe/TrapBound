"""Original TRAPBOUND score: Moonstone Passage, 16 bars at 88 BPM.

Soft plucked pentatonic melody, warm sustained chords, bass and quiet percussion.
Writes a small stereo MP3 loop. No downloaded recordings or external samples.
"""
from pathlib import Path
import subprocess
import tempfile
import wave
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
RATE=32000
BEAT=60/88
LENGTH=64*BEAT
track=np.zeros((int(LENGTH*RATE),2),dtype=np.float64)
rng=np.random.default_rng(131)

def note(midi,start,beats,level=.12,kind='pluck',pan=0):
    duration=beats*BEAT
    t=np.arange(int(duration*RATE))/RATE
    freq=440*2**((midi-69)/12)
    if kind=='pad':
        sound=(np.sin(2*np.pi*freq*t)+.24*np.sin(2*np.pi*freq*2.002*t))
        envelope=np.minimum(t/.25,1)*np.minimum((duration-t)/.4,1)
    elif kind=='bass':
        sound=np.sin(2*np.pi*freq*t)+.15*np.sin(2*np.pi*freq*2*t)
        envelope=np.minimum(t/.025,1)*np.exp(-t/1.3)*np.minimum((duration-t)/.08,1)
    else:
        sound=np.sin(2*np.pi*freq*t)+.32*np.sin(2*np.pi*freq*2*t)+.09*np.sin(2*np.pi*freq*3*t)
        envelope=np.minimum(t/.009,1)*np.exp(-t/.42)*np.minimum((duration-t)/.05,1)
    sound=sound*envelope*level
    stereo=np.column_stack((sound*np.sqrt((1-pan)/2),sound*np.sqrt((1+pan)/2)))
    start=int(start*BEAT*RATE)
    # Wrap the release into the start of the loop, avoiding a boundary click.
    for channel in range(2):np.add.at(track[:,channel],(start+np.arange(len(sound)))%len(track),stereo[:,channel])

chords=[[50,57,65,69],[46,53,62,65],[48,55,60,67],[45,52,57,64]]
melodies=[
 [74,None,77,81,79,None,77,74], [72,None,74,77,74,72,None,69],
 [72,74,None,79,77,74,72,None], [69,None,72,74,72,None,69,67],
 [74,77,None,81,84,None,81,77], [77,None,74,72,69,None,72,74],
 [79,None,77,74,72,74,None,77], [76,74,None,72,69,None,72,73]]
for bar in range(16):
    chord=chords[bar%4]
    for j,midi in enumerate(chord):note(midi,bar*4,4.4,.045,'pad',(j-1.5)/4)
    note(chord[0]-12,bar*4,1.8,.12,'bass',-.05)
    note(chord[0]-12,bar*4+2,1.5,.075,'bass',-.05)
    for step,midi in enumerate(melodies[bar%8]):
        if midi is not None:
            note(midi,bar*4+step*.5,.95,.12 if bar<8 else .105,'pluck',.12)
            note(midi,bar*4+step*.5+.375,.8,.025,'pluck',-.3)
    for step in [1,3]:
        t=np.arange(int(.045*RATE))/RATE
        click=rng.normal(0,1,len(t))*np.exp(-t*110)*.012
        at=int((bar*4+step)*BEAT*RATE)
        track[at:at+len(t),0]+=click;track[at:at+len(t),1]+=click
track=np.tanh(track*1.3)
track*=.62/max(.62,np.abs(track).max())
out=ROOT/'public/assets/audio/trapbound-theme-v131.mp3'
out.parent.mkdir(parents=True,exist_ok=True)
with tempfile.TemporaryDirectory() as temp:
    wav=Path(temp)/'moonstone-passage.wav'
    with wave.open(str(wav),'wb') as f:
        f.setnchannels(2);f.setsampwidth(2);f.setframerate(RATE)
        f.writeframes((track*32767).astype('<i2').tobytes())
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(wav),'-codec:a','libmp3lame','-b:a','96k','-metadata','title=Moonstone Passage','-metadata','artist=TRAPBOUND Original Score',str(out)],check=True)
print(f'Composed {LENGTH:.1f}s stereo fantasy loop: {out.name} ({out.stat().st_size:,} bytes).')
