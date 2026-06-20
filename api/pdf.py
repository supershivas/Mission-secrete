"""
API Vercel — génère le PDF des props imprimables depuis la config KV.
GET /api/pdf  →  application/pdf
"""

from http.server import BaseHTTPRequestHandler
import os, json, io, math, urllib.request

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm, mm
from reportlab.lib.colors import HexColor, black, white
from reportlab.pdfgen import canvas as rl_canvas

W, H = A4

# ── Polybe 5×5 ───────────────────────────────────────────────
ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
POLYBE = {}
for i, ch in enumerate(ALPHABET[:25]):
    POLYBE[ch] = f'{i//5+1}{i%5+1}'
POLYBE['Z'] = POLYBE['Y']

GRID = [
    ['', '1', '2', '3', '4', '5'],
    ['1', 'A', 'B', 'C', 'D', 'E'],
    ['2', 'F', 'G', 'H', 'I', 'J'],
    ['3', 'K', 'L', 'M', 'N', 'O'],
    ['4', 'P', 'Q', 'R', 'S', 'T'],
    ['5', 'U', 'V', 'W', 'X', 'Y/Z'],
]

def encode(word):
    return '  '.join(POLYBE.get(c, '??') for c in word.upper() if c.isalpha())

# ── Couleurs ──────────────────────────────────────────────────
INK   = HexColor('#1a1a1a')
LIGHT = HexColor('#888888')
RULE  = HexColor('#cccccc')
STAMP = HexColor('#9b1c1c')
BOX   = HexColor('#f0f0f0')

def _font(c, name='Courier', size=10, color=INK):
    c.setFont(name, size)
    c.setFillColor(color)

def _rule(c, y, x1=None, x2=None, w=0.4, color=RULE):
    c.setStrokeColor(color)
    c.setLineWidth(w)
    c.line(x1 or 1.5*cm, y, x2 or W-1.5*cm, y)

def _border(c):
    c.setStrokeColor(RULE)
    c.setLineWidth(0.5)
    m = 1.2*cm
    c.rect(m, m, W-2*m, H-2*m, fill=0, stroke=1)

def _header(c, title, subtitle=''):
    _font(c, 'Courier', 7, LIGHT)
    c.drawString(1.5*cm, H-1.4*cm, 'BUREAU CLANDESTIN BXL  ·  SECTION HÊLIE  ·  CLASSIFIÉ')
    c.drawRightString(W-1.5*cm, H-1.4*cm, 'NE PAS REPRODUIRE')
    _rule(c, H-1.7*cm, w=0.3)
    _font(c, 'Courier-Bold', 15, INK)
    c.drawCentredString(W/2, H-3.1*cm, title)
    if subtitle:
        _font(c, 'Courier', 8, LIGHT)
        c.drawCentredString(W/2, H-3.9*cm, subtitle)
    _rule(c, H-4.4*cm, w=0.6, color=INK)

def _stamp(c, x, y, text, angle=-12):
    c.saveState()
    c.translate(x, y)
    c.rotate(angle)
    c.setFillColor(STAMP)
    c.setFont('Helvetica-Bold', 7)
    c.setStrokeColor(STAMP)
    c.setLineWidth(1.0)
    tw = c.stringWidth(text, 'Helvetica-Bold', 7)
    pad = 2.5*mm
    c.rect(-tw/2-pad, -3*mm, tw+2*pad, 5.5*mm, fill=0, stroke=1)
    c.drawCentredString(0, -1.2*mm, text)
    c.restoreState()

# ══════════════════════════════════════════════════════════════
# SYMBOLES — dessinés au trait (paths ReportLab)
# cx, cy = centre ; s = taille de référence (~4mm)
# ══════════════════════════════════════════════════════════════
def _sym_stroke(c, lw=1.2):
    c.setStrokeColor(INK)
    c.setFillColor(INK)
    c.setLineWidth(lw)
    c.setLineCap(1)   # round
    c.setLineJoin(1)  # round

