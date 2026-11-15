# 回復: 柔らかく上がる澄んだ和音（0.5 秒）
from sfxlib import *

# 柔らかく立ち上がる澄んだ音を、下から順に重ねて和音にする
def tone(name, seconds):
    f = note(name)
    return (sine(f, seconds) + 0.25 * sine(f * 2, seconds)) * env_adsr(seconds, attack=0.03, decay=0.08,
                                                                      sustain=0.6, release=0.2)

chord = mix((tone("C5", 0.45), 0.0), (tone("E5", 0.4), 0.05), (tone("G5", 0.35), 0.1), (tone("C6", 0.3), 0.15))
# きらめき: 高いところで小さく揺れる
shimmer = tremolo(sine(note("G7"), 0.35) * env_adsr(0.35, attack=0.05, release=0.2), 12, 0.6) * 0.08

sound = Sound("se_heal", fade(mix(chord, (shimmer, 0.12)), fade_out=0.06), title="回復", level=-2)
