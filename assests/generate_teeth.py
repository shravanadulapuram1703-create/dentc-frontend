#!/usr/bin/env python3
"""
Generate a professional set of realistic 3D-styled tooth SVG assets
for use in dental-chart / clinical UIs (matches the reference style:
glossy enamel crown + anatomical brown/cream roots + soft pink gum).

Each tooth is a standalone, scalable SVG. Colors are exposed as CSS
custom properties (with fallbacks) so the assets can be re-themed in code:
    --enamel-hi, --enamel-mid, --enamel-lo   (crown)
    --root-hi, --root-mid, --root-lo         (roots)

Canonical orientation: crown UP, roots DOWN (a natural standing tooth).
Flip vertically (scaleY -1) for the upper arch.
"""

import os

OUT = os.path.dirname(os.path.abspath(__file__))
VBW, VBH = 100, 200


def defs(uid):
    return f"""
  <defs>
    <linearGradient id="enamel{uid}" x1="0.15" y1="0.05" x2="0.9" y2="0.95">
      <stop offset="0"   stop-color="var(--enamel-hi, #ffffff)"/>
      <stop offset="0.45" stop-color="var(--enamel-mid, #eef3f6)"/>
      <stop offset="1"   stop-color="var(--enamel-lo, #c9d6dd)"/>
    </linearGradient>
    <radialGradient id="sheen{uid}" cx="0.34" cy="0.26" r="0.5">
      <stop offset="0"   stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="0.6" stop-color="#ffffff" stop-opacity="0.25"/>
      <stop offset="1"   stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="root{uid}" x1="0.2" y1="0" x2="0.8" y2="1">
      <stop offset="0"    stop-color="var(--root-hi, #f3e6cb)"/>
      <stop offset="0.45" stop-color="var(--root-mid, #d9b079)"/>
      <stop offset="1"    stop-color="var(--root-lo, #a9743c)"/>
    </linearGradient>
    <linearGradient id="rootHi{uid}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0"    stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="0.38" stop-color="#fff7e8" stop-opacity="0.6"/>
      <stop offset="0.55" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="1"    stop-color="#5e3a18" stop-opacity="0.28"/>
    </linearGradient>
    <linearGradient id="neck{uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#6b4a22" stop-opacity="0"/>
      <stop offset="1" stop-color="#6b4a22" stop-opacity="0.33"/>
    </linearGradient>
    <filter id="soft{uid}" x="-30%" y="-15%" width="160%" height="130%">
      <feDropShadow dx="0" dy="3" stdDeviation="3.2"
                    flood-color="#1c2b33" flood-opacity="0.28"/>
    </filter>
  </defs>"""


def svg(uid, body, title):
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {VBW} {VBH}" role="img" aria-label="{title}">
  <title>{title}</title>{defs(uid)}
  <g filter="url(#soft{uid})">
{body}
  </g>