def draw_sym(c, letter, cx, cy, s=4*mm):
    _sym_stroke(c)
    p = c.beginPath()
    r = s * 0.45  # rayon de référence

    if letter == 'A':   # ∧ chevron haut
        p.moveTo(cx-r, cy-r*0.5); p.lineTo(cx, cy+r*0.7); p.lineTo(cx+r, cy-r*0.5)
    elif letter == 'B': # crochet ouvert à gauche (∫ sans haut)
        p.moveTo(cx+r*0.2, cy+r*0.8)
        p.lineTo(cx+r*0.2, cy-r*0.3)
        p.curveTo(cx+r*0.2, cy-r*0.9, cx-r*0.6, cy-r*0.9, cx-r*0.6, cy-r*0.4)
    elif letter == 'C': # arc ouvert à droite ⊂
        p.moveTo(cx+r*0.3, cy+r*0.8)
        p.curveTo(cx-r*0.8, cy+r*0.8, cx-r*0.8, cy-r*0.8, cx+r*0.3, cy-r*0.8)
    elif letter == 'D': # arc ouvert à gauche ⊃
        p.moveTo(cx-r*0.3, cy+r*0.8)
        p.curveTo(cx+r*0.8, cy+r*0.8, cx+r*0.8, cy-r*0.8, cx-r*0.3, cy-r*0.8)
    elif letter == 'E': # angle haut-gauche Γ
        p.moveTo(cx+r*0.5, cy+r*0.7); p.lineTo(cx-r*0.5, cy+r*0.7)
        p.lineTo(cx-r*0.5, cy-r*0.7)
    elif letter == 'F': # angle haut-droit ⌐
        p.moveTo(cx-r*0.5, cy+r*0.7); p.lineTo(cx+r*0.5, cy+r*0.7)
        p.lineTo(cx+r*0.5, cy-r*0.7)
    elif letter == 'G': # angle avec crochet
        p.moveTo(cx+r*0.5, cy+r*0.7); p.lineTo(cx-r*0.5, cy+r*0.7)
        p.lineTo(cx-r*0.5, cy-r*0.1)
        p.curveTo(cx-r*0.5, cy-r*0.8, cx+r*0.3, cy-r*0.8, cx+r*0.3, cy-r*0.4)
    elif letter == 'H': # demi-cercle rempli gauche ◐
        c.setFillColor(INK)
        p.moveTo(cx, cy+r*0.8)
        p.curveTo(cx-r*0.9, cy+r*0.8, cx-r*0.9, cy-r*0.8, cx, cy-r*0.8)
        p.lineTo(cx, cy+r*0.8)
        c.drawPath(p, fill=1, stroke=0)
        p2 = c.beginPath()
        p2.moveTo(cx, cy+r*0.8)
        p2.curveTo(cx+r*0.9, cy+r*0.8, cx+r*0.9, cy-r*0.8, cx, cy-r*0.8)
        c.drawPath(p2, fill=0, stroke=1)
        return
    elif letter == 'I': # barre verticale
        p.moveTo(cx, cy+r*0.8); p.lineTo(cx, cy-r*0.8)
    elif letter == 'J': # J
        p.moveTo(cx+r*0.3, cy+r*0.8)
        p.lineTo(cx+r*0.3, cy-r*0.3)
        p.curveTo(cx+r*0.3, cy-r*0.9, cx-r*0.5, cy-r*0.9, cx-r*0.5, cy-r*0.4)
    elif letter == 'K': # < chevron gauche
        p.moveTo(cx+r*0.4, cy+r*0.7); p.lineTo(cx-r*0.4, cy); p.lineTo(cx+r*0.4, cy-r*0.7)
    elif letter == 'L': # angle bas-gauche └
        p.moveTo(cx-r*0.5, cy+r*0.7); p.lineTo(cx-r*0.5, cy-r*0.7)
        p.lineTo(cx+r*0.5, cy-r*0.7)
    elif letter == 'M': # angle haut-droit ┐
        p.moveTo(cx+r*0.5, cy+r*0.7); p.lineTo(cx+r*0.5, cy-r*0.7)
        p.moveTo(cx+r*0.5, cy+r*0.7); p.lineTo(cx-r*0.5, cy+r*0.7)
    elif letter == 'N': # Z penché (comme dans image)
        p.moveTo(cx-r*0.5, cy+r*0.7); p.lineTo(cx+r*0.5, cy+r*0.1)
        p.lineTo(cx-r*0.2, cy-r*0.1); p.lineTo(cx+r*0.4, cy-r*0.7)
    elif letter == 'O': # cercle ○
        p.circle(cx, cy, r*0.75)
        c.drawPath(p, fill=0, stroke=1)
        return
    elif letter == 'P': # arc sourire (⌣)
        p.moveTo(cx-r*0.7, cy+r*0.2)
        p.curveTo(cx-r*0.7, cy-r*0.9, cx+r*0.7, cy-r*0.9, cx+r*0.7, cy+r*0.2)
    elif letter == 'Q': # arc retourné (⌢)
        p.moveTo(cx-r*0.6, cy-r*0.3)
        p.curveTo(cx-r*0.6, cy+r*0.7, cx+r*0.6, cy+r*0.7, cx+r*0.6, cy-r*0.3)
    elif letter == 'R': # \ antislash
        p.moveTo(cx-r*0.5, cy+r*0.7); p.lineTo(cx+r*0.5, cy-r*0.7)
    elif letter == 'S': # / slash
        p.moveTo(cx+r*0.5, cy+r*0.7); p.lineTo(cx-r*0.5, cy-r*0.7)
    elif letter == 'T': # — tiret horizontal
        p.moveTo(cx-r*0.7, cy); p.lineTo(cx+r*0.7, cy)
    elif letter == 'U': # ∪ coupe
        p.moveTo(cx-r*0.6, cy+r*0.7)
        p.lineTo(cx-r*0.6, cy)
        p.curveTo(cx-r*0.6, cy-r*0.9, cx+r*0.6, cy-r*0.9, cx+r*0.6, cy)
        p.lineTo(cx+r*0.6, cy+r*0.7)
    elif letter == 'V': # ∨ chevron bas
        p.moveTo(cx-r*0.6, cy+r*0.5); p.lineTo(cx, cy-r*0.7); p.lineTo(cx+r*0.6, cy+r*0.5)
    elif letter == 'W': # ∩ arche
        p.moveTo(cx-r*0.6, cy-r*0.7)
        p.lineTo(cx-r*0.6, cy)
        p.curveTo(cx-r*0.6, cy+r*0.9, cx+r*0.6, cy+r*0.9, cx+r*0.6, cy)
        p.lineTo(cx+r*0.6, cy-r*0.7)
    elif letter == 'X': # > chevron droit
        p.moveTo(cx-r*0.4, cy+r*0.7); p.lineTo(cx+r*0.4, cy); p.lineTo(cx-r*0.4, cy-r*0.7)
    elif letter == 'Y': # angle bas-droit ⌋
        p.moveTo(cx+r*0.5, cy+r*0.7); p.lineTo(cx+r*0.5, cy-r*0.7)
        p.lineTo(cx-r*0.5, cy-r*0.7)
    elif letter == 'Z': # Z zigzag
        p.moveTo(cx-r*0.5, cy+r*0.7); p.lineTo(cx+r*0.5, cy+r*0.7)
        p.lineTo(cx-r*0.5, cy-r*0.7); p.lineTo(cx+r*0.5, cy-r*0.7)
    else:
        return
    c.drawPath(p, fill=0, stroke=1)


