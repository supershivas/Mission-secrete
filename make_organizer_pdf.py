#!/usr/bin/env python3
"""Livret organisateur — vue complète de toutes les épreuves + checklist."""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas

W, H = A4

BG     = HexColor('#ffffff')
DARK   = HexColor('#1a1a2e')
BLUE   = HexColor('#16213e')
ACCENT = HexColor('#0f3460')
GREEN  = HexColor('#006818')
GREEN_LT = HexColor('#e8f5e9')
AMBER  = HexColor('#b35c00')
AMBER_LT = HexColor('#fff3e0')
RED    = HexColor('#8b0000')
RED_LT = HexColor('#fff0f0')
GREY   = HexColor('#666666')
LGREY  = HexColor('#f5f5f5')
BLACK  = HexColor('#111111')
WHITE  = HexColor('#ffffff')

CHALLENGES = [
    {
        "num": 1, "title": "La scène de crime", "code": "TRAHISON", "digit": "3",
        "animation": "skull", "duration": "8–12 min",
        "team": "Tous ensemble",
        "props": [
            "Scotch transparent (testé avec encre UV)",
            "Lampe UV / torche ultraviolet",
            "Message écrit à l'encre UV sur le scotch",
            "Contour de corps au sol (craie / scotch blanc)",
        ],
        "setup": [
            "Écrire 'TRAHISON' à l'encre UV sur un morceau de scotch.",
            "Coller le scotch sur une surface claire (carrelage, table).",
            "Tracer le contour d'un corps à proximité.",
            "Préparer la lampe UV — tester la lisibilité en amont.",
        ],
        "brief": "Un agent a été éliminé. Son corps est marqué au sol.\nExaminez la scène à la lampe UV. Un message invisible a été laissé sur le scotch.",
        "hint": "Le message est écrit directement sur le scotch. Éclairez de près avec la lampe UV en inclinant l'angle.",
        "color": HexColor('#1a0000'), "color_lt": RED_LT, "color_bd": RED,
    },
    {
        "num": 2, "title": "Le couloir laser", "code": "COBRA", "digit": "7",
        "animation": "laser", "duration": "6–10 min",
        "team": "Tous ensemble",
        "props": [
            "Fils de laine rouge (5–8 fils tendus en zigzag)",
            "Adhésif / pinces pour fixer les fils",
            "Enveloppe avec le code de l'autre côté",
            "Couloir ou encadrement de porte",
        ],
        "setup": [
            "Tendre les fils en zigzag dans le couloir (à différentes hauteurs).",
            "Fixer avec du scotch ou des pinces aux murs/portes.",
            "Placer l'enveloppe contenant 'COBRA' de l'autre côté.",
            "Tester que le passage est faisable (laisser des espaces).",
        ],
        "brief": "Un couloir est protégé par un système laser.\nTraversez sans déclencher l'alarme. Une enveloppe vous attend de l'autre côté.",
        "hint": "Commencez par observer tous les fils avant de bouger. Passez le plus grand d'abord, puis enjambez les autres.",
        "color": HexColor('#001a10'), "color_lt": GREEN_LT, "color_bd": GREEN,
    },
    {
        "num": 3, "title": "L'agent de liaison", "code": "JARDIN", "digit": "1",
        "animation": "garden", "duration": "5–8 min",
        "team": "Tous ensemble",
        "props": [
            "Message papier roulé avec le code 'JARDIN'",
            "Pot de fleur / cachette extérieure",
            "Optionnel : chiffre de substitution sur le message",
        ],
        "setup": [
            "Cacher le message 'JARDIN' dans un endroit du jardin.",
            "Rédiger un indice sur la cachette (sous le pot, derrière la haie…).",
            "Si chiffré : préparer la table de déchiffrement (carnet d'agent).",
        ],
        "brief": "Un contact vous attend dans le jardin.\nIl a caché un message quelque part dehors. Trouvez-le, déchiffrez-le.",
        "hint": "Le message est caché près d'un endroit où les agents se cachent naturellement. Regardez sous les pots.",
        "color": HexColor('#001a00'), "color_lt": HexColor('#f0faf0'), "color_bd": GREEN,
    },
    {
        "num": 4, "title": "Opération ÉCHO (talkie-walkie)", "code": "SIGNAL", "digit": "?",
        "animation": "morse (📡)", "duration": "8–12 min",
        "team": "2 équipes séparées",
        "props": [
            "2 talkies-walkie fonctionnels",
            "Fiche Équipe OMBRE (grille de Polybe — PDF séparé)",
            "Fiche Équipe COBRA (message chiffré — PDF séparé)",
            "Stylos pour noter",
        ],
        "setup": [
            "Imprimer les 2 fiches depuis operation-echo.pdf.",
            "Placer Équipe OMBRE à un bout du jardin, COBRA à l'autre.",
            "Distribuer les fiches — chaque équipe ne voit PAS celle de l'autre.",
            "Vérifier que les talkies fonctionnent avant de lancer.",
            "Code à saisir dans l'app : SIGNAL (animation : Morse).",
        ],
        "brief": "Deux équipes communiquent via talkie-walkie pour déchiffrer\nun message en code Polybe. Chaque équipe a la moitié des infos.",
        "hint": "Si blocage : rappeler le protocole — lire une paire à la fois, attendre confirmation.",
        "color": HexColor('#0a0a1a'), "color_lt": HexColor('#f0f0ff'), "color_bd": HexColor('#3333cc'),
    },
    {
        "num": 5, "title": "Le poison / antidote", "code": "ANTIDOTE", "digit": "9",
        "animation": "poison", "duration": "8–15 min",
        "team": "Tous ensemble",
        "props": [
            "3–5 sirops colorés (grenadine, menthe, citron…)",
            "Verres / gobelets transparents",
            "Fiche recette secrète (avec le code 'ANTIDOTE' en bas)",
            "Plateau de présentation",
        ],
        "setup": [
            "Préparer les sirops dans de petites fioles ou verres.",
            "Rédiger la fiche recette avec les mélanges à faire dans l'ordre.",
            "Écrire 'ANTIDOTE' au bas de la fiche recette.",
            "Optionnel : ajouter un élément dramatique (timer, fumée).",
        ],
        "brief": "L'ennemi a élaboré un poison. Vous devez créer l'antidote\nen mélangeant les ingrédients dans le bon ordre. La recette est dans votre sachet.",
        "hint": "Relisez bien la recette dans l'ordre. Le code de validation est écrit en bas de la fiche recette.",
        "color": HexColor('#1a0a00'), "color_lt": AMBER_LT, "color_bd": AMBER,
    },
]

