#!/usr/bin/env python3
"""Carnet de mission imprimable — 5 pages pour chaque agent."""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas

W, H = A4

BG      = HexColor('#020e04')
GREEN   = HexColor('#00ff41')
GREEN_D = HexColor('#006818')
GREEN_M = HexColor('#00cc35')
AMBER   = HexColor('#ffaa00')
RED     = HexColor('#cc0000')
WHITE   = HexColor('#ffffff')
GREY    = HexColor('#888888')
PAPER   = HexColor('#f5f0e8')
STAMP   = HexColor('#8b1a1a')

def _border(c, margin=1.0):
    c.setStrokeColor(GREEN_D)
    c.setLineWidth(1)
    c.rect(margin*cm, margin*cm, W-2*margin*cm, H-2*margin*cm)
    c.setStrokeColor(HexColor('#003a10'))
    c.setLineWidth(0.4)
    c.rect((margin+0.2)*cm, (margin+0.2)*cm, W-2*(margin+0.2)*cm, H-2*(margin+0.2)*cm)

def _bg(c, color=BG):
    c.setFillColor(color)
    c.rect(0, 0, W, H, fill=1, stroke=0)

def _stamp(c, x, y, text, angle=0):
    c.saveState()
    c.translate(x, y)
    c.rotate(angle)
    c.setFillColor(STAMP)
    c.setFont("Helvetica-Bold", 9)
    c.setStrokeColor(STAMP)
    c.setLineWidth(1.5)
    tw = c.stringWidth(text, "Helvetica-Bold", 9)
    pad = 0.3*cm
    c.rect(-tw/2-pad, -0.4*cm, tw+2*pad, 0.7*cm, fill=0, stroke=1)
    c.setFillColor(STAMP)
    c.drawCentredString(0, -0.15*cm, text)
    c.restoreState()

def _scanlines(c):
    c.setStrokeColor(HexColor('#001a06'))
    c.setLineWidth(0.3)
    for y in range(0, int(H), 6):
        c.line(0, y, W, y)

# ══════════════════════════════════════════════════════════
# PAGE 1 — Couverture
# ══════════════════════════════════════════════════════════
def page_cover(c):
    _bg(c)
    _scanlines(c)
    _border(c)

    # ASCII art étoile soviétique stylisée
    star = "★"
    c.setFillColor(RED)
    c.setFont("Helvetica-Bold", 80)
    c.drawCentredString(W/2, H - 5.5*cm, star)

    # Titre
    c.setFillColor(GREEN)
    c.setFont("Helvetica-Bold", 28)
    c.drawCentredString(W/2, H - 7.2*cm, "CARNET DE MISSION")
    c.setFont("Helvetica", 11)
    c.setFillColor(GREEN_D)
    c.drawCentredString(W/2, H - 7.9*cm, "— DOCUMENT CLASSIFIÉ —")

    # Ligne décorative
    c.setStrokeColor(GREEN_D)
    c.setLineWidth(1)
    c.line(2.5*cm, H - 8.4*cm, W - 2.5*cm, H - 8.4*cm)

    # Mission name placeholder
    c.setFillColor(GREEN_M)
    c.setFont("Helvetica-Bold", 18)
    c.drawCentredString(W/2, H - 9.5*cm, "MISSION  H É L I É 1 0")

    # Champ agent
    box_y = H - 13.5*cm
    c.setFillColor(HexColor('#001a06'))
    c.setStrokeColor(GREEN_D)
    c.roundRect(2.5*cm, box_y, W - 5*cm, 3.5*cm, 6, fill=1, stroke=1)
    c.setFillColor(GREEN_D)
    c.setFont("Helvetica", 8)
    c.drawString(3.0*cm, box_y + 2.9*cm, "NOM DE CODE :")
    c.setStrokeColor(GREEN_D)
    c.setLineWidth(0.5)
    c.line(3.0*cm, box_y + 2.3*cm, W - 3.0*cm, box_y + 2.3*cm)
    c.drawString(3.0*cm, box_y + 1.7*cm, "ÉQUIPE :")
    c.line(3.0*cm, box_y + 1.1*cm, W - 3.0*cm, box_y + 1.1*cm)
    c.drawString(3.0*cm, box_y + 0.5*cm, "N° D'AGENT :")
    c.line(5.8*cm, box_y - 0.1*cm, W - 3.0*cm, box_y - 0.1*cm)

    # Avertissement bas
    c.setFillColor(RED)
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(W/2, 3.2*cm, "⚠ CE DOCUMENT EST LA PROPRIÉTÉ EXCLUSIVE DU KGB ⚠")
    c.setFillColor(GREY)
    c.setFont("Helvetica", 7)
    c.drawCentredString(W/2, 2.6*cm, "Toute divulgation sera sanctionnée. À détruire après la mission.")

    _stamp(c, W/2, H - 16.5*cm, "CLASSIFIÉ", -8)
    _stamp(c, 5*cm, 5*cm, "KGB — USAGE INTERNE", 15)

    c.showPage()


