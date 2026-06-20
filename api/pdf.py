"""
API Vercel — génère le PDF des props imprimables depuis la config KV.
GET /api/pdf  →  application/pdf
"""

from http.server import BaseHTTPRequestHandler
import os, json, io, urllib.request

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm, mm
from reportlab.lib.colors import HexColor, black
from reportlab.pdfgen import canvas as rl_canvas

W, H = A4

# ══════════════════════════════════════════════════════════════
# POLYBE 5×5
# ══════════════════════════════════════════════════════════════
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

def encode_polybe(word):
    return '  '.join(POLYBE.get(c, '??') for c in word.upper() if c.isalpha())

# ══════════════════════════════════════════════════════════════
# MORSE
# ══════════════════════════════════════════════════════════════
MORSE = {
    'A':'.-',   'B':'-...', 'C':'-.-.', 'D':'-..',  'E':'.',
    'F':'..-.', 'G':'--.',  'H':'....', 'I':'..',   'J':'.---',
    'K':'-.-',  'L':'.-..', 'M':'--',   'N':'-.',   'O':'---',
    'P':'.--.', 'Q':'--.-', 'R':'.-.',  'S':'...',  'T':'-',
    'U':'..-',  'V':'...-', 'W':'.--',  'X':'-..-', 'Y':'-.--',
    'Z':'--..',
}

def encode_morse(word):
    return '  /  '.join(MORSE.get(c, '?') for c in word.upper() if c.isalpha())

def morse_display(code):
    """Remplace . par · et - par —"""
    return code.replace('.', '·').replace('-', '—')