PIN_DIGITS = [ch["digit"] for ch in CHALLENGES]
PIN_FINAL  = "".join(d for d in PIN_DIGITS if d != "?")


def _header(c, title, sub=""):
    c.setFillColor(DARK)
    c.rect(0, H - 2.6*cm, W, 2.6*cm, fill=1, stroke=0)
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 14)
    c.drawCentredString(W/2, H - 1.55*cm, title)
    if sub:
        c.setFont("Helvetica", 8)
        c.setFillColor(HexColor('#aaaaaa'))
        c.drawCentredString(W/2, H - 2.1*cm, sub)

def _footer(c, label):
    c.setFillColor(GREY)
    c.setFont("Helvetica", 7)
    c.drawCentredString(W/2, 0.7*cm, f"MISSION HÉLIÉ10 — LIVRET ORGANISATEUR — {label}")


# ══════════════════════════════════════════════════════════
# PAGE 1 — Couverture + vue d'ensemble
# ══════════════════════════════════════════════════════════
def page_cover(c):
    # Background
    c.setFillColor(DARK)
    c.rect(0, 0, W, H, fill=1, stroke=0)

    # Bande titre
    c.setFillColor(ACCENT)
    c.rect(0, H - 4*cm, W, 4*cm, fill=1, stroke=0)
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 22)
    c.drawCentredString(W/2, H - 1.8*cm, "LIVRET ORGANISATEUR")
    c.setFont("Helvetica", 11)
    c.setFillColor(HexColor('#aac8ff'))
    c.drawCentredString(W/2, H - 2.6*cm, "MISSION HÉLIÉ10 — DOCUMENT CONFIDENTIEL")
    c.setFont("Helvetica", 9)
    c.drawCentredString(W/2, H - 3.2*cm, "À NE PAS DISTRIBUER AUX ENFANTS")

    # Résumé épreuves
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 11)
    c.drawCentredString(W/2, H - 5.2*cm, "ORDRE DES ÉPREUVES")

    for i, ch in enumerate(CHALLENGES):
        ey = H - 6.3*cm - i * 1.85*cm
        # Numéro
        c.setFillColor(ch["color_bd"])
        c.circle(2.0*cm, ey + 0.4*cm, 0.5*cm, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 10)
        c.drawCentredString(2.0*cm, ey + 0.2*cm, str(ch["num"]))
        # Titre + infos
        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(3.0*cm, ey + 0.5*cm, ch["title"])
        c.setFont("Helvetica", 8)
        c.setFillColor(HexColor('#aaaaaa'))
        c.drawString(3.0*cm, ey + 0.0*cm, f"Code : {ch['code']}   ·   {ch['duration']}   ·   {ch['team']}")
        # Chiffre
        c.setFillColor(ch["color_bd"])
        c.setFont("Helvetica-Bold", 14)
        c.drawRightString(W - 2.0*cm, ey + 0.2*cm, ch["digit"])

    # PIN final
    pin_y = H - 6.3*cm - len(CHALLENGES) * 1.85*cm - 0.8*cm
    c.setFillColor(HexColor('#16213e'))
    c.roundRect(1.5*cm, pin_y - 1.5*cm, W - 3*cm, 2.0*cm, 8, fill=1, stroke=0)
    c.setStrokeColor(AMBER)
    c.setLineWidth(1.5)
    c.roundRect(1.5*cm, pin_y - 1.5*cm, W - 3*cm, 2.0*cm, 8, fill=0, stroke=1)
    c.setFillColor(AMBER)
    c.setFont("Helvetica-Bold", 12)
    c.drawCentredString(W/2, pin_y - 0.1*cm, f"PIN FINAL DE DÉSARMEMENT :  {PIN_FINAL}  (épreuves 1→{len(CHALLENGES)})")
    c.setFont("Helvetica", 8)
    c.setFillColor(HexColor('#886600'))
    c.drawCentredString(W/2, pin_y - 0.75*cm, "Concaténation des chiffres dans l'ordre des épreuves")

    # Checklist jour J
    chl_y = pin_y - 2.5*cm
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(1.5*cm, chl_y, "CHECKLIST JOUR J")
    c.setStrokeColor(HexColor('#444466'))
    c.line(1.5*cm, chl_y - 0.3*cm, W - 1.5*cm, chl_y - 0.3*cm)
    checks = [
        "☐  App configurée et testée sur l'iPad (admin007)",
        "☐  Talkies-walkie chargés et testés",
        "☐  Encre UV + lampe UV vérifiées (message lisible)",
        "☐  Fils de laine tendus dans le couloir",
        "☐  Message jardin caché",
        "☐  Sirops + fiche recette préparés",
        "☐  Fiches Équipe OMBRE et COBRA imprimées (operation-echo.pdf)",
        "☐  Carnets d'agents imprimés (1 par enfant)",
        "☐  iPad en mode avion + luminosité réglée",
    ]
    c.setFont("Helvetica", 8.5)
    for k, item in enumerate(checks):
        c.setFillColor(HexColor('#ccccdd'))
        c.drawString(1.8*cm, chl_y - 0.8*cm - k * 0.6*cm, item)

    _footer(c, "PAGE 1 / " + str(len(CHALLENGES) + 2))
    c.showPage()