# ══════════════════════════════════════════════════════════
# PAGE 2 — Fiche agent
# ══════════════════════════════════════════════════════════
def page_agent(c):
    _bg(c, PAPER)
    _border(c)

    # En-tête
    c.setFillColor(BG)
    c.rect(0, H - 2.8*cm, W, 2.8*cm, fill=1, stroke=0)
    c.setFillColor(GREEN)
    c.setFont("Helvetica-Bold", 14)
    c.drawCentredString(W/2, H - 1.6*cm, "⬛  FICHE AGENT — NIVEAU ALPHA")
    c.setFillColor(GREEN_D)
    c.setFont("Helvetica", 8)
    c.drawCentredString(W/2, H - 2.2*cm, "MISSION HÉLIÉ10 — À CONSERVER SUR SOI")

    # Photo
    ph_x, ph_y, ph_w, ph_h = 1.8*cm, H - 7.5*cm, 4*cm, 5*cm
    c.setFillColor(HexColor('#e0dbd0'))
    c.setStrokeColor(HexColor('#aaaaaa'))
    c.rect(ph_x, ph_y, ph_w, ph_h, fill=1, stroke=1)
    c.setFillColor(GREY)
    c.setFont("Helvetica", 8)
    c.drawCentredString(ph_x + ph_w/2, ph_y + ph_h/2 - 0.3*cm, "PHOTO")
    c.drawCentredString(ph_x + ph_w/2, ph_y + ph_h/2 - 0.7*cm, "OFFICIELLE")

    # Champs identité
    fx, fw = 7.0*cm, W - 8.5*cm
    fields = [
        ("NOM DE CODE",   H - 3.8*cm),
        ("PRÉNOM RÉEL",   H - 5.0*cm),
        ("ÉQUIPE",        H - 6.2*cm),
        ("SPÉCIALITÉ",    H - 7.4*cm),
    ]
    for label, fy in fields:
        c.setFillColor(HexColor('#333333'))
        c.setFont("Helvetica-Bold", 7)
        c.drawString(fx, fy, label + " :")
        c.setStrokeColor(HexColor('#888888'))
        c.setLineWidth(0.5)
        c.line(fx, fy - 0.55*cm, fx + fw, fy - 0.55*cm)

    # Grille de chiffres révélés
    grid_y = H - 9.2*cm
    c.setFillColor(HexColor('#333333'))
    c.setFont("Helvetica-Bold", 9)
    c.drawString(1.8*cm, grid_y, "CHIFFRES DU CODE DÉCOUVERTS :")
    for i in range(4):
        bx = 1.8*cm + i * 2.4*cm
        by = grid_y - 1.8*cm
        c.setFillColor(HexColor('#e8f5e9'))
        c.setStrokeColor(GREEN_D)
        c.setLineWidth(1)
        c.rect(bx, by, 1.8*cm, 1.6*cm, fill=1, stroke=1)
        c.setFillColor(GREY)
        c.setFont("Helvetica", 7)
        c.drawCentredString(bx + 0.9*cm, by + 0.15*cm, f"Épreuve {i+1}")

    # Serment
    oath_y = grid_y - 3.2*cm
    c.setFillColor(HexColor('#001a06'))
    c.setStrokeColor(GREEN_D)
    c.roundRect(1.8*cm, oath_y - 2.4*cm, W - 3.6*cm, 2.6*cm, 6, fill=1, stroke=1)
    c.setFillColor(GREEN)
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(W/2, oath_y - 0.4*cm, "SERMENT DE L'AGENT")
    c.setFillColor(GREEN_M)
    c.setFont("Helvetica-Oblique", 8.5)
    oath = [
        "Je jure de protéger mes camarades agents,",
        "de garder les codes secrets en toute circonstance",
        "et de ne jamais abandonner la mission.",
    ]
    for k, line in enumerate(oath):
        c.drawCentredString(W/2, oath_y - 1.0*cm - k*0.48*cm, line)

    # Signature
    sig_y = oath_y - 3.4*cm
    c.setFillColor(HexColor('#333333'))
    c.setFont("Helvetica", 8)
    c.drawString(1.8*cm, sig_y, "Signature de l'agent :")
    c.setStrokeColor(HexColor('#888888'))
    c.line(1.8*cm, sig_y - 0.9*cm, W/2 - 0.5*cm, sig_y - 0.9*cm)
    c.drawString(W/2 + 0.5*cm, sig_y, "Validé par :")
    c.line(W/2 + 0.5*cm, sig_y - 0.9*cm, W - 1.8*cm, sig_y - 0.9*cm)

    _stamp(c, W - 3.5*cm, H - 6.0*cm, "VALIDÉ", -12)
    c.showPage()


