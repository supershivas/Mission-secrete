"""
API Vercel — génère le PDF des props imprimables depuis la config KV.
GET /api/pdf  →  application/pdf
"""

from http.server import BaseHTTPRequestHandler
import os, json, io, urllib.request

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm, mm
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas as rl_canvas

W, H = A4

# ══════════════════════════════════════════════════════════════
# ALPHABETS & ENCODAGES
# ══════════════════════════════════════════════════════════════
ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

# ── Polybe 5×5 ──────────────────────────────────────────────
POLYBE = {}
for _i, _ch in enumerate(ALPHABET[:25]):
    POLYBE[_ch] = f'{_i//5+1}{_i%5+1}'
POLYBE['Z'] = POLYBE['Y']

POLYBE_GRID = [
    ['', '1', '2', '3', '4', '5'],
    ['1', 'A', 'B', 'C', 'D', 'E'],
    ['2', 'F', 'G', 'H', 'I', 'J'],
    ['3', 'K', 'L', 'M', 'N', 'O'],
    ['4', 'P', 'Q', 'R', 'S', 'T'],
    ['5', 'U', 'V', 'W', 'X', 'Y/Z'],
]

def encode_polybe(word):
    return '  '.join(POLYBE.get(c, '??') for c in word.upper() if c.isalpha())

# ── Morse ────────────────────────────────────────────────────
MORSE = {
    'A':'.-',   'B':'-...', 'C':'-.-.', 'D':'-..',  'E':'.',
    'F':'..-.', 'G':'--.',  'H':'....', 'I':'..',   'J':'.---',
    'K':'-.-',  'L':'.-..', 'M':'--',   'N':'-.',   'O':'---',
    'P':'.--.', 'Q':'--.-', 'R':'.-.',  'S':'...',  'T':'-',
    'U':'..-',  'V':'...-', 'W':'.--',  'X':'-..-', 'Y':'-.--',
    'Z':'--..',
}

def morse_display(code):
    return code.replace('.', '·').replace('-', '—')

def encode_morse_display(word):
    return '  /  '.join(morse_display(MORSE.get(c, '?')) for c in word.upper() if c.isalpha())

# ── Atbash (A=Z, B=Y…) ──────────────────────────────────────
ATBASH = {chr(65+i): chr(90-i) for i in range(26)}

def encode_atbash(word):
    return ''.join(ATBASH.get(c, c) for c in word.upper() if c.isalpha())

# ── César +3 ─────────────────────────────────────────────────
CESAR_SHIFT = 3

def encode_cesar(word):
    return ''.join(chr((ord(c)-65+CESAR_SHIFT)%26+65) for c in word.upper() if c.isalpha())

# Dispatch
CIPHER_ENCODE = {
    'polybe':   encode_polybe,
    'morse':    encode_morse_display,
    'atbash':   encode_atbash,
    'cesar':    encode_cesar,
    'symboles': lambda w: w.upper(),   # symboles dessinés — handled specially
}

CIPHER_LABELS = {
    'polybe':   'POLYBE 5×5',
    'morse':    'CODE MORSE',
    'atbash':   'ATBASH  (A=Z, B=Y…)',
    'cesar':    'CÉSAR +3  (A=D, B=E…)',
    'symboles': 'ALPHABET SYMBOLIQUE',
}

# ══════════════════════════════════════════════════════════════
# COULEURS / HELPERS
# ══════════════════════════════════════════════════════════════
INK   = HexColor('#1a1a1a')
LIGHT = HexColor('#888888')
RULE  = HexColor('#cccccc')
STAMP = HexColor('#9b1c1c')
BOX   = HexColor('#f0f0f0')

def _font(c, name='Courier', size=10, color=INK):
    c.setFont(name, size)
    c.setFillColor(color)

def _rule(c, y, x1=None, x2=None, w=0.4, color=RULE):
    c.setStrokeColor(color); c.setLineWidth(w)
    c.line(x1 or 1.5*cm, y, x2 or W-1.5*cm, y)

def _border(c):
    c.setStrokeColor(RULE); c.setLineWidth(0.5)
    m = 1.2*cm
    c.rect(m, m, W-2*m, H-2*m, fill=0, stroke=1)

def _stamp(c, x, y, text, angle=-12):
    c.saveState(); c.translate(x, y); c.rotate(angle)
    c.setFillColor(STAMP); c.setFont('Helvetica-Bold', 7)
    c.setStrokeColor(STAMP); c.setLineWidth(1.0)
    tw = c.stringWidth(text, 'Helvetica-Bold', 7)
    pad = 2.5*mm
    c.rect(-tw/2-pad, -3*mm, tw+2*pad, 5.5*mm, fill=0, stroke=1)
    c.drawCentredString(0, -1.2*mm, text)
    c.restoreState()

