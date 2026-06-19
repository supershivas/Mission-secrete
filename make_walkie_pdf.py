#!/usr/bin/env python3
"""Génère le PDF de l'épreuve talkie-walkie — Opération ÉCHO (Carré de Polybe)."""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor

W, H = A4

# ── Palette ──────────────────────────────────────────────
BLACK     = HexColor('#0a0a0a')
GREEN     = HexColor('#006818')
GREEN_LT  = HexColor('#e6f4ea')
GREEN_BG  = HexColor('#001a06')
AMBER     = HexColor('#b35c00')
AMBER_LT  = HexColor('#fff3e0')
RED       = HexColor('#8b0000')
GREY      = HexColor('#555555')
BORDER    = HexColor('#cccccc')
WHITE     = colors.white

# ── Carré de Polybe ───────────────────────────────────────
GRID = [
    ['A','B','C','D','E'],
    ['F','G','H','I','J'],
    ['K','L','M','N','O'],
    ['P','Q','R','S','T'],
    ['U','V','W','X','Y/Z'],
]

# Code : SIGNAL → 44·24·22·34·11·32
CODE_WORD   = "SIGNAL"
PAIRS       = ["44", "24", "22", "34", "11", "32"]
DIGIT       = "?"   # chiffre révélé — à remplir selon la config

# ─────────────────────────────────────────────────────────
def header_band(c, y, color, label, sublabel):
    """Bandeau titre en haut de page."""
    c.setFillColor(color)
    c.rect(0, y, W, 2.2*cm, fill=1, stroke=0)
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 15)
    c.drawCentredString(W/2, y + 1.3*cm, label)
    c.setFont("Helvetica", 8)
    c.setFillColor(WHITE)
    c.drawCentredString(W/2, y + 0.55*cm, sublabel)

def footer(c, page_label):
    c.setFillColor(GREY)
    c.setFont("Helvetica", 7)
    c.drawCentredString(W/2, 0.7*cm, f"MISSION HÉLIÉ10 — OPÉRATION ÉCHO — {page_label}")

def warning_box(c, x, y, w, h, text, bg):
    c.setFillColor(bg)
    c.setStrokeColor(BORDER)
    c.roundRect(x, y, w, h, 6, fill=1, stroke=1)
    c.setFillColor(BLACK)
    c.setFont("Helvetica-BoldOblique", 9)
    # centre text vertically
    c.drawCentredString(x + w/2, y + h/2 - 3, text)

def draw_rule(c, x, y, w):
    c.setStrokeColor(BORDER)
    c.setLineWidth(0.5)
    c.line(x, y, x+w, y)