# ══════════════════════════════════════════════════════════
# PAGE 3 — Tableau de bord mission
# ══════════════════════════════════════════════════════════
def page_dashboard(c):
    _bg(c)
    _scanlines(c)
    _border(c)

    c.setFillColor(GREEN)
    c.setFont("Helvetica-Bold", 13)
    c.drawCentredString(W/2, H - 2.0*cm, "TABLEAU DE BORD — MISSION EN COURS")
    c.setStrokeColor(GREEN_D)
    c.line(1.5*cm, H - 2.4*cm, W - 1.5*cm, H - 2.4*cm)

    # 4 blocs épreuves
    labels = [
        ("ÉPREUVE 1", "La scène de crime",    "Lampe UV + scotch"),
        ("ÉPREUVE 2", "Le couloir laser",      "Fils de laine rouges"),
        ("ÉPREUVE 3", "L'agent de liaison",    "Message caché jardin"),
        ("ÉPREUVE 4", "Le poison",             "Sirops + fiche recette"),
    ]
    for i, (num, title, props) in enumerate(labels):
        row = i // 2
        col = i % 2
        bx = 1.5*cm + col * (W/2 - 0.5*cm)
        by = H - 3.5*cm - row * 6.2*cm
        bw = W/2 - 2.0*cm
        bh = 5.6*cm

        c.setFillColor(HexColor('#001a06'))
        c.setStrokeColor(GREEN_D)
        c.roundRect(bx, by - bh, bw, bh, 6, fill=1, stroke=1)

        c.setFillColor(GREEN_D)
        c.rect(bx, by - 1.1*cm, bw, 1.1*cm, fill=1, stroke=0)
        c.setFillColor(GREEN)
        c.setFont("Helvetica-Bold", 10)
        c.drawCentredString(bx + bw/2, by - 0.75*cm, num)

        c.setFillColor(GREEN_M)
        c.setFont("Helvetica-Bold", 9)
        c.drawCentredString(bx + bw/2, by - 1.8*cm, title)

        c.setFillColor(GREY)
        c.setFont("Helvetica", 7.5)
        c.drawCentredString(bx + bw/2, by - 2.4*cm, props)

        # Chiffre révélé
        c.setFillColor(HexColor('#002a0e'))
        c.setStrokeColor(GREEN_D)
        c.rect(bx + bw/2 - 0.8*cm, by - 4.4*cm, 1.6*cm, 1.5*cm, fill=1, stroke=1)
        c.setFillColor(GREEN_D)
        c.setFont("Helvetica", 7)
        c.drawCentredString(bx + bw/2, by - 4.55*cm, "Chiffre révélé")

        # Statut
        c.setFillColor(HexColor('#003a10'))
        c.roundRect(bx + 0.3*cm, by - bh + 0.3*cm, bw - 0.6*cm, 0.65*cm, 4, fill=1, stroke=0)
        c.setFillColor(GREY)
        c.setFont("Helvetica", 7)
        c.drawCentredString(bx + bw/2, by - bh + 0.55*cm, "☐ En attente   ☐ En cours   ☐ Validée")

    # PIN final
    pin_y = H - 16.5*cm
    c.setFillColor(HexColor('#001a06'))
    c.setStrokeColor(AMBER)
    c.setLineWidth(1.5)
    c.roundRect(1.5*cm, pin_y - 2.2*cm, W - 3*cm, 2.4*cm, 8, fill=1, stroke=1)
    c.setFillColor(AMBER)
    c.setFont("Helvetica-Bold", 11)
    c.drawCentredString(W/2, pin_y - 0.5*cm, "CODE DE DÉSARMEMENT")
    for i in range(4):
        bx = W/2 - 2*cm*2 + i*2.2*cm
        c.setFillColor(HexColor('#002a0e'))
        c.setStrokeColor(AMBER)
        c.setLineWidth(1)
        c.rect(bx, pin_y - 2.0*cm, 1.8*cm, 1.2*cm, fill=1, stroke=1)

    c.showPage()