# ══════════════════════════════════════════════════════════════
# COULEURS / HELPERS
# ══════════════════════════════════════════════════════════════
INK   = HexColor('#1a1a1a')
LIGHT = HexColor('#888888')
RULE  = HexColor('#cccccc')
STAMP = HexColor('#9b1c1c')
BOX   = HexColor('#f0f0f0')
BOX2  = HexColor('#f5f5f5')

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

    if letter == 'A':   # ∧ chevron haut
        p.moveTo(cx-r, cy-r*.5); p.lineTo(cx, cy+r*.8); p.lineTo(cx+r, cy-r*.5)
    elif letter == 'B': # crochet ouvert gauche
        p.moveTo(cx+r*.2, cy+r*.8); p.lineTo(cx+r*.2, cy-r*.3)
        p.curveTo(cx+r*.2, cy-r*.9, cx-r*.6, cy-r*.9, cx-r*.6, cy-r*.4)
    elif letter == 'C': # arc ⊂
        p.moveTo(cx+r*.3, cy+r*.8)
        p.curveTo(cx-r*.8, cy+r*.8, cx-r*.8, cy-r*.8, cx+r*.3, cy-r*.8)
    elif letter == 'D': # arc ⊃
        p.moveTo(cx-r*.3, cy+r*.8)
        p.curveTo(cx+r*.8, cy+r*.8, cx+r*.8, cy-r*.8, cx-r*.3, cy-r*.8)
    elif letter == 'E': # angle haut-gauche Γ
        p.moveTo(cx+r*.5, cy+r*.7); p.lineTo(cx-r*.5, cy+r*.7); p.lineTo(cx-r*.5, cy-r*.7)
    elif letter == 'F': # angle haut-droit ⌐
        p.moveTo(cx-r*.5, cy+r*.7); p.lineTo(cx+r*.5, cy+r*.7); p.lineTo(cx+r*.5, cy-r*.7)
    elif letter == 'G': # angle avec crochet
        p.moveTo(cx+r*.5, cy+r*.7); p.lineTo(cx-r*.5, cy+r*.7); p.lineTo(cx-r*.5, cy-r*.1)
        p.curveTo(cx-r*.5, cy-r*.8, cx+r*.3, cy-r*.8, cx+r*.3, cy-r*.4)
    elif letter == 'H': # deux barres verticales ||
        p.moveTo(cx-r*.35, cy+r*.8); p.lineTo(cx-r*.35, cy-r*.8)
        p.moveTo(cx+r*.35, cy+r*.8); p.lineTo(cx+r*.35, cy-r*.8)
    elif letter == 'I': # | barre verticale
        p.moveTo(cx, cy+r*.8); p.lineTo(cx, cy-r*.8)
    elif letter == 'J': # J
        p.moveTo(cx+r*.3, cy+r*.8); p.lineTo(cx+r*.3, cy-r*.3)
        p.curveTo(cx+r*.3, cy-r*.9, cx-r*.5, cy-r*.9, cx-r*.5, cy-r*.4)
    elif letter == 'K': # < chevron gauche
        p.moveTo(cx+r*.4, cy+r*.7); p.lineTo(cx-r*.4, cy); p.lineTo(cx+r*.4, cy-r*.7)
    elif letter == 'L': # angle bas-gauche └
        p.moveTo(cx-r*.5, cy+r*.7); p.lineTo(cx-r*.5, cy-r*.7); p.lineTo(cx+r*.5, cy-r*.7)
    elif letter == 'M': # angle haut-droit ┐
        p.moveTo(cx-r*.5, cy+r*.7); p.lineTo(cx+r*.5, cy+r*.7); p.lineTo(cx+r*.5, cy-r*.7)
    elif letter == 'N': # Z penché
        p.moveTo(cx-r*.5, cy+r*.7); p.lineTo(cx+r*.5, cy+r*.1)
        p.lineTo(cx-r*.2, cy-r*.1); p.lineTo(cx+r*.4, cy-r*.7)
    elif letter == 'O': # cercle ○
        p.circle(cx, cy, r*.75)
        c.drawPath(p, fill=0, stroke=1); return
    elif letter == 'P': # arc sourire ⌣
        p.moveTo(cx-r*.7, cy+r*.2)
        p.curveTo(cx-r*.7, cy-r*.9, cx+r*.7, cy-r*.9, cx+r*.7, cy+r*.2)
    elif letter == 'Q': # arc ⌢
        p.moveTo(cx-r*.6, cy-r*.3)
        p.curveTo(cx-r*.6, cy+r*.7, cx+r*.6, cy+r*.7, cx+r*.6, cy-r*.3)
    elif letter == 'R': # \ antislash
        p.moveTo(cx-r*.5, cy+r*.7); p.lineTo(cx+r*.5, cy-r*.7)
    elif letter == 'S': # / slash
        p.moveTo(cx+r*.5, cy+r*.7); p.lineTo(cx-r*.5, cy-r*.7)
    elif letter == 'T': # — tiret
        p.moveTo(cx-r*.7, cy); p.lineTo(cx+r*.7, cy)
    elif letter == 'U': # ∪
        p.moveTo(cx-r*.6, cy+r*.7); p.lineTo(cx-r*.6, cy)
        p.curveTo(cx-r*.6, cy-r*.9, cx+r*.6, cy-r*.9, cx+r*.6, cy)
        p.lineTo(cx+r*.6, cy+r*.7)
    elif letter == 'V': # ∨ chevron bas
        p.moveTo(cx-r*.6, cy+r*.5); p.lineTo(cx, cy-r*.7); p.lineTo(cx+r*.6, cy+r*.5)
    elif letter == 'W': # ∩ arche
        p.moveTo(cx-r*.6, cy-r*.7); p.lineTo(cx-r*.6, cy)
        p.curveTo(cx-r*.6, cy+r*.9, cx+r*.6, cy+r*.9, cx+r*.6, cy)
        p.lineTo(cx+r*.6, cy-r*.7)
    elif letter == 'X': # > chevron droit
        p.moveTo(cx-r*.4, cy+r*.7); p.lineTo(cx+r*.4, cy); p.lineTo(cx-r*.4, cy-r*.7)
    elif letter == 'Y': # angle bas-droit ⌋
        p.moveTo(cx+r*.5, cy+r*.7); p.lineTo(cx+r*.5, cy-r*.7); p.lineTo(cx-r*.5, cy-r*.7)
    elif letter == 'Z': # Z zigzag
        p.moveTo(cx-r*.5, cy+r*.7); p.lineTo(cx+r*.5, cy+r*.7)
        p.lineTo(cx-r*.5, cy-r*.7); p.lineTo(cx+r*.5, cy-r*.7)
    else:
        return
    c.drawPath(p, fill=0, stroke=1)