</svg>
"""


def crown(uid, d):
    return (
        f'    <path d="{d}" fill="url(#enamel{uid})" stroke="#b3c3cb" '
        f'stroke-width="0.6"/>\n'
        f'    <path d="{d}" fill="url(#neck{uid})"/>\n'
        f'    <path d="{d}" fill="url(#sheen{uid})"/>'
    )


def root(uid, paths):
    out = []
    for d in paths:
        out.append(
            f'    <path d="{d}" fill="url(#root{uid})" stroke="#8a5a2b" '
            f'stroke-width="0.5"/>\n'
            f'    <path d="{d}" fill="url(#rootHi{uid})"/>'
        )
    return "\n".join(out)


TEETH = {}

TEETH["1-central-incisor"] = dict(
    title="Central incisor",
    crown="M28,92 C25,72 24,46 27,26 C28,18 31,15 35,14 "
          "C41,17 59,17 65,14 C69,15 72,18 73,26 "
          "C76,46 75,72 72,92 C62,97 38,97 28,92 Z",
    roots=["M30,90 C31,116 33,146 40,172 C44,183 47,186 50,186 "
           "C53,186 56,183 60,172 C67,146 69,116 70,90 "
           "C60,95 40,95 30,90 Z"],
)

TEETH["2-lateral-incisor"] = dict(
    title="Lateral incisor",
    crown="M33,92 C30,74 30,48 33,30 C35,20 39,16 44,15 "
          "C48,18 52,18 56,15 C61,16 65,20 67,30 "
          "C70,48 70,74 67,92 C59,97 41,97 33,92 Z",
    roots=["M35,90 C36,114 37,144 43,168 C46,179 48,182 50,182 "
           "C52,182 54,179 57,168 C63,144 64,114 65,90 "
           "C58,95 42,95 35,90 Z"],
)

TEETH["3-canine"] = dict(
    title="Canine (cuspid)",
    crown="M31,92 C28,70 30,46 38,28 C43,18 47,12 50,11 "
          "C53,12 57,18 62,28 C70,46 72,70 69,92 "
          "C60,97 40,97 31,92 Z",
    roots=["M32,90 C33,118 35,152 43,178 C46,189 48,192 50,192 "
           "C52,192 54,189 57,178 C65,152 67,118 68,90 "
           "C59,95 41,95 32,90 Z"],
)

TEETH["4-first-premolar"] = dict(
    title="First premolar (bicuspid)",
    crown="M30,92 C27,74 27,52 31,38 C33,30 37,24 42,21 "
          "C45,24 46,30 47,36 C48,40 52,40 53,36 "
          "C54,29 56,23 59,20 C64,24 67,31 69,40 "
          "C72,54 72,74 70,92 C60,97 40,97 30,92 Z",
    roots=[
        "M31,90 C30,114 30,146 36,170 C38,180 41,183 43,182 "
        "C46,178 48,150 49,120 C49,104 48,96 47,91 "
        "C41,95 35,94 31,90 Z",
        "M69,90 C70,114 70,146 64,170 C62,180 59,183 57,182 "
        "C54,178 52,150 51,120 C51,104 52,96 53,91 "
        "C59,95 65,94 69,90 Z",
    ],
)

TEETH["5-second-premolar"] = dict(
    title="Second premolar (bicuspid)",
    crown="M30,92 C27,74 28,52 32,40 C34,32 38,26 43,23 "
          "C46,27 47,33 48,38 C49,42 51,42 52,38 "
          "C53,33 54,27 57,23 C62,26 66,33 68,40 "
          "C72,52 73,74 70,92 C60,97 40,97 30,92 Z",
    roots=["M31,90 C32,116 34,148 41,174 C44,184 47,187 50,187 "
           "C53,187 56,184 59,174 C66,148 68,116 69,90 "
           "C60,95 40,95 31,90 Z"],
)

TEETH["6-first-molar"] = dict(
    title="First molar",
    crown="M22,90 C20,70 20,50 25,38 C27,31 31,26 36,24 "
          "C38,28 39,33 41,35 C43,37 45,33 46,28 "
          "C47,25 53,25 54,28 C55,33 57,37 59,35 "
          "C61,33 62,28 64,24 C69,26 73,31 75,38 "
          "C80,50 80,70 78,90 C64,97 36,97 22,90 Z",
    roots=[
        "M27,89 C24,112 22,142 28,166 C30,176 33,179 35,178 "
        "C39,172 41,140 42,112 C42,100 41,93 40,89 "
        "C35,93 31,92 27,89 Z",
        "M44,90 C44,116 45,150 49,172 C50,179 50,179 51,179 "
        "C52,179 52,179 53,172 C57,150 58,116 58,90 "
        "C54,94 48,94 44,90 Z",
        "M73,89 C76,112 78,142 72,166 C70,176 67,179 65,178 "
        "C61,172 59,140 58,112 C58,100 59,93 60,89 "
        "C65,93 69,92 73,89 Z",
    ],
)

TEETH["7-second-molar"] = dict(
    title="Second molar",
    crown="M24,90 C22,70 23,51 28,40 C30,33 34,28 39,26 "
          "C41,30 42,34 44,36 C46,38 47,34 48,29 "
          "C49,26 51,26 52,29 C53,34 54,38 56,36 "
          "C58,34 59,30 61,26 C66,28 70,33 72,40 "
          "C77,51 78,70 76,90 C63,97 37,97 24,90 Z",
    roots=[
        "M29,89 C26,110 25,138 31,162 C33,172 36,175 38,174 "
        "C41,168 43,138 44,112 C44,100 43,93 42,89 "
        "C37,93 33,92 29,89 Z",
        "M45,90 C45,114 46,146 50,168 C51,174 51,174 52,168 "
        "C56,146 56,114 56,90 C53,94 48,94 45,90 Z",
        "M71,89 C74,110 75,138 69,162 C67,172 64,175 62,174 "
        "C59,168 57,138 56,112 C56,100 57,93 58,89 "
        "C63,93 67,92 71,89 Z",
    ],
)

TEETH["8-third-molar"] = dict(
    title="Third molar (wisdom)",
    crown="M28,90 C26,72 28,54 33,44 C35,37 39,33 44,31 "
          "C46,35 47,38 49,38 C51,38 53,35 56,31 "
          "C61,33 65,37 67,44 C72,54 74,72 72,90 "
          "C62,96 38,96 28,90 Z",
    roots=[
        "M33,88 C31,106 31,128 37,148 C40,158 44,160 46,158 "
        "C48,150 48,120 48,98 C48,93 47,90 46,88 "
        "C41,92 37,91 33,88 Z",
        "M67,88 C69,106 69,128 63,148 C60,158 56,160 54,158 "
        "C52,150 52,120 52,98 C52,93 53,90 54,88 "
        "C59,92 63,91 67,88 Z",
    ],
)


def build():
    files = []
    for name, t in TEETH.items():
        uid = name.split("-")[0]
        body = root(uid, t["roots"]) + "\n" + crown(uid, t["crown"])
        out = svg(uid, body, t["title"])
        path = os.path.join(OUT, f"tooth-{name}.svg")
        with open(path, "w") as f:
            f.write(out)
        files.append(path)
        print("wrote", os.path.basename(path))
    return files


if __name__ == "__main__":
    build()