# ══════════════════════════════════════════════════════════
# PAGE PAR ÉPREUVE
# ══════════════════════════════════════════════════════════
def page_challenge(c, ch, page_num, total):
    c.setFillColor(BG)
    c.rect(0, 0, W, H, fill=1, stroke=0)

    # Bandeau couleur épreuve
    c.setFillColor(ch["color"])
    c.rect(0, H - 3.0*cm, W, 3.0*cm, fill=1, stroke=0)
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(1.5*cm, H - 0.8*cm, f"ÉPREUVE {ch['num']} / {len(CHALLENGES)}")
    c.setFont("Helvetica-Bold", 17)
    c.drawCentredString(W/2, H - 1.75*cm, ch["title"].upper())
    c.setFont("Helvetica", 8.5)
    c.setFillColor(HexColor('#bbbbbb'))
    c.drawCentredString(W/2, H - 2.4*cm,
        f"Durée estimée : {ch['duration']}   ·   {ch['team']}   ·   Animation : {ch['animation']}")

    y = H - 3.5*cm

    def section(title, items, bg, bd, is_text=False):
        nonlocal y
        y -= 0.3*cm
        # Titre section
        c.setFillColor(bd)
        c.rect(1.5*cm, y - 0.65*cm, W - 3*cm, 0.65*cm, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(2.0*cm, y - 0.45*cm, title)
        y -= 0.65*cm

        # Contenu
        c.setFillColor(bg)
        if is_text:
            lines = items[0].split('\n')
            bh = len(lines) * 0.55*cm + 0.4*cm
            c.roundRect(1.5*cm, y - bh, W - 3*cm, bh, 0, fill=1, stroke=0)
            c.setFillColor(BLACK)
            c.setFont("Helvetica-Oblique", 9)
            for k, line in enumerate(lines):
                c.drawString(2.0*cm, y - 0.45*cm - k*0.55*cm, line)
            y -= bh
        else:
            bh = len(items) * 0.58*cm + 0.3*cm
            c.roundRect(1.5*cm, y - bh, W - 3*cm, bh, 0, fill=1, stroke=0)
            c.setFillColor(BLACK)
            for k, item in enumerate(items):
                c.setFont("Helvetica-Bold", 9)
                c.drawString(2.0*cm, y - 0.42*cm - k*0.58*cm, "▸")
                c.setFont("Helvetica", 9)
                c.drawString(2.5*cm, y - 0.42*cm - k*0.58*cm, item)
            y -= bh

    section("MATÉRIEL REQUIS", ch["props"], LGREY, ch["color_bd"])
    section("MISE EN PLACE", ch["setup"], ch["color_lt"], ch["color_bd"])
    section("TEXTE AFFICHÉ AUX ENFANTS", [ch["brief"]], HexColor('#f9f9f9'), GREY, is_text=True)
    section("INDICE (après 3 min de blocage)", [ch["hint"]], AMBER_LT, AMBER, is_text=True)

    # Bloc code + chiffre
    y -= 0.5*cm
    c.setFillColor(ch["color"])
    c.roundRect(1.5*cm, y - 2.0*cm, W - 3*cm, 2.2*cm, 8, fill=1, stroke=0)
    c.setStrokeColor(ch["color_bd"])
    c.setLineWidth(1.5)
    c.roundRect(1.5*cm, y - 2.0*cm, W - 3*cm, 2.2*cm, 8, fill=0, stroke=1)

    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(2.2*cm, y - 0.5*cm, "CODE À ENTRER DANS L'APP :")
    c.setFont("Helvetica-Bold", 22)
    c.setFillColor(ch["color_bd"])
    c.drawString(2.2*cm, y - 1.3*cm, ch["code"])
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 10)
    c.drawRightString(W - 2.2*cm, y - 0.5*cm, "CHIFFRE RÉVÉLÉ :")
    c.setFont("Helvetica-Bold", 28)
    c.drawRightString(W - 2.2*cm, y - 1.5*cm, ch["digit"])

    _footer(c, f"ÉPREUVE {ch['num']} — PAGE {page_num} / {total}")
    c.showPage()