# ══════════════════════════════════════════════════════════
# PAGE 1 — Équipe OMBRE (grille de déchiffrement)
# ══════════════════════════════════════════════════════════
def page_ombre(c):
    c.setPageSize(A4)

    # Bandeau
    header_band(c, H - 2.4*cm, GREEN_BG,
                "⬛  ÉQUIPE OMBRE — GRILLE DE DÉCHIFFREMENT",
                "DOCUMENT CLASSIFIÉ — NE PAS MONTRER À L'ÉQUIPE COBRA")

    # Bloc consigne
    cx, cy = 1.5*cm, H - 4.0*cm
    c.setFillColor(GREEN_LT)
    c.setStrokeColor(GREEN)
    c.setLineWidth(1)
    c.roundRect(cx, cy - 2.2*cm, W - 3*cm, 2.2*cm, 8, fill=1, stroke=1)
    c.setFillColor(BLACK)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(cx + 0.4*cm, cy - 0.55*cm, "MISSION")
    c.setFont("Helvetica", 9)
    lines = [
        "L'équipe COBRA va vous lire des paires de chiffres via le talkie-walkie.",
        "Pour chaque paire, trouvez la lettre dans la grille ci-dessous :",
        "   → le 1er chiffre = la ligne (↓)   /   le 2ème chiffre = la colonne (→)",
        "Annoncez la lettre trouvée. COBRA note les lettres dans l'ordre.",
    ]
    for k, line in enumerate(lines):
        c.drawString(cx + 0.4*cm, cy - 1.0*cm - k*0.42*cm, line)

    # Grille de Polybe
    gx = W/2 - 5.5*cm   # origine X de la grille
    gy = H - 10.2*cm     # origine Y (haut de la grille)
    cell = 2.0*cm
    header_h = 1.0*cm

    # Titre grille
    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(BLACK)
    c.drawCentredString(W/2, gy + header_h + 0.3*cm, "— GRILLE SECRÈTE —")

    # En-têtes colonnes
    for col in range(5):
        c.setFillColor(GREEN_BG)
        c.rect(gx + header_h + col*cell, gy, cell, header_h, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 14)
        c.drawCentredString(gx + header_h + col*cell + cell/2, gy + 0.25*cm, str(col+1))

    # En-têtes lignes
    for row in range(5):
        c.setFillColor(GREEN_BG)
        c.rect(gx, gy - (row+1)*cell, header_h, cell, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 14)
        c.drawCentredString(gx + header_h/2, gy - (row+1)*cell + cell/2 - 0.2*cm, str(row+1))

    # Cellules
    for row in range(5):
        for col in range(5):
            rx = gx + header_h + col*cell
            ry = gy - (row+1)*cell
            # Fond alterné
            bg = HexColor('#f0faf3') if (row+col)%2==0 else WHITE
            c.setFillColor(bg)
            c.setStrokeColor(HexColor('#aaccb0'))
            c.setLineWidth(1)
            c.rect(rx, ry, cell, cell, fill=1, stroke=1)
            # Lettre
            c.setFillColor(GREEN_BG)
            c.setFont("Helvetica-Bold", 20)
            c.drawCentredString(rx + cell/2, ry + cell/2 - 0.3*cm, GRID[row][col])
            # Coordonnée en petit
            c.setFillColor(GREY)
            c.setFont("Helvetica", 7)
            c.drawString(rx + 0.1*cm, ry + 0.1*cm, f"{row+1}{col+1}")

    # Légende
    ly = gy - 5*cell - 0.7*cm
    c.setFillColor(GREY)
    c.setFont("Helvetica-Oblique", 8)
    c.drawCentredString(W/2, ly, "Exemple : « 43 » → ligne 4, colonne 3 → R")

    # Bloc exemple visuel
    ex_y = ly - 1.4*cm
    c.setFillColor(HexColor('#f5f5f5'))
    c.setStrokeColor(BORDER)
    c.roundRect(1.5*cm, ex_y - 0.9*cm, W - 3*cm, 1.1*cm, 6, fill=1, stroke=1)
    c.setFillColor(BLACK)
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(W/2, ex_y - 0.3*cm,
        "COBRA lit → « 4 … 3 »     OMBRE cherche ligne 4, colonne 3     OMBRE répond → « R »")

    # Zone réponse agents
    az_y = ex_y - 2.2*cm
    c.setFillColor(GREEN_LT)
    c.setStrokeColor(GREEN)
    c.roundRect(1.5*cm, az_y - 1.5*cm, W - 3*cm, 1.7*cm, 8, fill=1, stroke=1)
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(BLACK)
    c.drawString(2.0*cm, az_y + 0.0*cm, "📻  Gardez le talkie-walkie allumé et prêts à répondre !")
    c.setFont("Helvetica", 8)
    c.drawString(2.0*cm, az_y - 0.6*cm,
        "Annoncez chaque lettre clairement : « Alpha », « Sierra »... puis confirmez avec COBRA.")

    footer(c, "FICHE ÉQUIPE OMBRE")
    c.showPage()