def _page_header(c, title, subtitle=''):
    """Dessine l'en-tête commun + bordure, retourne cur_y de départ."""
    _border(c)
    _font(c, 'Courier', 6.5, LIGHT)
    c.drawString(1.5*cm, H-1.3*cm, 'BUREAU CLANDESTIN BXL  ·  SECTION HÊLIE')
    c.drawRightString(W-1.5*cm, H-1.3*cm, 'CLASSIFIÉ — NE PAS REPRODUIRE')
    _rule(c, H-1.6*cm, w=0.3)
    _font(c, 'Courier-Bold', 14, INK)
    c.drawCentredString(W/2, H-2.8*cm, title)
    if subtitle:
        _font(c, 'Courier', 8, LIGHT)
        c.drawCentredString(W/2, H-3.5*cm, subtitle)
    _rule(c, H-(3.8 if subtitle else 3.2)*cm, w=0.6, color=INK)
    _rule(c, 1.5*cm, w=0.3)
    _font(c, 'Courier', 6.5, LIGHT)
    c.drawCentredString(W/2, 1.15*cm, 'OPÉRATION HÊLIE — NE PAS COMMUNIQUER EN DEHORS DU GROUPE')
    _stamp(c, W-3.5*cm, 2.2*cm, 'CONFIDENTIEL')
    return H - (4.3 if subtitle else 3.7)*cm


# ══════════════════════════════════════════════════════════════
# SYMBOLES — dessinés au trait
# ══════════════════════════════════════════════════════════════
def _sym_stroke(c):
    c.setStrokeColor(INK); c.setFillColor(INK)
    c.setLineWidth(1.1); c.setLineCap(1); c.setLineJoin(1)

def draw_sym(c, letter, cx, cy, s=4*mm):
    _sym_stroke(c)
    r = s * 0.45
    p = c.beginPath()

    if letter == 'A':
        p.moveTo(cx-r, cy-r*.5); p.lineTo(cx, cy+r*.8); p.lineTo(cx+r, cy-r*.5)
    elif letter == 'B':
        p.moveTo(cx+r*.2, cy+r*.8); p.lineTo(cx+r*.2, cy-r*.3)
        p.curveTo(cx+r*.2, cy-r*.9, cx-r*.6, cy-r*.9, cx-r*.6, cy-r*.4)
    elif letter == 'C':
        p.moveTo(cx+r*.3, cy+r*.8)
        p.curveTo(cx-r*.8, cy+r*.8, cx-r*.8, cy-r*.8, cx+r*.3, cy-r*.8)
    elif letter == 'D':
        p.moveTo(cx-r*.3, cy+r*.8)
        p.curveTo(cx+r*.8, cy+r*.8, cx+r*.8, cy-r*.8, cx-r*.3, cy-r*.8)
    elif letter == 'E':
        p.moveTo(cx+r*.5, cy+r*.7); p.lineTo(cx-r*.5, cy+r*.7); p.lineTo(cx-r*.5, cy-r*.7)
    elif letter == 'F':
        p.moveTo(cx-r*.5, cy+r*.7); p.lineTo(cx+r*.5, cy+r*.7); p.lineTo(cx+r*.5, cy-r*.7)
    elif letter == 'G':
        p.moveTo(cx+r*.5, cy+r*.7); p.lineTo(cx-r*.5, cy+r*.7); p.lineTo(cx-r*.5, cy-r*.1)
        p.curveTo(cx-r*.5, cy-r*.8, cx+r*.3, cy-r*.8, cx+r*.3, cy-r*.4)
    elif letter == 'H':
        p.moveTo(cx-r*.35, cy+r*.8); p.lineTo(cx-r*.35, cy-r*.8)
        p.moveTo(cx+r*.35, cy+r*.8); p.lineTo(cx+r*.35, cy-r*.8)
    elif letter == 'I':
        p.moveTo(cx, cy+r*.8); p.lineTo(cx, cy-r*.8)
    elif letter == 'J':
        p.moveTo(cx+r*.3, cy+r*.8); p.lineTo(cx+r*.3, cy-r*.3)
        p.curveTo(cx+r*.3, cy-r*.9, cx-r*.5, cy-r*.9, cx-r*.5, cy-r*.4)
    elif letter == 'K':
        p.moveTo(cx+r*.4, cy+r*.7); p.lineTo(cx-r*.4, cy); p.lineTo(cx+r*.4, cy-r*.7)
    elif letter == 'L':
        p.moveTo(cx-r*.5, cy+r*.7); p.lineTo(cx-r*.5, cy-r*.7); p.lineTo(cx+r*.5, cy-r*.7)
    elif letter == 'M':
        p.moveTo(cx-r*.5, cy+r*.7); p.lineTo(cx+r*.5, cy+r*.7); p.lineTo(cx+r*.5, cy-r*.7)
    elif letter == 'N':
        p.moveTo(cx-r*.5, cy+r*.7); p.lineTo(cx+r*.5, cy+r*.1)
        p.lineTo(cx-r*.2, cy-r*.1); p.lineTo(cx+r*.4, cy-r*.7)
    elif letter == 'O':
        p.circle(cx, cy, r*.75)
        c.drawPath(p, fill=0, stroke=1); return
    elif letter == 'P':
        p.moveTo(cx-r*.7, cy+r*.2)
        p.curveTo(cx-r*.7, cy-r*.9, cx+r*.7, cy-r*.9, cx+r*.7, cy+r*.2)
    elif letter == 'Q':
        p.moveTo(cx-r*.6, cy-r*.3)
        p.curveTo(cx-r*.6, cy+r*.7, cx+r*.6, cy+r*.7, cx+r*.6, cy-r*.3)
    elif letter == 'R':
        p.moveTo(cx-r*.5, cy+r*.7); p.lineTo(cx+r*.5, cy-r*.7)
    elif letter == 'S':
        p.moveTo(cx+r*.5, cy+r*.7); p.lineTo(cx-r*.5, cy-r*.7)
    elif letter == 'T':
        p.moveTo(cx-r*.7, cy); p.lineTo(cx+r*.7, cy)
    elif letter == 'U':
        p.moveTo(cx-r*.6, cy+r*.7); p.lineTo(cx-r*.6, cy)
        p.curveTo(cx-r*.6, cy-r*.9, cx+r*.6, cy-r*.9, cx+r*.6, cy)
        p.lineTo(cx+r*.6, cy+r*.7)
    elif letter == 'V':
        p.moveTo(cx-r*.6, cy+r*.5); p.lineTo(cx, cy-r*.7); p.lineTo(cx+r*.6, cy+r*.5)
    elif letter == 'W':
        p.moveTo(cx-r*.6, cy-r*.7); p.lineTo(cx-r*.6, cy)
        p.curveTo(cx-r*.6, cy+r*.9, cx+r*.6, cy+r*.9, cx+r*.6, cy)
        p.lineTo(cx+r*.6, cy-r*.7)
    elif letter == 'X':
        p.moveTo(cx-r*.4, cy+r*.7); p.lineTo(cx+r*.4, cy); p.lineTo(cx-r*.4, cy-r*.7)
    elif letter == 'Y':
        p.moveTo(cx+r*.5, cy+r*.7); p.lineTo(cx+r*.5, cy-r*.7); p.lineTo(cx-r*.5, cy-r*.7)
    elif letter == 'Z':
        p.moveTo(cx-r*.5, cy+r*.7); p.lineTo(cx+r*.5, cy+r*.7)
        p.lineTo(cx-r*.5, cy-r*.7); p.lineTo(cx+r*.5, cy-r*.7)
    else:
        return
    c.drawPath(p, fill=0, stroke=1)