# ══════════════════════════════════════════════════════════
# PAGE 4 — Notes de terrain
# ══════════════════════════════════════════════════════════
def page_notes(c):
    _bg(c, PAPER)
    _border(c)

    c.setFillColor(BG)
    c.rect(0, H - 2.8*cm, W, 2.8*cm, fill=1, stroke=0)
    c.setFillColor(GREEN)
    c.setFont("Helvetica-Bold", 13)
    c.drawCentredString(W/2, H - 1.6*cm, "NOTES DE TERRAIN")
    c.setFillColor(GREEN_D)
    c.setFont("Helvetica", 8)
    c.drawCentredString(W/2, H - 2.2*cm, "À remplir pendant la mission — observations, indices, suspects")

    # Lignes de notes
    line_color = HexColor('#ccccaa')
    c.setStrokeColor(line_color)
    c.setLineWidth(0.4)
    start_y = H - 3.5*cm
    for i in range(20):
        y = start_y - i * 0.95*cm
        c.line(1.8*cm, y, W - 1.8*cm, y)
        # Petits repères heure
        c.setFillColor(GREY)
        c.setFont("Helvetica", 6.5)
        c.drawString(1.8*cm, y + 0.12*cm, f"_h_m")

    # Section indices
    idx_y = H - 24.0*cm
    c.setFillColor(HexColor('#f0f5f0'))
    c.setStrokeColor(GREEN_D)
    c.roundRect(1.8*cm, idx_y - 3.0*cm, W - 3.6*cm, 3.2*cm, 6, fill=1, stroke=1)
    c.setFillColor(HexColor('#333333'))
    c.setFont("Helvetica-Bold", 9)
    c.drawString(2.3*cm, idx_y - 0.4*cm, "INDICES RASSEMBLÉS :")
    for i in range(4):
        y = idx_y - 0.9*cm - i * 0.6*cm
        c.setStrokeColor(HexColor('#aaaaaa'))
        c.setLineWidth(0.4)
        c.line(2.3*cm, y, W - 2.3*cm, y)

    c.showPage()


