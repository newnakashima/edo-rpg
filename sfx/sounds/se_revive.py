# 生き返る・寺のお祓い: se_heal より大きく、鈴が重なる（0.6 秒）
from sfxlib import *

# 和音: se_heal と同じ澄んだ音を、1 オクターブ広く重ねる
def tone(name, seconds):
    f = note(name)
    return (sine(f, seconds) + 0.25 * sine(f * 2, seconds)) * env_adsr(seconds, attack=0.03, decay=0.1, sustain=0.6, release=0.25)

chord = mix((tone("G4", 0.55), 0.0), (tone("C5", 0.52), 0.03), (tone("E5", 0.48), 0.07), (tone("G5", 0.44), 0.11), (tone("C6", 0.4), 0.15))
# 鈴: 神楽鈴を振る。いくつもの小さな鈴が少しずつずれて鳴る
bells = silence(0.55)
for i in range(7):
    f = note("E7") * (1 + 0.04 * rng.standard_normal())
    b = modal([f, f * 2.32], decays=[0.08, 0.04], amps=[1.0, 0.4], seconds=0.3)
    bells = place(bells, b, 0.12 + i * 0.035 + 0.01 * rng.random(), gain=0.25)

# 戦闘の音なので、響きは 0.6 秒で切る
sound = Sound("se_revive", fade(trim(reverb(mix(chord, bells), seconds=0.25, wet=0.2), 0.6), fade_out=0.1), title="生き返る")