# ══════════════════════════════════════════════════════════════
# PAGE 1 — TROIS TABLES DE CHIFFREMENT
# ══════════════════════════════════════════════════════════════
def page_cipher(c):
    _border(c)

    # ── En-tête compact ──────────────────────────────────────
    _font(c, 'Courier', 6.5, LIGHT)
    c.drawString(1.5*cm, H-1.3*cm, 'BUREAU CLANDESTIN BXL  ·  SECTION HÊLIE')
    c.drawRightString(W-1.5*cm, H-1.3*cm, 'CLASSIFIÉ — NE PAS REPRODUIRE')
    _rule(c, H-1.6*cm, w=0.3)
    _font(c, 'Courier-Bold', 13, INK)
    c.drawCentredString(W/2, H-2.7*cm, 'TABLES DE CHIFFREMENT — OPÉRATION HÊLIE')
    _rule(c, H-3.2*cm, w=0.5, color=INK)

    cur_y = H - 3.8*cm   # curseur vertical

    # ══ 1. TABLE DE SYMBOLES ════════════════════════════════
    _font(c, 'Courier-Bold', 8, INK)
    c.drawString(1.5*cm, cur_y, '① ALPHABET SYMBOLIQUE')
    _font(c, 'Courier', 6.5, LIGHT)
    c.drawRightString(W-1.5*cm, cur_y, 'Chaque lettre est représentée par un symbole unique')
    cur_y -= 0.5*cm

    row_h  = 0.78*cm
    col_w  = (W - 3.0*cm) / 2   # 2 colonnes
    sym_s  = 2.7*mm              # taille symbole
    n_rows = 13                  # 13 lettres par colonne

    for col_i in range(2):
        letters = ALPHABET[col_i*n_rows : (col_i+1)*n_rows]
        x0 = 1.5*cm + col_i * (col_w + 0*cm)
        lw = col_w / 3           # largeur colonne lettre
        sw = col_w * 2/3         # largeur colonne symbole

        # En-têtes colonnes
        _font(c, 'Courier', 6, LIGHT)
        c.drawCentredString(x0 + lw/2, cur_y + 0.15*cm, 'LET.')
        c.drawCentredString(x0 + lw + sw/2, cur_y + 0.15*cm, 'SYMBOLE')
        c.setStrokeColor(RULE); c.setLineWidth(0.3)
        c.line(x0, cur_y, x0+col_w, cur_y)

        for ri, letter in enumerate(letters):
            ry   = cur_y - (ri+1)*row_h
            cy_c = ry + row_h/2

            # Fond alterné
            if ri % 2 == 0:
                c.setFillColor(BOX); c.rect(x0, ry, col_w, row_h, fill=1, stroke=0)

            # Bordures
            c.setStrokeColor(RULE); c.setLineWidth(0.25)
            c.rect(x0, ry, col_w, row_h, fill=0, stroke=1)
            c.line(x0+lw, ry, x0+lw, ry+row_h)

            _font(c, 'Courier-Bold', 9, INK)
            c.drawCentredString(x0 + lw/2, cy_c - 3, letter)
            draw_sym(c, letter, x0 + lw + sw/2, cy_c, sym_s)

    cur_y -= n_rows * row_h + 0.5*cm

    # ══ 2. TABLE MORSE ══════════════════════════════════════
    _rule(c, cur_y, w=0.5, color=INK)
    cur_y -= 0.45*cm
    _font(c, 'Courier-Bold', 8, INK)
    c.drawString(1.5*cm, cur_y, '② CODE MORSE')
    _font(c, 'Courier', 6.5, LIGHT)
    c.drawRightString(W-1.5*cm, cur_y, '· = point court  —  = trait long   /  = séparation de lettres')
    cur_y -= 0.5*cm

    morse_row_h = 0.6*cm
    m_cols = 6   # 6 colonnes pour tenir tout sur la largeur
    letters_per_col = 5  # 26/6 ≈ 5 (avec reste)

    m_col_w = (W - 3.0*cm) / m_cols
    mx0 = 1.5*cm

    for i, letter in enumerate(ALPHABET):
        col_i = i // letters_per_col if i < 25 else 5
        row_i = i % letters_per_col
        if col_i >= m_cols: col_i = m_cols - 1
        x0 = mx0 + col_i * m_col_w
        ry = cur_y - (row_i + 1) * morse_row_h
        cy_c = ry + morse_row_h / 2

        if row_i % 2 == 0:
            c.setFillColor(BOX); c.rect(x0, ry, m_col_w, morse_row_h, fill=1, stroke=0)
        c.setStrokeColor(RULE); c.setLineWidth(0.2)
        c.rect(x0, ry, m_col_w, morse_row_h, fill=0, stroke=1)

        _font(c, 'Courier-Bold', 7.5, INK)
        c.drawString(x0 + 1.5*mm, cy_c - 2.5, letter)
        code_str = morse_display(MORSE.get(letter, '?'))
        _font(c, 'Courier', 7, LIGHT)
        tw = c.stringWidth(code_str, 'Courier', 7)
        if tw > m_col_w - 1*cm:
            _font(c, 'Courier', 5.5, LIGHT)
        c.drawString(x0 + 0.5*cm, cy_c - 2.5, code_str)

    cur_y -= 5 * morse_row_h + 0.5*cm   # 5 lignes max

    # ══ 3. GRILLE POLYBE 5×5 ════════════════════════════════
    _rule(c, cur_y, w=0.5, color=INK)
    cur_y -= 0.45*cm
    _font(c, 'Courier-Bold', 8, INK)
    c.drawString(1.5*cm, cur_y, '③ GRILLE POLYBE  (LIGNE × COLONNE)')
    _font(c, 'Courier', 6.5, LIGHT)
    c.drawRightString(W-1.5*cm, cur_y, 'Lisez LIGNE puis COLONNE  —  ex: A=11  L=32  Z=55')
    cur_y -= 0.5*cm

    cell_w, cell_h = 1.55*cm, 0.85*cm
    gx0 = (W - 6 * cell_w) / 2

    for ri, row in enumerate(GRID):
        for ci, val in enumerate(row):
            x = gx0 + ci * cell_w
            y = cur_y - (ri+1) * cell_h
            if ri == 0 or ci == 0:
                c.setFillColor(BOX); c.rect(x, y, cell_w, cell_h, fill=1, stroke=0)
            c.setStrokeColor(RULE); c.setLineWidth(0.3)
            c.rect(x, y, cell_w, cell_h, fill=0, stroke=1)
            if val:
                _font(c, 'Courier-Bold' if (ri==0 or ci==0) else 'Courier', 9.5, INK)
                c.drawCentredString(x+cell_w/2, y+cell_h*0.28, val)

    cur_y -= 6 * cell_h + 0.4*cm

    # Pied
    _rule(c, 1.5*cm, w=0.3)
    _font(c, 'Courier', 6.5, LIGHT)
    c.drawCentredString(W/2, 1.15*cm, 'OPÉRATION HÊLIE — NE PAS COMMUNIQUER EN DEHORS DU GROUPE')
    _stamp(c, W-3.5*cm, 2.2*cm, 'CONFIDENTIEL')


