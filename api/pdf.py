"""
API Vercel — génère le PDF des props imprimables depuis la config KV.
GET /api/pdf  →  application/pdf
"""

from http.server import BaseHTTPRequestHandler
import os, json, io, urllib.request

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm, mm
from reportlab.lib.colors import HexColor, black, white
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.platypus import Table, TableStyle
from reportlab.lib import colors

W, H = A4

# ── Polybe 5×5 ───────────────────────────────────────────────
ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
POLYBE = {}
for i, ch in enumerate(ALPHABET[:25]):
    POLYBE[ch] = f'{i//5+1}{i%5+1}'
POLYBE['Z'] = POLYBE['Y']

def encode(word):
    return '  '.join(POLYBE.get(c, '??') for c in word.upper() if c.isalpha())

GRID = [
    ['', '1', '2', '3', '4', '5'],
    ['1', 'A', 'B', 'C', 'D', 'E'],
    ['2', 'F', 'G', 'H', 'I', 'J'],
    ['3', 'K', 'L', 'M', 'N', 'O'],
    ['4', 'P', 'Q', 'R', 'S', 'T'],
    ['5', 'U', 'V', 'W', 'X', 'Y/Z'],
]

# ── Couleurs ──────────────────────────────────────────────────
INK   = HexColor('#1a1a1a')
LIGHT = HexColor('#888888')
RULE  = HexColor('#cccccc')
STAMP = HexColor('#9b1c1c')
BOX   = HexColor('#f0f0f0')
ACCENT= HexColor('#003a10')

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
    _font(c, 'Courier-Bold', 16, INK)
    c.drawCentredString(W/2, H-3.2*cm, title)
    if subtitle:
        _font(c, 'Courier', 9, LIGHT)
        c.drawCentredString(W/2, H-4.1*cm, subtitle)
    _rule(c, H-4.7*cm, w=0.6, color=INK)

def _stamp(c, x, y, text, angle=-12):
    c.saveState()
    c.translate(x, y)
    c.rotate(angle)
    c.setFillColor(STAMP)
    c.setFont('Helvetica-Bold', 8)
    c.setStrokeColor(STAMP)
    c.setLineWidth(1.2)
    tw = c.stringWidth(text, 'Helvetica-Bold', 8)
    pad = 3*mm
    c.rect(-tw/2-pad, -3.5*mm, tw+2*pad, 6.5*mm, fill=0, stroke=1)
    c.drawCentredString(0, -1.5*mm, text)
    c.restoreState()

def _dot_row(c, y, n=22, x0=1.8*cm):
    c.setFillColor(HexColor('#dddddd'))
    step = (W - 2*x0) / (n-1)
    for i in range(n):
        c.circle(x0 + i*step, y, 0.6*mm, fill=1, stroke=0)

# ══════════════════════════════════════════════════════════════
# PAGE 1 — GRILLE SECRÈTE + TABLE DE CHIFFREMENT
# ══════════════════════════════════════════════════════════════
def page_cipher(c):
    _border(c)
    _header(c, 'GRILLE SECRÈTE  ALPHA·5',
               'Chaque lettre est codée par LIGNE puis COLONNE  —  ex: A = 11 · L = 32 · Z = 55')

    # ── Grille 5×5 ──────────────────────────────────────────
    y0 = H - 6.2*cm
    cell_w, cell_h = 1.8*cm, 1.1*cm
    gx0 = (W - 6 * cell_w) / 2  # centré

    for row_i, row in enumerate(GRID):
        for col_i, val in enumerate(row):
            x = gx0 + col_i * cell_w
            y = y0 - row_i * cell_h
            # fond pour header
            if row_i == 0 or col_i == 0:
                c.setFillColor(BOX)
                c.rect(x, y - cell_h, cell_w, cell_h, fill=1, stroke=0)
            c.setStrokeColor(RULE)
            c.setLineWidth(0.4)
            c.rect(x, y - cell_h, cell_w, cell_h, fill=0, stroke=1)
            if val:
                bold = row_i == 0 or col_i == 0
                _font(c, 'Courier-Bold' if bold else 'Courier', 11 if not bold else 10, INK)
                c.drawCentredString(x + cell_w/2, y - cell_h*0.65, val)

    _stamp(c, W/2 + 5.5*cm, y0 - 1.5*cm, 'CONFIDENTIEL')
    _dot_row(c, y0 - 6.5*cm)

    # ── Table de correspondance ──────────────────────────────
    ty = y0 - 7.3*cm
    _font(c, 'Courier-Bold', 9, INK)
    c.drawCentredString(W/2, ty, '━━  TABLE DE CORRESPONDANCE  A – Z  ━━')
    _rule(c, ty - 0.35*cm, w=0.3)

    items = [(ch, POLYBE[ch]) for ch in ALPHABET]
    items_per_row = 13
    rows = [items[i:i+items_per_row] for i in range(0, len(items), items_per_row)]

    ry = ty - 1.0*cm
    for row in rows:
        x = 1.8*cm
        col_w = (W - 3.6*cm) / items_per_row
        for ch, code in row:
            _font(c, 'Courier-Bold', 9, INK)
            c.drawString(x, ry, ch)
            _font(c, 'Courier', 9, LIGHT)
            c.drawString(x, ry - 0.45*cm, code)
            c.setStrokeColor(HexColor('#eeeeee'))
            c.setLineWidth(0.3)
            c.line(x - 1*mm, ry - 0.55*cm, x + col_w - 2*mm, ry - 0.55*cm)
            x += col_w
        ry -= 1.2*cm

    # ── Instructions ─────────────────────────────────────────
    iy = ry - 0.6*cm
    _rule(c, iy + 0.3*cm, w=0.3)
    _font(c, 'Courier', 8, LIGHT)
    lines = [
        'MODE D\'EMPLOI :',
        '① Repérez la lettre dans la grille  ② Lisez LIGNE puis COLONNE',
        '③ Chaque lettre donne un code à 2 chiffres  ④ Décodez le message chiffré',
        '',
        'Exemple :  C·O·B·R·A  →  13  35  12  43  11',
    ]
    for line in lines:
        _font(c, 'Courier-Bold' if line.startswith('MODE') else 'Courier', 8, LIGHT if not line.startswith('Exemple') else INK)
        c.drawCentredString(W/2, iy, line)
        iy -= 0.42*cm

    _dot_row(c, 1.8*cm)
    _font(c, 'Courier', 6.5, LIGHT)
    c.drawCentredString(W/2, 1.4*cm, 'OPÉRATION HÊLIE — NE PAS COMMUNIQUER CES INFORMATIONS EN DEHORS DU GROUPE')