# ══════════════════════════════════════════════════════════════
# PAGE 1 — GRILLE + TABLE SYMBOLES
# ══════════════════════════════════════════════════════════════
def page_cipher(c):
    _border(c)
    _header(c, 'GRILLE SECRÈTE  ALPHA·5',
               'Chaque lettre = LIGNE puis COLONNE  —  ex: A=11  L=32  Z=55')

    # ── Grille Polybe ────────────────────────────────────────
    y0 = H - 5.5*cm
    cell_w, cell_h = 1.6*cm, 1.0*cm
    gx0 = (W - 6 * cell_w) / 2

    for ri, row in enumerate(GRID):
        for ci, val in enumerate(row):
            x = gx0 + ci * cell_w
            y = y0 - ri * cell_h
            if ri == 0 or ci == 0:
                c.setFillColor(BOX); c.rect(x, y-cell_h, cell_w, cell_h, fill=1, stroke=0)
            c.setStrokeColor(RULE); c.setLineWidth(0.4)
            c.rect(x, y-cell_h, cell_w, cell_h, fill=0, stroke=1)
            if val:
                _font(c, 'Courier-Bold' if (ri==0 or ci==0) else 'Courier', 10, INK)
                c.drawCentredString(x+cell_w/2, y-cell_h*0.65, val)

    _stamp(c, W/2+5.5*cm, y0-1.3*cm, 'CONFIDENTIEL')

    # ── Séparateur ───────────────────────────────────────────
    sep_y = y0 - 6.5*cm
    _rule(c, sep_y, w=0.6, color=INK)
    _font(c, 'Courier-Bold', 9, INK)
    c.drawCentredString(W/2, sep_y - 0.7*cm, '━━  TABLE DE CHIFFREMENT  —  ALPHABIQUE  ━━')
    _font(c, 'Courier', 7.5, LIGHT)
    c.drawCentredString(W/2, sep_y - 1.25*cm, 'Remplacez chaque lettre par son symbole pour coder un message')

    # ── Table symboles — 2 colonnes de 13 lettres ────────────
    col_letters = [ALPHABET[:13], ALPHABET[13:]]
    col_x  = [1.8*cm, W/2 + 0.3*cm]
    cell_sym_w = 0.85*cm   # largeur colonne lettre+symbole
    row_h      = 1.05*cm
    sym_size   = 3.5*mm

    ty_start = sep_y - 2.0*cm

    for col_i, letters in enumerate(col_letters):
        x0 = col_x[col_i]
        col_w = (W/2 - 2.1*cm)  # largeur disponible par colonne

        for row_i, letter in enumerate(letters):
            cx_letter = x0 + 0.45*cm
            cx_sym    = x0 + 2.2*cm
            ry        = ty_start - row_i * row_h
            cy_cell   = ry - row_h * 0.5

            # Fond léger alternance
            if row_i % 2 == 0:
                c.setFillColor(HexColor('#f8f8f8'))
                c.rect(x0, ry - row_h, col_w, row_h, fill=1, stroke=0)

            # Bordure cellule
            c.setStrokeColor(RULE); c.setLineWidth(0.3)
            c.rect(x0, ry - row_h, col_w, row_h, fill=0, stroke=1)

            # Lettre
            _font(c, 'Courier-Bold', 10, INK)
            c.drawString(x0 + 0.25*cm, cy_cell - 3.5, letter)

            # Séparateur intérieur
            c.setStrokeColor(RULE); c.setLineWidth(0.3)
            c.line(x0 + 1.1*cm, ry, x0 + 1.1*cm, ry - row_h)

            # Symbole dessiné
            draw_sym(c, letter, x0 + 1.1*cm + (col_w - 1.1*cm)/2, cy_cell, sym_size)

    # ── Pied ─────────────────────────────────────────────────
    _rule(c, 1.5*cm, w=0.3)
    _font(c, 'Courier', 6.5, LIGHT)
    c.drawCentredString(W/2, 1.15*cm, 'OPÉRATION HÊLIE — NE PAS COMMUNIQUER EN DEHORS DU GROUPE')