# ══════════════════════════════════════════════════════════════
# PAGES CODES — 3 ENCODAGES PAR FEUILLET, 2 PAR A4
# ══════════════════════════════════════════════════════════════
def _code_half(c, y_top, y_bot, code_word):
    mx = 1.8*cm
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

    # En-tête
    _font(c, 'Courier', 6.5, LIGHT)
    c.drawString(x0, y, 'TRANSMISSION CHIFFRÉE  ·  PRIORITÉ ABSOLUE')
    c.drawRightString(x1, y, 'USAGE UNIQUE')
    y -= 4*mm
    _rule(c, y, x0, x1, w=0.5, color=INK)
    y -= 6*mm

    letters = [ch for ch in code_word.upper() if ch.isalpha()]
    n = len(letters)

    # ── ① Symboles ─────────────────────────────────────────
    _font(c, 'Courier', 6.5, LIGHT)
    c.drawString(x0, y, '① SYMBOLES :')
    y -= 1*mm

    sym_s   = 3.8*mm
    sym_gap = (cw - n * sym_s * 2.2) / max(n-1, 1) if n > 1 else 0
    sym_gap = max(sym_gap, 1*mm)
    sx = x0 + (cw - (n * sym_s * 2.2 + (n-1) * sym_gap)) / 2

    for letter in letters:
        draw_sym(c, letter, sx + sym_s, y - sym_s, sym_s)
        sx += sym_s * 2.2 + sym_gap
    y -= sym_s * 2.2 + 1.5*mm

    # ── ② Morse ─────────────────────────────────────────────
    _rule(c, y, x0, x1, w=0.25)
    y -= 5*mm
    _font(c, 'Courier', 6.5, LIGHT)
    c.drawString(x0, y, '② MORSE :')
    y -= 0.5*mm
    morse_parts = [morse_display(MORSE.get(l, '?')) for l in letters]
    morse_str = '   /   '.join(morse_parts)
    _font(c, 'Courier-Bold', 9, INK)
    tw = c.stringWidth(morse_str, 'Courier-Bold', 9)
    if tw > cw:
        _font(c, 'Courier-Bold', 7.5, INK)
    c.drawCentredString(W/2, y - 5*mm, morse_str)
    y -= 12*mm

    # ── ③ Polybe ─────────────────────────────────────────────
    _rule(c, y, x0, x1, w=0.25)
    y -= 5*mm
    _font(c, 'Courier', 6.5, LIGHT)
    c.drawString(x0, y, '③ POLYBE :')
    y -= 0.5*mm
    polybe_str = encode_polybe(code_word)
    _font(c, 'Courier-Bold', 13, INK)
    c.drawCentredString(W/2, y - 6*mm, polybe_str)
    y -= 14*mm

    # ── Cases réponse ────────────────────────────────────────
    _rule(c, y, x0, x1, w=0.3)
    y -= 7*mm
    _font(c, 'Courier', 6.5, LIGHT)
    c.drawCentredString(W/2, y, 'RÉPONSE :')
    y -= 6*mm
    bw = min(1.1*cm, cw / (n + 0.5))
    total = n * bw + (n-1)*2*mm
    bx = (W - total) / 2
    for _ in letters:
        c.setStrokeColor(INK); c.setLineWidth(0.5)
        c.rect(bx, y-0.85*cm, bw, 0.85*cm, fill=0, stroke=1)
        bx += bw + 2*mm

    _stamp(c, x1-4*mm, y_bot + half_h*0.38, 'CLASSIFIÉ', angle=14)

    _rule(c, y_bot+9*mm, x0, x1, w=0.3)
    _font(c, 'Courier', 6, LIGHT)
    c.drawCentredString(W/2, y_bot+5*mm, 'BUREAU CLANDESTIN BXL  ·  SECTION HÊLIE')


def page_codes(c, codes):
    pairs = [(codes[i], codes[i+1] if i+1 < len(codes) else None)
             for i in range(0, len(codes), 2)]
    for top_code, bot_code in pairs:
        _border(c)
        mid_y = H / 2
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
