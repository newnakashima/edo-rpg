# 石段・洞窟・地下への出入り: 足音 2〜3 歩（0.4 秒）
from sfxlib import *

# 草鞋で石を踏む足音。低い当たり（かかと）に、砂を擦るざらつき（つま先）を重ねる。3 歩目は小さく遠のく
def step(gain, tilt):
    heel = lowpass(noise(0.05, "brown"), 500 * tilt) * env_exp(0.05, 0.012)
    thud = sine(sweep(120 * tilt, 70 * tilt, 0.06)) * env_exp(0.06, 0.015)
    grit = bandpass(crackle(0.06, density=500, decay=0.0015), 1500, 6000) * env_points([(0, 0.0), (0.015, 1.0), (0.06, 0.0)], 0.06)
    return mix(heel, thud * 0.7, (grit * 0.35, 0.01)) * gain

steps = mix((step(1.0, 1.0), 0.0), (step(0.85, 1.1), 0.14), (step(0.55, 0.95), 0.28))
# 石の壁に少しだけ響く
sound = Sound("se_stairs", fade(reverb(steps, seconds=0.15, wet=0.15, brightness=3000), fade_out=0.03), title="石段", level=-3)
