# 道具を得る: 明るく短い上がり調子（0.5 秒）
from sfxlib import *

# 琴をはじくような短い音を、上へ 4 つ並べる。最後の音だけ長く残す
def tone(name, seconds):
    f = note(name)
    return partials(f, [1, 2, 3, 4.02], [1.0, 0.4, 0.18, 0.08], seconds) * env_exp(seconds, seconds / 3)

notes = mix((tone("C6", 0.12), 0.0), (tone("E6", 0.12), 0.07), (tone("G6", 0.12), 0.14), (tone("C7", 0.34), 0.21))
sound = Sound("se_item", fade(notes, fade_out=0.05), title="道具を得る", level=-2)