# ══════════════════════════════════════════════════════════
# PAGE 5 — Table de déchiffrement Vigenère simplifiée
# ══════════════════════════════════════════════════════════
def page_cipher(c):
    _bg(c)
    _scanlines(c)
    _border(c)

    c.setFillColor(GREEN)
    c.setFont("Helvetica-Bold", 13)
    c.drawCentredString(W/2, H - 2.0*cm, "TABLE DE DÉCHIFFREMENT")
    c.setFillColor(GREEN_D)
    c.setFont("Helvetica", 8)
    c.drawCentredString(W/2, H - 2.6*cm, "Alphabet de substitution — Clé : AGENT")

    # Substitution simple : décalage de 3 (Caesar)
    alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    coded = "DEFGHIJKLMNOPQRSTUVWXYZABC"

    # Tableau A→Codé
    cell_w = (W - 3.0*cm) / 13
    cell_h = 1.0*cm
    tx = 1.5*cm
    for half in range(2):
        row_y = H - 4.0*cm - half * 2.4*cm
        start = half * 13
        end   = start + 13
        for i, (a, cod) in enumerate(zip(alpha[start:end], coded[start:end])):
            cx = tx + i * cell_w
            # Fond alternés
            bg = HexColor('#001a06') if i % 2 == 0 else HexColor('#002a0e')
            c.setFillColor(bg)
            c.rect(cx, row_y - cell_h, cell_w, cell_h, fill=1, stroke=0)
            c.setStrokeColor(GREEN_D)
            c.setLineWidth(0.3)
            c.rect(cx, row_y - cell_h, cell_w, cell_h, fill=0, stroke=1)
            c.setFillColor(GREY)
            c.setFont("Helvetica", 7)
            c.drawCentredString(cx + cell_w/2, row_y - 0.28*cm, a)
            c.setFillColor(GREEN)
            c.setFont("Helvetica-Bold", 10)
            c.drawCentredString(cx + cell_w/2, row_y - 0.78*cm, cod)

    # Légende
    c.setFillColor(GREY)
    c.setFont("Helvetica-Oblique", 8)
    c.drawCentredString(W/2, H - 9.2*cm, "Ligne du haut = lettre dans le message · Ligne du bas = vraie lettre")

    # Alphabet morse compact
    morse_y = H - 10.5*cm
    c.setFillColor(GREEN)
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(W/2, morse_y, "— ALPHABET MORSE —")
    c.setStrokeColor(GREEN_D)
    c.line(1.5*cm, morse_y - 0.4*cm, W - 1.5*cm, morse_y - 0.4*cm)

    MORSE_REF = [
        ('A','·─'), ('B','─···'), ('C','─·─·'), ('D','─··'), ('E','·'), ('F','··─·'), ('G','──·'),
        ('H','····'), ('I','··'), ('J','·───'), ('K','─·─'), ('L','·─··'), ('M','──'), ('N','─·'),
        ('O','───'), ('P','·──·'), ('Q','──·─'), ('R','·─·'), ('S','···'), ('T','─'), ('U','··─'),
        ('V','···─'), ('W','·──'), ('X','─··─'), ('Y','─·──'), ('Z','──··'),
    ]
    cols = 7
    mw = (W - 3.0*cm) / cols
    for i, (letter, code) in enumerate(MORSE_REF):
        col = i % cols
        row = i // cols
        mx = 1.5*cm + col * mw
        my = morse_y - 0.9*cm - row * 0.9*cm
        c.setFillColor(GREEN_M)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(mx, my, letter)
        c.setFillColor(GREEN_D)
        c.setFont("Helvetica", 9)
        c.drawString(mx + 0.55*cm, my, code)

    # Chiffres morse
    MORSE_DIGITS = [('0','─────'),('1','·────'),('2','··───'),('3','···──'),('4','····─'),
                    ('5','·····'),('6','─····'),('7','──···'),('8','───··'),('9','────·')]
    dy = morse_y - 0.9*cm - 4 * 0.9*cm - 0.3*cm
    c.setStrokeColor(GREEN_D)
    c.setLineWidth(0.3)
    c.line(1.5*cm, dy + 0.15*cm, W - 1.5*cm, dy + 0.15*cm)
    mw2 = (W - 3.0*cm) / 5
    for i, (letter, code) in enumerate(MORSE_DIGITS):
        col = i % 5
        row = i // 5
        mx = 1.5*cm + col * mw2
        my = dy - 0.1*cm - row * 0.9*cm
        c.setFillColor(AMBER)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(mx, my, letter)
        c.setFillColor(HexColor('#886600'))
        c.setFont("Helvetica", 8)
        c.drawString(mx + 0.55*cm, my, code)

    _stamp(c, W/2, 3.0*cm, "KGB — NIVEAU ALPHA", 0)
    c.showPage()


# ── Main ──────────────────────────────────────────────────
out = "public/carnet-mission.pdf"
cv = canvas.Canvas(out, pagesize=A4)
cv.setTitle("Carnet de Mission — HÉLIÉ10")
cv.setAuthor("Mission Secrète")

page_cover(cv)
page_agent(cv)
page_dashboard(cv)
page_notes(cv)
page_cipher(cv)

cv.save()
print(f"✓ PDF généré : {out}")