# ══════════════════════════════════════════════════════════
# PAGE 2 — Équipe COBRA (message chiffré à transmettre)
# ══════════════════════════════════════════════════════════
def page_cobra(c):
    header_band(c, H - 2.4*cm, HexColor('#5c1700'),
                "🐍  ÉQUIPE COBRA — MESSAGE INTERCEPTÉ",
                "DOCUMENT CLASSIFIÉ — NE PAS MONTRER À L'ÉQUIPE OMBRE")

    # Consigne
    cx, cy = 1.5*cm, H - 4.0*cm
    c.setFillColor(AMBER_LT)
    c.setStrokeColor(AMBER)
    c.setLineWidth(1)
    c.roundRect(cx, cy - 2.4*cm, W - 3*cm, 2.4*cm, 8, fill=1, stroke=1)
    c.setFillColor(BLACK)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(cx + 0.4*cm, cy - 0.55*cm, "MISSION")
    c.setFont("Helvetica", 9)
    lines = [
        "Vous avez intercepté un message chiffré. L'équipe OMBRE possède la grille de déchiffrement.",
        "Via le talkie-walkie, lisez les paires de chiffres UNE PAR UNE, lentement et clairement.",
        "   → Attendez que OMBRE vous donne la lettre correspondante avant de passer à la suivante.",
        "Notez chaque lettre reçue dans les cases. Le mot formé = le code secret de l'épreuve.",
    ]
    for k, line in enumerate(lines):
        c.drawString(cx + 0.4*cm, cy - 1.05*cm - k*0.45*cm, line)

    # Titre message
    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(BLACK)
    c.drawCentredString(W/2, H - 7.3*cm, "— MESSAGE CHIFFRÉ INTERCEPTÉ —")
    c.setFont("Helvetica", 8)
    c.setFillColor(GREY)
    c.drawCentredString(W/2, H - 7.7*cm, "Lisez les paires dans l'ordre ↓ via talkie-walkie")

    # Paires de chiffres — grosses cases
    n = len(PAIRS)
    box_w = 3.0*cm
    box_h = 3.2*cm
    gap   = 0.55*cm
    total_w = n * box_w + (n-1) * gap
    start_x = (W - total_w) / 2
    start_y = H - 11.8*cm

    for i, pair in enumerate(PAIRS):
        bx = start_x + i * (box_w + gap)
        by = start_y

        # Numéro d'ordre
        c.setFillColor(GREY)
        c.setFont("Helvetica", 8)
        c.drawCentredString(bx + box_w/2, by + box_h + 0.15*cm, f"#{i+1}")

        # Boîte chiffres
        c.setFillColor(HexColor('#1a0a00'))
        c.setStrokeColor(AMBER)
        c.setLineWidth(1.5)
        c.roundRect(bx, by, box_w, box_h, 8, fill=1, stroke=1)
        c.setFillColor(HexColor('#ffcc80'))
        c.setFont("Helvetica-Bold", 32)
        c.drawCentredString(bx + box_w/2, by + box_h/2 + 0.2*cm, pair[0])
        c.drawCentredString(bx + box_w/2, by + box_h/2 - 0.95*cm, pair[1])
        c.setFillColor(HexColor('#664400'))
        c.setFont("Helvetica", 7)
        c.drawCentredString(bx + box_w/2, by + 0.15*cm, "ligne · colonne")

    # Flèches entre les boîtes
    arrow_y = start_y + box_h/2 - 0.1*cm
    for i in range(n-1):
        ax = start_x + (i+1)*(box_w + gap) - gap/2
        c.setFillColor(GREY)
        c.setFont("Helvetica", 10)
        c.drawCentredString(ax, arrow_y, "→")

    # Zone notation des lettres
    nz_y = start_y - 2.2*cm
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(BLACK)
    c.drawCentredString(W/2, nz_y + 0.3*cm, "Notez les lettres reçues :")

    letter_box_w = 1.6*cm
    letter_box_h = 1.6*cm
    total_lw = n * letter_box_w + (n-1) * 0.4*cm
    lx_start = (W - total_lw) / 2
    lz_y = nz_y - 1.8*cm

    for i in range(n):
        lx = lx_start + i * (letter_box_w + 0.4*cm)
        c.setFillColor(HexColor('#f9f9f9'))
        c.setStrokeColor(BLACK)
        c.setLineWidth(1)
        c.rect(lx, lz_y, letter_box_w, letter_box_h, fill=1, stroke=1)
        c.setFillColor(GREY)
        c.setFont("Helvetica", 7)
        c.drawCentredString(lx + letter_box_w/2, lz_y + letter_box_h + 0.1*cm, f"#{i+1}")

    # Ligne résultat
    rz_y = lz_y - 1.5*cm
    c.setFillColor(HexColor('#fff8e1'))
    c.setStrokeColor(AMBER)
    c.roundRect(1.5*cm, rz_y - 0.7*cm, W - 3*cm, 1.1*cm, 6, fill=1, stroke=1)
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(BLACK)
    c.drawString(2.0*cm, rz_y - 0.15*cm,
        "Le code secret  →  _ _ _ _ _ _       Entrez-le dans l'application !")

    # Bloc talkie tips
    tz_y = rz_y - 2.4*cm
    c.setFillColor(HexColor('#f0f0f0'))
    c.setStrokeColor(BORDER)
    c.roundRect(1.5*cm, tz_y - 2.2*cm, W - 3*cm, 2.4*cm, 8, fill=1, stroke=1)
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(BLACK)
    c.drawString(2.0*cm, tz_y - 0.0*cm, "📻  Protocole radio")
    c.setFont("Helvetica", 8.5)
    tips = [
        '• Dites « Chiffre un : [premier chiffre] — Chiffre deux : [deuxième chiffre] — À vous »',
        '• Attendez la confirmation de OMBRE avant de passer à la paire suivante',
        '• En cas d\'interférence : « Je répète — [paire] — À vous »',
    ]
    for k, tip in enumerate(tips):
        c.drawString(2.0*cm, tz_y - 0.55*cm - k*0.48*cm, tip)

    footer(c, "FICHE ÉQUIPE COBRA")
    c.showPage()