# ══════════════════════════════════════════════════════════════
# PAGES TABLE DE CHIFFREMENT (une par type)
# ══════════════════════════════════════════════════════════════

def page_symboles(c):
    cur_y = _page_header(c, 'TABLE DE CHIFFREMENT — SYMBOLES',
                         'Chaque lettre est représentée par un symbole unique')

    row_h = 0.9*cm
    col_w = (W - 3.0*cm) / 2
    sym_s = 3.2*mm
    n_rows = 13

    for col_i in range(2):
        letters = ALPHABET[col_i*n_rows : (col_i+1)*n_rows]
        x0 = 1.5*cm + col_i * col_w
        lw = col_w / 3
        sw = col_w * 2/3

        _font(c, 'Courier', 6.5, LIGHT)
        c.drawCentredString(x0 + lw/2, cur_y + 0.15*cm, 'LETTRE')
        c.drawCentredString(x0 + lw + sw/2, cur_y + 0.15*cm, 'SYMBOLE')
        c.setStrokeColor(RULE); c.setLineWidth(0.3)
        c.line(x0, cur_y, x0+col_w, cur_y)

        for ri, letter in enumerate(letters):
            ry   = cur_y - (ri+1)*row_h
            cy_c = ry + row_h/2
            if ri % 2 == 0:
                c.setFillColor(BOX); c.rect(x0, ry, col_w, row_h, fill=1, stroke=0)
            c.setStrokeColor(RULE); c.setLineWidth(0.25)
            c.rect(x0, ry, col_w, row_h, fill=0, stroke=1)
            c.line(x0+lw, ry, x0+lw, ry+row_h)
            _font(c, 'Courier-Bold', 11, INK)
            c.drawCentredString(x0 + lw/2, cy_c - 3.5, letter)
            draw_sym(c, letter, x0 + lw + sw/2, cy_c, sym_s)