# ══════════════════════════════════════════════════════════
# DERNIÈRE PAGE — Récap PIN + contacts
# ══════════════════════════════════════════════════════════
def page_recap(c, total):
    _header(c, "RÉCAPITULATIF — CODES & PIN", "À garder sur vous pendant la mission")

    y = H - 3.5*cm

    # Tableau codes
    c.setFillColor(DARK)
    c.rect(1.5*cm, y - 0.7*cm, W - 3*cm, 0.7*cm, fill=1, stroke=0)
    headers = ["#", "Épreuve", "Code", "Chiffre", "Animation"]
    col_x = [1.7*cm, 2.8*cm, 9.0*cm, 13.5*cm, 15.5*cm]
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 9)
    for hd, x in zip(headers, col_x):
        c.drawString(x, y - 0.47*cm, hd)
    y -= 0.7*cm

    for i, ch in enumerate(CHALLENGES):
        row_y = y - (i+1) * 0.85*cm
        bg = LGREY if i % 2 == 0 else WHITE
        c.setFillColor(bg)
        c.rect(1.5*cm, row_y, W - 3*cm, 0.85*cm, fill=1, stroke=0)
        c.setFillColor(ch["color_bd"])
        c.rect(1.5*cm, row_y, 0.9*cm, 0.85*cm, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 10)
        c.drawCentredString(1.95*cm, row_y + 0.3*cm, str(ch["num"]))
        data = [ch["title"], ch["code"], ch["digit"], ch["animation"]]
        c.setFillColor(BLACK)
        for val, x in zip(data, col_x[1:]):
            f = "Helvetica-Bold" if val == ch["code"] or val == ch["digit"] else "Helvetica"
            c.setFont(f, 9)
            c.drawString(x, row_y + 0.3*cm, str(val))

    # PIN final
    pin_y = y - (len(CHALLENGES) + 1) * 0.85*cm - 0.8*cm
    c.setFillColor(AMBER_LT)
    c.setStrokeColor(AMBER)
    c.setLineWidth(2)
    c.roundRect(1.5*cm, pin_y - 2.0*cm, W - 3*cm, 2.4*cm, 8, fill=1, stroke=1)
    c.setFillColor(AMBER)
    c.setFont("Helvetica-Bold", 13)
    c.drawCentredString(W/2, pin_y - 0.4*cm, f"PIN FINAL DE DÉSARMEMENT")
    c.setFont("Helvetica-Bold", 36)
    c.setFillColor(DARK)
    spaced_pin = "  ·  ".join(list(PIN_FINAL))
    c.drawCentredString(W/2, pin_y - 1.4*cm, spaced_pin)

    # Notes organisation
    nz_y = pin_y - 3.2*cm
    c.setFillColor(GREEN_LT)
    c.setStrokeColor(GREEN)
    c.setLineWidth(1)
    c.roundRect(1.5*cm, nz_y - 4.0*cm, W - 3*cm, 4.2*cm, 8, fill=1, stroke=1)
    c.setFillColor(GREEN)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(2.0*cm, nz_y - 0.4*cm, "NOTES ORGANISATEUR")
    c.setStrokeColor(HexColor('#aaccaa'))
    c.setLineWidth(0.4)
    for k in range(5):
        ny = nz_y - 1.0*cm - k * 0.65*cm
        c.line(2.0*cm, ny, W - 2.0*cm, ny)

    _footer(c, f"PAGE {total} / {total}")
    c.showPage()


# ── Main ──────────────────────────────────────────────────
total_pages = 1 + len(CHALLENGES) + 1
out = "public/livret-organisateur.pdf"
cv = canvas.Canvas(out, pagesize=A4)
cv.setTitle("Livret Organisateur — HÉLIÉ10")
cv.setAuthor("Mission Secrète")

page_cover(cv)
for i, ch in enumerate(CHALLENGES):
    page_challenge(cv, ch, i + 2, total_pages)
page_recap(cv, total_pages)

cv.save()
print(f"✓ PDF généré : {out}  ({total_pages} pages)")