# ══════════════════════════════════════════════════════════
# PAGE 3 — Fiche organisateur
# ══════════════════════════════════════════════════════════
def page_orga(c):
    header_band(c, H - 2.4*cm, HexColor('#1a1a3e'),
                "🔐  FICHE ORGANISATEUR — OPÉRATION ÉCHO",
                "SOLUTION COMPLÈTE — NE PAS DISTRIBUER AUX ÉQUIPES")

    oy = H - 4.5*cm
    c.setFont("Helvetica-Bold", 13)
    c.setFillColor(BLACK)
    c.drawCentredString(W/2, oy, "SOLUTION DE L'ÉPREUVE")

    # Tableau solution
    cols = ["#", "Paire", "Grille", "Lettre"]
    col_x = [2.0*cm, 5.5*cm, 9.5*cm, 14.0*cm]
    row_h = 0.85*cm
    th_y  = oy - 1.8*cm

    # En-têtes tableau
    for i, (hd, x) in enumerate(zip(cols, col_x)):
        c.setFillColor(HexColor('#1a1a3e'))
        c.rect(x - 0.2*cm, th_y, 3.5*cm, 0.75*cm, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(x, th_y + 0.22*cm, hd)

    # Résolution lettre par lettre
    for i, (pair, letter) in enumerate(zip(PAIRS, CODE_WORD)):
        row_y = th_y - (i+1)*row_h
        bg = HexColor('#f7f7ff') if i%2==0 else WHITE
        c.setFillColor(bg)
        c.rect(1.8*cm, row_y, W - 3.6*cm, row_h, fill=1, stroke=0)
        row_i  = int(pair[0]) - 1
        col_i  = int(pair[1]) - 1
        grid_l = GRID[row_i][col_i]
        data = [f"{i+1}", f"« {pair[0]} · {pair[1]} »",
                f"ligne {pair[0]}, col. {pair[1]}  →  {grid_l}", letter]
        c.setFillColor(BLACK)
        for j, (val, x) in enumerate(zip(data, col_x)):
            c.setFont("Helvetica-Bold" if j==3 else "Helvetica", 9)
            c.drawString(x, row_y + 0.25*cm, val)

    sol_y = th_y - (len(PAIRS)+1)*row_h - 0.5*cm
    c.setFillColor(HexColor('#e8f5e9'))
    c.setStrokeColor(GREEN)
    c.setLineWidth(1.5)
    c.roundRect(1.5*cm, sol_y - 0.9*cm, W - 3*cm, 1.3*cm, 8, fill=1, stroke=1)
    c.setFont("Helvetica-Bold", 14)
    c.setFillColor(GREEN_BG)
    c.drawCentredString(W/2, sol_y - 0.35*cm, f"CODE SECRET :  {CODE_WORD}   →   chiffre révélé : {DIGIT}")

    # Notes mise en place
    nz_y = sol_y - 2.4*cm
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(BLACK)
    c.drawString(1.5*cm, nz_y, "MISE EN PLACE")
    draw_rule(c, 1.5*cm, nz_y - 0.3*cm, W - 3*cm)

    notes = [
        ("Équipes",     "OMBRE (jardin côté maison) ↔ COBRA (fond du jardin) — distance ~20 m"),
        ("Matériel",    "2 talkies-walkie · Fiche OMBRE · Fiche COBRA · un stylo par équipe"),
        ("Durée",       "Environ 5-8 minutes"),
        ("Difficulté",  "★★★☆☆ — Accessible dès 8 ans, coopération obligatoire"),
        ("Si blocage",  "Rappeler le protocole radio. Si talkie KO : autoriser les cris discrets 😄"),
        ("Config app",  f'Animation : 📡 Morse (ou aucune) · Code : {CODE_WORD} · Chiffre : {DIGIT}'),
    ]
    for k, (label, val) in enumerate(notes):
        ny = nz_y - 0.8*cm - k * 0.7*cm
        c.setFont("Helvetica-Bold", 8.5)
        c.setFillColor(HexColor('#1a1a3e'))
        c.drawString(1.5*cm, ny, f"{label} :")
        c.setFont("Helvetica", 8.5)
        c.setFillColor(BLACK)
        c.drawString(4.5*cm, ny, val)

    footer(c, "FICHE ORGANISATEUR — CONFIDENTIEL")
    c.showPage()


# ── Main ──────────────────────────────────────────────────
out = "public/operation-echo.pdf"
c = canvas.Canvas(out, pagesize=A4)
c.setTitle("Opération ÉCHO — Mission HÉLIÉ10")
c.setAuthor("Mission Secrète")

page_ombre(c)
page_cobra(c)
page_orga(c)

c.save()
print(f"✓ PDF généré : {out}")