# ══════════════════════════════════════════════════════════════
# PAGE 2 — CODES À DÉCOUPER  (2 par page, tranche A4)
# ══════════════════════════════════════════════════════════════
def _code_half(c, y_top, y_bot, challenge_title, code_word, ctx=''):
    """Dessine un document-prop sur la moitié de page."""
    mx = 1.8*cm
    half_h = y_top - y_bot

    # Cadre extérieur
    c.setStrokeColor(INK)
    c.setLineWidth(0.8)
    c.rect(mx, y_bot, W - 2*mx, half_h - 4*mm, fill=0, stroke=1)
    c.setLineWidth(0.3)
    c.setStrokeColor(RULE)
    c.rect(mx + 2*mm, y_bot + 2*mm, W - 2*mx - 4*mm, half_h - 8*mm, fill=0, stroke=1)

    pad = 6*mm
    x0 = mx + pad
    x1 = W - mx - pad
    cw  = x1 - x0
    y   = y_top - 10*mm

    # ── En-tête du document
    _font(c, 'Courier', 6.5, LIGHT)
    c.drawString(x0, y, 'TRANSMISSION CHIFFRÉE  ·  PRIORITÉ ABSOLUE')
    c.drawRightString(x1, y, 'USAGE UNIQUE — DÉTRUIRE APRÈS DÉCODAGE')
    y -= 4*mm
    _rule(c, y, x0, x1, w=0.4, color=INK)
    y -= 8*mm

    # Titre opération
    _font(c, 'Courier-Bold', 11, INK)
    c.drawString(x0, y, f'OPÉRATION : {challenge_title.upper()}')
    if ctx:
        _font(c, 'Courier', 8, LIGHT)
        y -= 5*mm
        c.drawString(x0, y, ctx)
    y -= 9*mm

    _rule(c, y, x0, x1, w=0.3)
    y -= 9*mm

    # Code chiffré
    encoded = encode(code_word)
    _font(c, 'Courier', 7, LIGHT)
    c.drawString(x0, y, 'MESSAGE CHIFFRÉ :')
    y -= 7*mm
    _font(c, 'Courier-Bold', 18, INK)
    tw = c.stringWidth(encoded, 'Courier-Bold', 18)
    # si trop large, réduire
    if tw > cw:
        _font(c, 'Courier-Bold', 13, INK)
    c.drawCentredString(W/2, y, encoded)
    y -= 8*mm

    # Ligne de décodage vide
    _font(c, 'Courier', 7.5, LIGHT)
    c.drawCentredString(W/2, y, '─── utilisez la grille ALPHA·5 pour décoder ───')
    y -= 8*mm

    # Cases vides pour écrire
    n_letters = len([ch for ch in code_word.upper() if ch.isalpha()])
    box_w = 1.1*cm
    total = n_letters * box_w + (n_letters - 1) * 3*mm
    bx = (W - total) / 2
    for _ in range(n_letters):
        c.setStrokeColor(INK)
        c.setLineWidth(0.5)
        c.rect(bx, y - 0.9*cm, box_w, 0.9*cm, fill=0, stroke=1)
        bx += box_w + 3*mm

    y -= 1.5*cm

    # Stamp rotatif
    _stamp(c, x1 - 1*cm, y_bot + half_h * 0.45, 'CLASSIFIÉ', angle=15)

    # Pied
    _rule(c, y_bot + 10*mm, x0, x1, w=0.3)
    _font(c, 'Courier', 6, LIGHT)
    c.drawCentredString(W/2, y_bot + 6*mm, 'BUREAU CLANDESTIN BXL  ·  SECTION HÊLIE  ·  CONFIDENTIEL')


def page_codes(c, codes):
    """Génère les pages de codes, 2 par A4 (à découper)."""
    # Découper en paires
    pairs = [(codes[i], codes[i+1] if i+1 < len(codes) else None)
             for i in range(0, len(codes), 2)]

    for top_code, bot_code in pairs:
        _border(c)

        mid_y = H / 2

        # Ligne de découpe
        c.setStrokeColor(LIGHT)
        c.setLineWidth(0.5)
        c.setDash(3, 4)
        c.line(1.2*cm, mid_y, W - 1.2*cm, mid_y)
        c.setDash()
        _font(c, 'Courier', 7, LIGHT)
        c.drawCentredString(W/2, mid_y + 2*mm, '✂   DÉCOUPER ICI   ✂')

        # Moitié haute
        _code_half(c, H - 5*mm, mid_y + 6*mm,
                   top_code, top_code)

        # Moitié basse
        if bot_code:
            _code_half(c, mid_y - 6*mm, 5*mm,
                       bot_code, bot_code)

        c.showPage()


# ══════════════════════════════════════════════════════════════
# HANDLER VERCEL
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

        # Défaut si config vide ou KV non configuré
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