def page_morse(c):
    cur_y = _page_header(c, 'TABLE DE CHIFFREMENT — MORSE',
                         '· = point court   —  = trait long   /  = séparation entre lettres')

    row_h  = 0.72*cm
    m_cols = 6
    lpc    = 5   # letters per column (5×6=30, enough for 26)
    cw     = (W - 3.0*cm) / m_cols
    mx0    = 1.5*cm

    for i, letter in enumerate(ALPHABET):
        col_i = min(i // lpc, m_cols-1)
        row_i = i % lpc
        x0  = mx0 + col_i * cw
        ry  = cur_y - (row_i+1)*row_h
        cy_c = ry + row_h/2
        if row_i % 2 == 0:
            c.setFillColor(BOX); c.rect(x0, ry, cw, row_h, fill=1, stroke=0)
        c.setStrokeColor(RULE); c.setLineWidth(0.2)
        c.rect(x0, ry, cw, row_h, fill=0, stroke=1)
        _font(c, 'Courier-Bold', 9, INK)
        c.drawString(x0+2*mm, cy_c-3, letter)
        code_str = morse_display(MORSE.get(letter,'?'))
        _font(c, 'Courier', 8, LIGHT)
        tw = c.stringWidth(code_str, 'Courier', 8)
        if tw > cw - 0.8*cm:
            _font(c, 'Courier', 6.5, LIGHT)
        c.drawString(x0+0.6*cm, cy_c-3, code_str)

    # Grand exemple visuel
    ex_y = cur_y - lpc*row_h - 1.2*cm
    _rule(c, ex_y+0.4*cm, w=0.4, color=INK)
    _font(c, 'Courier', 7.5, LIGHT)
    c.drawCentredString(W/2, ex_y, 'EXEMPLE :   S · O · S   =    ·  ·  ·  / — — — / ·  ·  ·')


def page_polybe(c):
    cur_y = _page_header(c, 'TABLE DE CHIFFREMENT — POLYBE 5×5',
                         'Lisez LIGNE puis COLONNE  —  ex: A=11   L=32   Z=55')

    cell_w, cell_h = 1.9*cm, 1.05*cm
    gx0 = (W - 6*cell_w) / 2
    gy0 = cur_y - 0.5*cm

    for ri, row in enumerate(POLYBE_GRID):
        for ci, val in enumerate(row):
            x = gx0 + ci*cell_w
            y = gy0 - (ri+1)*cell_h
            if ri == 0 or ci == 0:
                c.setFillColor(BOX); c.rect(x, y, cell_w, cell_h, fill=1, stroke=0)
            c.setStrokeColor(RULE); c.setLineWidth(0.4)
            c.rect(x, y, cell_w, cell_h, fill=0, stroke=1)
            if val:
                _font(c, 'Courier-Bold' if (ri==0 or ci==0) else 'Courier', 12, INK)
                c.drawCentredString(x+cell_w/2, y+cell_h*0.3, val)

    # Légende
    leg_y = gy0 - 7*cell_h - 1.2*cm
    _rule(c, leg_y + 0.4*cm, w=0.4, color=INK)
    _font(c, 'Courier', 8, LIGHT)
    c.drawCentredString(W/2, leg_y, 'TRAHISON  →  T=44   R=42   A=11   H=23   I=24   S=43   O=35   N=34')


def page_atbash(c):
    cur_y = _page_header(c, 'TABLE DE CHIFFREMENT — ATBASH',
                         'Chaque lettre est remplacée par son miroir dans l\'alphabet  —  A=Z, B=Y, M=N…')

    row_h = 0.9*cm
    col_w = (W - 3.0*cm) / 2
    n_rows = 13

    for col_i in range(2):
        letters = ALPHABET[col_i*n_rows : (col_i+1)*n_rows]
        x0  = 1.5*cm + col_i*col_w
        lw  = col_w / 3
        cw2 = col_w * 2/3

        _font(c, 'Courier', 6.5, LIGHT)
        c.drawCentredString(x0+lw/2, cur_y+0.15*cm, 'LETTRE')
        c.drawCentredString(x0+lw+cw2/2, cur_y+0.15*cm, 'CODE ATBASH')
        c.setStrokeColor(RULE); c.setLineWidth(0.3)
        c.line(x0, cur_y, x0+col_w, cur_y)

        for ri, letter in enumerate(letters):
            ry   = cur_y - (ri+1)*row_h
            cy_c = ry + row_h/2
            if ri % 2 == 0:
                c.setFillColor(BOX); c.rect(x0, ry, col_w, row_h, fill=1, stroke=0)
            c.setStrokeColor(RULE); c.setLineWidth(0.25)
            c.rect(x0, ry, col_w, row_h, fill=0, stroke=1)
            c.line(x0+lw, ry, x0+lw, ry+row_h)
            _font(c, 'Courier-Bold', 14, INK)
            c.drawCentredString(x0+lw/2, cy_c-5, letter)
            _font(c, 'Courier-Bold', 20, STAMP)
            c.drawCentredString(x0+lw+cw2/2, cy_c-7, ATBASH[letter])

    # Astuce
    tip_y = cur_y - n_rows*row_h - 1.2*cm
    _rule(c, tip_y+0.4*cm, w=0.4, color=INK)
    _font(c, 'Courier', 8, LIGHT)
    c.drawCentredString(W/2, tip_y, 'ASTUCE : la table est symétrique — A=Z signifie aussi Z=A !')


def page_cesar(c):
    cur_y = _page_header(c, 'TABLE DE CHIFFREMENT — CÉSAR +3',
                         'Chaque lettre est décalée de 3 rangs vers l\'avant  —  A=D, B=E, X=A, Y=B, Z=C')

    row_h = 0.9*cm
    col_w = (W - 3.0*cm) / 2
    n_rows = 13

    for col_i in range(2):
        letters = ALPHABET[col_i*n_rows : (col_i+1)*n_rows]
        x0  = 1.5*cm + col_i*col_w
        lw  = col_w / 3
        cw2 = col_w * 2/3

        _font(c, 'Courier', 6.5, LIGHT)
        c.drawCentredString(x0+lw/2, cur_y+0.15*cm, 'LETTRE')
        c.drawCentredString(x0+lw+cw2/2, cur_y+0.15*cm, 'CODE CÉSAR')
        c.setStrokeColor(RULE); c.setLineWidth(0.3)
        c.line(x0, cur_y, x0+col_w, cur_y)

        for ri, letter in enumerate(letters):
            ry   = cur_y - (ri+1)*row_h
            cy_c = ry + row_h/2
            coded = chr((ord(letter)-65+CESAR_SHIFT)%26+65)
            if ri % 2 == 0:
                c.setFillColor(BOX); c.rect(x0, ry, col_w, row_h, fill=1, stroke=0)
            c.setStrokeColor(RULE); c.setLineWidth(0.25)
            c.rect(x0, ry, col_w, row_h, fill=0, stroke=1)
            c.line(x0+lw, ry, x0+lw, ry+row_h)
            _font(c, 'Courier-Bold', 14, INK)
            c.drawCentredString(x0+lw/2, cy_c-5, letter)
            _font(c, 'Courier-Bold', 20, HexColor('#1a4b8a'))
            c.drawCentredString(x0+lw+cw2/2, cy_c-7, coded)

    tip_y = cur_y - n_rows*row_h - 1.2*cm
    _rule(c, tip_y+0.4*cm, w=0.4, color=INK)
    _font(c, 'Courier', 8, LIGHT)
    c.drawCentredString(W/2, tip_y, 'DÉCALAGE +3 : comptez 3 lettres vers l\'avant dans l\'alphabet')

# ══════════════════════════════════════════════════════════════
# PAGE DE COUVERTURE
# ══════════════════════════════════════════════════════════════
def page_cover(c):
    m = 1.2*cm

    # Cadre extérieur double
    c.setStrokeColor(INK); c.setLineWidth(1.2)
    c.rect(m, m, W-2*m, H-2*m, fill=0, stroke=1)
    c.setStrokeColor(INK); c.setLineWidth(0.3)
    c.rect(m+3*mm, m+3*mm, W-2*m-6*mm, H-2*m-6*mm, fill=0, stroke=1)

    cx = W / 2

    # ── Bande supérieure ────────────────────────────────────────
    top_y = H - m - 3*mm
    band_h = 1.4*cm
    # Filets encadrant le bandeau
    c.setStrokeColor(INK); c.setLineWidth(0.5)
    c.line(m+6*mm, top_y - band_h, W-m-6*mm, top_y - band_h)
    c.line(m+6*mm, top_y,          W-m-6*mm, top_y)
    _font(c, 'Courier', 6.5, LIGHT)
    c.drawCentredString(cx, top_y - band_h/2 - 2.5, 'BUREAU CLANDESTIN BXL  ·  SECTION HÊLIE  ·  USAGE STRICTEMENT INTERNE')

    # ── Accroche classification ──────────────────────────────────
    class_y = top_y - band_h - 1.2*cm
    _font(c, 'Courier', 7.5, LIGHT)
    c.drawCentredString(cx, class_y, '─ ─ ─   DOCUMENT DE CHIFFREMENT   ─ ─ ─')

    # ── Étoiles décoratives ──────────────────────────────────────
    star_y = class_y - 1.1*cm
    _font(c, 'Courier', 9, LIGHT)
    c.drawCentredString(cx, star_y, '*   *   *   *   *   *   *   *   *')

    # ── Titre principal ──────────────────────────────────────────
    title_y = star_y - 2.0*cm
    _font(c, 'Courier-Bold', 28, INK)
    c.drawCentredString(cx, title_y, 'DOSSIER')
    _font(c, 'Courier-Bold', 28, INK)
    c.drawCentredString(cx, title_y - 1.1*cm, 'DE CHIFFREMENT')

    # Trait sous le titre
    _rule(c, title_y - 1.65*cm, m+1.5*cm, W-m-1.5*cm, w=1.0, color=INK)
    _rule(c, title_y - 1.9*cm,  m+1.5*cm, W-m-1.5*cm, w=0.3, color=INK)

    # ── Sous-titre opération ──────────────────────────────────────
    op_y = title_y - 2.7*cm
    _font(c, 'Courier', 9, LIGHT)
    c.drawCentredString(cx, op_y, 'OPÉRATION  HÊLIE')

    # ── Cadre central (zone emblème) ─────────────────────────────
    emb_w, emb_h = 7.5*cm, 7.5*cm
    emb_x = cx - emb_w/2
    emb_y = op_y - 1.2*cm - emb_h
    c.setStrokeColor(INK); c.setLineWidth(0.6)
    c.rect(emb_x, emb_y, emb_w, emb_h, fill=0, stroke=1)
    c.setStrokeColor(RULE); c.setLineWidth(0.25)
    c.rect(emb_x+3*mm, emb_y+3*mm, emb_w-6*mm, emb_h-6*mm, fill=0, stroke=1)

    # Contenu du cadre : croix de viseur
    ecx = emb_x + emb_w/2
    ecy = emb_y + emb_h/2
    r1, r2 = 1.8*cm, 2.6*cm
    # Cercles concentriques
    c.setStrokeColor(INK); c.setLineWidth(0.5)
    c.circle(ecx, ecy, r1, fill=0, stroke=1)
    c.setLineWidth(0.3)
    c.circle(ecx, ecy, r2, fill=0, stroke=1)
    c.setLineWidth(0.2)
    c.circle(ecx, ecy, 4*mm, fill=0, stroke=1)
    # Lignes du viseur (crosshair)
    gap = 5*mm
    c.setLineWidth(0.5)
    c.line(ecx, ecy+gap, ecx, ecy+r2)
    c.line(ecx, ecy-gap, ecx, ecy-r2)
    c.line(ecx+gap, ecy, ecx+r2, ecy)
    c.line(ecx-gap, ecy, ecx-r2, ecy)
    # Marques de graduation sur le grand cercle
    import math
    c.setLineWidth(0.35)
    for angle_deg in range(0, 360, 15):
        angle = math.radians(angle_deg)
        tick_in  = r2 - 3*mm if angle_deg % 90 == 0 else r2 - 2*mm
        tick_out = r2
        c.line(ecx + tick_in*math.cos(angle), ecy + tick_in*math.sin(angle),
               ecx + tick_out*math.cos(angle), ecy + tick_out*math.sin(angle))
    # Texte CLASSIFIÉ en diagonale dans le cadre
    c.saveState()
    c.translate(ecx, ecy)
    c.rotate(35)
    c.setFillColor(RULE); c.setFont('Courier-Bold', 8)
    c.drawCentredString(0, 0, 'C L A S S I F I É')
    c.restoreState()

    # ── Informations bas du cadre ─────────────────────────────────
    info_y = emb_y - 1.0*cm
    _font(c, 'Courier', 7.5, LIGHT)
    c.drawCentredString(cx, info_y, 'Contient les tables de déchiffrement et les transmissions chiffrées')
    c.drawCentredString(cx, info_y - 0.6*cm, 'Garder secret — ne pas montrer aux autres équipes')

    # ── Tampon CONFIDENTIEL (grand, incliné) ──────────────────────
    _stamp(c, W - m - 3.5*cm, emb_y + emb_h*0.3, 'CONFIDENTIEL', angle=-18)

    # ── Numéro de dossier (bas gauche) ───────────────────────────
    _font(c, 'Courier', 6.5, LIGHT)
    c.drawString(m+6*mm, m+10*mm, 'RÉSERVÉ AUX AGENTS  ·  REF: HX-10')

    # ── Bande inférieure ──────────────────────────────────────────
    bot_band_y = m + 3*mm
    c.setStrokeColor(INK); c.setLineWidth(0.5)
    c.line(m+6*mm, bot_band_y,          W-m-6*mm, bot_band_y)
    c.line(m+6*mm, bot_band_y+band_h,   W-m-6*mm, bot_band_y+band_h)
    _font(c, 'Courier', 6.5, LIGHT)
    c.drawCentredString(cx, bot_band_y + band_h/2 - 2.5, 'OPÉRATION HÊLIE  ·  NE PAS REPRODUIRE  ·  NE PAS COMMUNIQUER EN DEHORS DU GROUPE')


CIPHER_PAGE_FN = {
    'symboles': page_symboles,
    'morse':    page_morse,
    'polybe':   page_polybe,
    'atbash':   page_atbash,
    'cesar':    page_cesar,
}


# ══════════════════════════════════════════════════════════════
# PAGES CODES — 1 CHIFFREMENT PAR FEUILLET, 2 PAR A4
# ══════════════════════════════════════════════════════════════
def _code_half(c, y_top, y_bot, code_word, cipher='polybe', num=None):
    mx     = 1.8*cm
    half_h = y_top - y_bot - 4*mm

    c.setStrokeColor(INK); c.setLineWidth(0.8)
    c.rect(mx, y_bot, W-2*mx, half_h, fill=0, stroke=1)
    c.setStrokeColor(RULE); c.setLineWidth(0.3)
    c.rect(mx+2*mm, y_bot+2*mm, W-2*mx-4*mm, half_h-4*mm, fill=0, stroke=1)

    pad = 6*mm
    x0  = mx + pad
    x1  = W - mx - pad
    cw  = x1 - x0
    y   = y_top - 9*mm

    # ── Numéro d'épreuve (grand, en haut) ───────────────────
    if num is not None:
        _font(c, 'Courier-Bold', 22, INK)
        c.drawCentredString(W/2, y, f'ÉPREUVE  {num}')
        y -= 9*mm
        _rule(c, y, x0, x1, w=0.6, color=INK)
        y -= 5*mm
    else:
        # En-tête sans numéro
        _font(c, 'Courier', 6.5, LIGHT)
        c.drawString(x0, y, 'TRANSMISSION CHIFFRÉE  ·  PRIORITÉ ABSOLUE')
        c.drawRightString(x1, y, 'USAGE UNIQUE')
        y -= 4*mm
        _rule(c, y, x0, x1, w=0.5, color=INK)
        y -= 7*mm

    # Sous-titre chiffrement
    label = CIPHER_LABELS.get(cipher, cipher.upper())
    _font(c, 'Courier', 7.5, LIGHT)
    c.drawCentredString(W/2, y, f'— CHIFFREMENT {label} —')
    y -= 9*mm

    letters = [ch for ch in code_word.upper() if ch.isalpha()]
    n = len(letters)

    # ── Représentation chiffrée ──────────────────────────────
    if cipher == 'symboles':
        sym_s   = min(5*mm, (cw * 0.9) / max(n, 1) / 2)
        total_w = n * sym_s * 2.2
        sx = x0 + (cw - total_w) / 2
        for letter in letters:
            draw_sym(c, letter, sx + sym_s, y - sym_s*1.1, sym_s)
            sx += sym_s * 2.2
        y -= sym_s * 2.4 + 3*mm

    elif cipher == 'morse':
        parts = [morse_display(MORSE.get(l, '?')) for l in letters]
        morse_str = '  /  '.join(parts)
        # essaie de tenir sur une ligne; sinon deux
        _font(c, 'Courier-Bold', 12, INK)
        tw = c.stringWidth(morse_str, 'Courier-Bold', 12)
        if tw > cw:
            _font(c, 'Courier-Bold', 9, INK)
            tw = c.stringWidth(morse_str, 'Courier-Bold', 9)
        if tw > cw:  # encore trop long → deux lignes
            mid = n // 2
            line1 = '  /  '.join(parts[:mid])
            line2 = '  /  '.join(parts[mid:])
            _font(c, 'Courier-Bold', 9, INK)
            c.drawCentredString(W/2, y - 5*mm, line1)
            c.drawCentredString(W/2, y - 12*mm, line2)
            y -= 20*mm
        else:
            c.drawCentredString(W/2, y - 5*mm, morse_str)
            y -= 14*mm

    elif cipher == 'polybe':
        polybe_str = encode_polybe(code_word)
        _font(c, 'Courier-Bold', 18, INK)
        tw = c.stringWidth(polybe_str, 'Courier-Bold', 18)
        if tw > cw:
            _font(c, 'Courier-Bold', 13, INK)
        c.drawCentredString(W/2, y - 7*mm, polybe_str)
        _font(c, 'Courier', 7, LIGHT)
        c.drawCentredString(W/2, y - 14*mm, 'LIGNE puis COLONNE — utilisez la grille POLYBE')
        y -= 20*mm

    elif cipher == 'atbash':
        encoded = encode_atbash(code_word)
        _font(c, 'Courier-Bold', 26, INK)
        tw = c.stringWidth(encoded, 'Courier-Bold', 26)
        if tw > cw:
            _font(c, 'Courier-Bold', 18, INK)
        c.drawCentredString(W/2, y - 9*mm, encoded)
        _font(c, 'Courier', 7, LIGHT)
        c.drawCentredString(W/2, y - 16*mm, 'Chaque lettre est son miroir — utilisez la table ATBASH')
        y -= 23*mm

    elif cipher == 'cesar':
        encoded = encode_cesar(code_word)
        _font(c, 'Courier-Bold', 26, INK)
        tw = c.stringWidth(encoded, 'Courier-Bold', 26)
        if tw > cw:
            _font(c, 'Courier-Bold', 18, INK)
        c.drawCentredString(W/2, y - 9*mm, encoded)
        _font(c, 'Courier', 7, LIGHT)
        c.drawCentredString(W/2, y - 16*mm, 'Décalage de 3 rangs — utilisez la table CÉSAR +3')
        y -= 23*mm

    # ── Cases réponse ────────────────────────────────────────
    _rule(c, y, x0, x1, w=0.3)
    y -= 6*mm
    _font(c, 'Courier', 6.5, LIGHT)
    c.drawCentredString(W/2, y, 'RÉPONSE :')
    y -= 6*mm
    bw    = min(1.1*cm, cw / (n + 0.5))
    total = n*bw + (n-1)*2*mm
    bx    = (W - total) / 2
    for _ in letters:
        c.setStrokeColor(INK); c.setLineWidth(0.5)
        c.rect(bx, y-0.85*cm, bw, 0.85*cm, fill=0, stroke=1)
        bx += bw + 2*mm

    _stamp(c, x1-4*mm, y_bot + half_h*0.38, 'CLASSIFIÉ', angle=14)
    _rule(c, y_bot+9*mm, x0, x1, w=0.3)
    _font(c, 'Courier', 6, LIGHT)
    c.drawCentredString(W/2, y_bot+5*mm, 'BUREAU CLANDESTIN BXL  ·  SECTION HÊLIE')


def page_codes(c, code_items):
    """code_items : liste de (code_word, cipher, num)"""
    pairs = [(code_items[i], code_items[i+1] if i+1 < len(code_items) else None)
             for i in range(0, len(code_items), 2)]
    for top, bot in pairs:
        _border(c)
        mid_y = H / 2
        c.setStrokeColor(LIGHT); c.setLineWidth(0.5); c.setDash(3, 4)
        c.line(1.2*cm, mid_y, W-1.2*cm, mid_y)
        c.setDash()
        _font(c, 'Courier', 7, LIGHT)
        c.drawCentredString(W/2, mid_y+2*mm, '✂   DÉCOUPER ICI   ✂')
        _code_half(c, H-5*mm, mid_y+6*mm, top[0], top[1], top[2] if len(top) > 2 else None)
        if bot:
            _code_half(c, mid_y-6*mm, 5*mm, bot[0], bot[1], bot[2] if len(bot) > 2 else None)
        c.showPage()


# ══════════════════════════════════════════════════════════════
# CONFIG KV + HANDLER
# ══════════════════════════════════════════════════════════════
def get_config():
    url   = os.environ.get('KV_REST_API_URL')
    token = os.environ.get('KV_REST_API_TOKEN')
    if not url or not token:
        return None
    try:
        data = json.dumps(['GET', 'agent_config']).encode()
        req  = urllib.request.Request(
            url, data=data,
            headers={'Authorization': f'Bearer {token}',
                     'Content-Type': 'application/json'},
            method='POST')
        with urllib.request.urlopen(req, timeout=4) as resp:
            result = json.loads(resp.read())
            raw = result.get('result')
            if raw:
                return json.loads(raw)
    except Exception:
        pass
    return None


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()

    def do_GET(self):
        cfg        = get_config()
        challenges = (cfg or {}).get('challenges', [])
        real       = [ch for ch in challenges if ch.get('type') != 'pause']

        # Collecte (code, cipher, num) par épreuve
        code_items = []
        num = 0
        for ch in real:
            code = ch.get('code', '').upper()
            if code:
                num += 1
                cipher = ch.get('cipher', 'polybe')
                code_items.append((code, cipher, num))
        if not code_items:
            code_items = [
                ('LASER',    'polybe',   1),
                ('ANTIDOTE', 'morse',    2),
                ('COBRA',    'symboles', 3),
                ('TRAHISON', 'atbash',   4),
            ]

        # Pages de tables : une par cipher unique utilisé (dans l'ordre d'apparition)
        seen = []
        for _, cipher, _ in code_items:
            if cipher not in seen:
                seen.append(cipher)

        buf = io.BytesIO()
        c   = rl_canvas.Canvas(buf, pagesize=A4)

        page_cover(c)
        c.showPage()

        for cipher in seen:
            fn = CIPHER_PAGE_FN.get(cipher)
            if fn:
                fn(c)
                c.showPage()

        page_codes(c, code_items)
        c.save()

        pdf_bytes = buf.getvalue()
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Type', 'application/pdf')
        self.send_header('Content-Disposition', 'inline; filename="mission-props.pdf"')
        self.send_header('Content-Length', str(len(pdf_bytes)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(pdf_bytes)

    def log_message(self, *args):
        pass