# ══════════════════════════════════════════════════════════════
# PAGE 2+ — CODES À DÉCOUPER (2 par A4, sans révéler le mot)
# ══════════════════════════════════════════════════════════════
def _code_half(c, y_top, y_bot, code_word):
    mx = 1.8*cm
    half_h = y_top - y_bot - 4*mm

    # Cadre
    c.setStrokeColor(INK); c.setLineWidth(0.8)
    c.rect(mx, y_bot, W-2*mx, half_h, fill=0, stroke=1)
    c.setStrokeColor(RULE); c.setLineWidth(0.3)
    c.rect(mx+2*mm, y_bot+2*mm, W-2*mx-4*mm, half_h-4*mm, fill=0, stroke=1)

    pad = 7*mm
    x0 = mx + pad;  x1 = W - mx - pad
    y  = y_top - 10*mm

    # En-tête document
    _font(c, 'Courier', 6.5, LIGHT)
    c.drawString(x0, y, 'TRANSMISSION CHIFFRÉE  ·  PRIORITÉ ABSOLUE')
    c.drawRightString(x1, y, 'USAGE UNIQUE — DÉTRUIRE APRÈS DÉCODAGE')
    y -= 4*mm
    _rule(c, y, x0, x1, w=0.5, color=INK)
    y -= 9*mm

    # Message chiffré — Polybe
    encoded = encode(code_word)
    _font(c, 'Courier', 7, LIGHT)
    c.drawString(x0, y, 'MESSAGE CHIFFRÉ :')
    y -= 7*mm

    _font(c, 'Courier-Bold', 19, INK)
    tw = c.stringWidth(encoded, 'Courier-Bold', 19)
    if tw > (x1 - x0):
        _font(c, 'Courier-Bold', 14, INK)
    c.drawCentredString(W/2, y, encoded)
    y -= 8*mm

    _font(c, 'Courier', 7.5, LIGHT)
    c.drawCentredString(W/2, y, '─── utilisez la grille ALPHA·5 et la table de chiffrement ───')
    y -= 10*mm

    # Cases vides pour écrire la réponse
    n = len([ch for ch in code_word.upper() if ch.isalpha()])
    bw = 1.05*cm
    total = n * bw + (n-1) * 3*mm
    bx = (W - total) / 2
    for _ in range(n):
        c.setStrokeColor(INK); c.setLineWidth(0.5)
        c.rect(bx, y-0.9*cm, bw, 0.9*cm, fill=0, stroke=1)
        bx += bw + 3*mm

    # Stamp
    _stamp(c, x1 - 5*mm, y_bot + half_h*0.45, 'CLASSIFIÉ', angle=14)

    # Pied
    _rule(c, y_bot + 9*mm, x0, x1, w=0.3)
    _font(c, 'Courier', 6, LIGHT)
    c.drawCentredString(W/2, y_bot+5*mm, 'BUREAU CLANDESTIN BXL  ·  SECTION HÊLIE  ·  CONFIDENTIEL')


def page_codes(c, codes):
    pairs = [(codes[i], codes[i+1] if i+1 < len(codes) else None)
             for i in range(0, len(codes), 2)]

    for top_code, bot_code in pairs:
        _border(c)
        mid_y = H / 2

        # Ligne de découpe
        c.setStrokeColor(LIGHT); c.setLineWidth(0.5); c.setDash(3, 4)
        c.line(1.2*cm, mid_y, W-1.2*cm, mid_y)
        c.setDash()
        _font(c, 'Courier', 7, LIGHT)
        c.drawCentredString(W/2, mid_y+2*mm, '✂   DÉCOUPER ICI   ✂')

        _code_half(c, H-5*mm, mid_y+6*mm, top_code)
        if bot_code:
            _code_half(c, mid_y-6*mm, 5*mm, bot_code)

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
        codes      = [ch.get('code', '').upper() for ch in real if ch.get('code')]
        if not codes:
            codes = ['LASER', 'ANTIDOTE', 'COBRA', 'TRAHISON']

        buf = io.BytesIO()
        c   = rl_canvas.Canvas(buf, pagesize=A4)

        page_cipher(c)
        c.showPage()
        page_codes(c, codes)
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
