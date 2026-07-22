#!/usr/bin/env python3
"""Generate i18n/translations.js and patch index.html with data-i18n attributes."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / "index.html"
OUT = ROOT / "i18n" / "translations.js"

LANG_LABELS = {
    "en": "English",
    "es": "Español",
    "pt": "Português",
    "ht": "Kreyòl",
    "kea": "Kabuverdianu",
    "fr": "Français",
    "zh": "中文",
}


def slugify(text: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "_", text.strip().lower()).strip("_")
    return s or "item"


def js_str(s: str) -> str:
    return json.dumps(s, ensure_ascii=False)


def deep_clone(obj):
    if isinstance(obj, dict):
        return {k: deep_clone(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [deep_clone(x) for x in obj]
    return obj


# --- Machine translation helpers (concise travel-site translations) ---
def translate_dict(en: dict, lang: str) -> dict:
    """Apply language-specific overrides where defined; fallback to EN."""
    # Pre-built overrides for nav/common - full content uses EN fallback + key patches
    overrides: dict[str, dict] = {
        "es": {
            "nav": {
                "home": "Inicio",
                "destinations": "Destinos",
                "packages": "Paquetes",
                "faq": "Preguntas",
                "about": "Nosotros",
                "contact": "Contacto",
                "portal": "Portal del cliente",
                "bookNow": "Reservar",
            },
            "brand": {
                "name": "Martins Global Travels",
                "tagline": "Donde el lujo encuentra el mundo",
            },
            "a11y": {
                "langSwitcher": "Seleccionar idioma",
                "brandAlt": "Martins Global Travels — logo",
                "wcPopup": "Paquetes de viaje Copa del Mundo 2026",
                "close": "Cerrar",
            },
            "theme": {"appearance": "Apariencia", "light": "Claro", "darkMode": "Cambiar a modo oscuro"},
            "form": {
                "sendEnquiry": "Enviar consulta",
                "sending": "Enviando…",
                "success": "¡Consulta enviada! Jeanie se pondrá en contacto en 24 horas.",
                "error": "No se pudo enviar — llame al (508) 232-3003 o escriba a Jeanie@MartinsGlobalTravels.com.",
            },
            "toast": {
                "subscribed": "¡Suscripción confirmada! Bienvenido a bordo.",
                "blogSoon": "¡Blog próximamente!",
                "careersSoon": "¡Empleos próximamente!",
            },
            "common": {
                "enquire": "Consultar",
                "explore": "Explorar",
                "scrollExplore": "Desplácese para explorar",
                "scrollMore": "Desplácese para ver más",
                "allDestinations": "Todos los destinos",
                "viewAllDestinations": "Ver todos los destinos",
                "enquireNow": "Consultar ahora",
                "contactUs": "Contáctenos",
                "planMyTrip": "Planificar mi viaje",
                "subscribe": "Suscribirse",
                "privacy": "Privacidad",
                "terms": "Términos",
                "cookies": "Cookies",
            },
            "footer": {
                "quote": '"El mundo es un libro, y quien no viaja lee solo una página."',
                "destinations": "Destinos",
                "packages": "Paquetes",
                "company": "Empresa",
                "contact": "Contacto",
                "aboutUs": "Sobre nosotros",
                "ourTeam": "Nuestro equipo",
                "travelBlog": "Blog de viajes",
                "careers": "Empleos",
                "licensed": "Agencia de viajes con licencia en EE. UU.",
                "copyright": "© 2026 Martins Global Travels. Todos los derechos reservados.",
                "noSpam": "Sin spam. Cancele cuando quiera.",
            },
            "wc": {
                "continue": "Seguir navegando",
                "book": "Reservar su experiencia",
            },
            "home": {
                "heroLine1": "Los destinos más",
                "heroLine2": "extraordinarios",
                "heroLine3": "del mundo",
                "heroDesc": "Viajes a medida diseñados enteramente para usted — desde villas sobre el agua hasta safaris salvajes y todo lo intermedio.",
                "exploreDestinations": "Explorar destinos",
                "viewPackages": "Ver paquetes",
                "statDestinations": "Destinos",
                "statContinents": "Continentes",
                "topDestinations": "Destinos destacados",
                "whereNext": "¿Adónde irá",
                "whereNextEm": "después?",
                "signatureFoot": "Nuestros cinco países emblemáticos — seleccionados para viajes a medida en todo el mundo.",
                "aboutTag": "Sobre Martins Global Travels",
                "aboutTitle": "Una agencia de viajes hecha",
                "aboutTitleEm": "para usted",
                "aboutBody": "Martins Global Travels nació de una creencia: cada viajero merece un viaje diseñado enteramente para él. Nuestros especialistas exploran personalmente cada destino que recomiendan. Sin plantillas, sin suposiciones.",
                "pill1": "120+ destinos",
                "pill2": "6 continentes",
                "pill3": "Soporte 24/7",
                "pill4": "100% a medida",
                "ourStory": "Nuestra historia",
                "featuredJourneys": "Viajes destacados",
                "curatedItineraries": "Nuestros itinerarios",
                "curatedEm": "curados",
                "allPackages": "Todos los paquetes",
                "whyTag": "Por qué Martins Global Travels",
                "whyTitle": "Viajes hechos",
                "whyEm": "de otra manera",
                "whyLead": "Nos encargamos de cada detalle para que usted se concentre solo en la experiencia.",
                "readyTag": "¿Listo para viajar?",
                "readyTitle": "Su viaje soñado",
                "readyEm": "empieza aquí",
                "readyBody": "Díganos adónde quiere ir. Nuestros especialistas diseñarán cada detalle — usted solo tiene que presentarse.",
                "nlTag": "Manténgase inspirado",
                "nlTitle": "Sea el primero en",
                "nlEm": "descubrir",
                "nlTitle2": "nuestras ofertas exclusivas",
                "nlBody": "Ofertas exclusivas, guías de destinos e inspiración de nuestros especialistas.",
            },
        },
        "pt": {
            "nav": {
                "home": "Início",
                "destinations": "Destinos",
                "packages": "Pacotes",
                "faq": "FAQ",
                "about": "Sobre",
                "contact": "Contacto",
                "portal": "Portal do cliente",
                "bookNow": "Reservar",
            },
            "brand": {"name": "Martins Global Travels", "tagline": "Onde o luxo encontra o mundo"},
            "a11y": {"langSwitcher": "Selecionar idioma", "brandAlt": "Martins Global Travels — logótipo", "wcPopup": "Pacotes de viagem Copa do Mundo 2026", "close": "Fechar"},
            "theme": {"appearance": "Aparência", "light": "Claro", "darkMode": "Mudar para modo escuro"},
            "form": {
                "sendEnquiry": "Enviar pedido",
                "sending": "A enviar…",
                "success": "Pedido enviado! A Jeanie entrará em contacto em 24 horas.",
                "error": "Não foi possível enviar — ligue (508) 232-3003 ou escreva para Jeanie@MartinsGlobalTravels.com.",
            },
            "toast": {"subscribed": "Subscrito! Bem-vindo a bordo.", "blogSoon": "Blog em breve!", "careersSoon": "Carreiras em breve!"},
            "common": {
                "enquire": "Consultar",
                "explore": "Explorar",
                "scrollExplore": "Deslize para explorar",
                "scrollMore": "Deslize para ver mais",
                "allDestinations": "Todos os destinos",
                "viewAllDestinations": "Ver todos os destinos",
                "enquireNow": "Consultar agora",
                "contactUs": "Contacte-nos",
                "planMyTrip": "Planear a minha viagem",
                "subscribe": "Subscrever",
                "privacy": "Privacidade",
                "terms": "Termos",
                "cookies": "Cookies",
            },
            "footer": {
                "quote": '"O mundo é um livro, e quem não viaja lê apenas uma página."',
                "destinations": "Destinos",
                "packages": "Pacotes",
                "company": "Empresa",
                "contact": "Contacto",
                "aboutUs": "Sobre nós",
                "ourTeam": "A nossa equipa",
                "travelBlog": "Blog de viagens",
                "careers": "Carreiras",
                "licensed": "Agência de viagens licenciada nos EUA",
                "copyright": "© 2026 Martins Global Travels. Todos os direitos reservados.",
                "noSpam": "Sem spam. Cancele quando quiser.",
            },
            "wc": {"continue": "Continuar a navegar", "book": "Reservar a sua experiência"},
        },
        "fr": {
            "nav": {
                "home": "Accueil",
                "destinations": "Destinations",
                "packages": "Forfaits",
                "faq": "FAQ",
                "about": "À propos",
                "contact": "Contact",
                "portal": "Portail client",
                "bookNow": "Réserver",
            },
            "brand": {"name": "Martins Global Travels", "tagline": "Là où le luxe rencontre le monde"},
            "a11y": {"langSwitcher": "Choisir la langue", "brandAlt": "Martins Global Travels — logo", "wcPopup": "Forfaits voyage Coupe du Monde 2026", "close": "Fermer"},
            "theme": {"appearance": "Apparence", "light": "Clair", "darkMode": "Passer en mode sombre"},
            "form": {
                "sendEnquiry": "Envoyer la demande",
                "sending": "Envoi…",
                "success": "Demande envoyée ! Jeanie vous contactera sous 24 h.",
                "error": "Envoi impossible — appelez le (508) 232-3003 ou écrivez à Jeanie@MartinsGlobalTravels.com.",
            },
            "toast": {"subscribed": "Inscription confirmée ! Bienvenue.", "blogSoon": "Blog bientôt !", "careersSoon": "Carrières bientôt !"},
            "common": {
                "enquire": "Demander",
                "explore": "Explorer",
                "scrollExplore": "Faites défiler pour explorer",
                "scrollMore": "Faites défiler pour voir plus",
                "allDestinations": "Toutes les destinations",
                "viewAllDestinations": "Voir toutes les destinations",
                "enquireNow": "Demander maintenant",
                "contactUs": "Contactez-nous",
                "planMyTrip": "Planifier mon voyage",
                "subscribe": "S'abonner",
                "privacy": "Confidentialité",
                "terms": "Conditions",
                "cookies": "Cookies",
            },
            "footer": {
                "quote": "« Le monde est un livre, et ceux qui ne voyagent pas n'en lisent qu'une page. »",
                "destinations": "Destinations",
                "packages": "Forfaits",
                "company": "Entreprise",
                "contact": "Contact",
                "aboutUs": "À propos",
                "ourTeam": "Notre équipe",
                "travelBlog": "Blog voyage",
                "careers": "Carrières",
                "licensed": "Agence de voyage agréée aux États-Unis",
                "copyright": "© 2026 Martins Global Travels. Tous droits réservés.",
                "noSpam": "Pas de spam. Désabonnement à tout moment.",
            },
            "wc": {"continue": "Continuer la navigation", "book": "Réserver votre expérience"},
        },
        "ht": {
            "nav": {
                "home": "Akèy",
                "destinations": "Destinasyon",
                "packages": "Pakè",
                "faq": "Kesyon",
                "about": "Sou nou",
                "contact": "Kontak",
                "portal": "Pòtal kliyan",
                "bookNow": "Rezève",
            },
            "brand": {"name": "Martins Global Travels", "tagline": "Kote liks ak mond lan rankontre"},
            "a11y": {"langSwitcher": "Chwazi lang", "brandAlt": "Martins Global Travels — logo", "wcPopup": "Pakè vwayaj Kou Mondyal 2026", "close": "Fèmen"},
            "theme": {"appearance": "Aparans", "light": "Klè", "darkMode": "Chanje an mòd fè nwa"},
            "form": {
                "sendEnquiry": "Voye demann",
                "sending": "Ap voye…",
                "success": "Demann voye! Jeanie ap kontakte ou nan 24 èdtan.",
                "error": "Pa t kapab voye — rele (508) 232-3003 oswa imèl Jeanie@MartinsGlobalTravels.com.",
            },
            "toast": {"subscribed": "Abònman konfime! Byenveni.", "blogSoon": "Blog ap vini!", "careersSoon": "Travay ap vini!"},
            "common": {
                "enquire": "Mande",
                "explore": "Eksplore",
                "scrollExplore": "Woule pou eksplore",
                "scrollMore": "Woule pou wè plis",
                "allDestinations": "Tout destinasyon",
                "viewAllDestinations": "Gade tout destinasyon",
                "enquireNow": "Mande kounye a",
                "contactUs": "Kontakte nou",
                "planMyTrip": "Planifye vwayaj mwen",
                "subscribe": "Abòne",
                "privacy": "Konfidansyalite",
                "terms": "Kondisyon",
                "cookies": "Cookies",
            },
            "footer": {
                "quote": '"Mond lan se yon liv, e moun ki pa vwayaje li li yon sèl paj."',
                "destinations": "Destinasyon",
                "packages": "Pakè",
                "company": "Konpayi",
                "contact": "Kontak",
                "aboutUs": "Sou nou",
                "ourTeam": "Ekip nou",
                "travelBlog": "Blog vwayaj",
                "careers": "Travay",
                "licensed": "Ajans vwayaj licansye Ozetazini",
                "copyright": "© 2026 Martins Global Travels. Tout dwa rezève.",
                "noSpam": "Pa gen spam. Ou ka dezabòne nenpòt lè.",
            },
            "wc": {"continue": "Kontinye navige", "book": "Rezève eksperyans ou"},
        },
        "kea": {
            "nav": {
                "home": "Kasa",
                "destinations": "Destinu",
                "packages": "Pakoti",
                "faq": "Pergunta",
                "about": "Sobre nós",
                "contact": "Kontaktu",
                "portal": "Portal di klienti",
                "bookNow": "Reserva",
            },
            "brand": {"name": "Martins Global Travels", "tagline": "Undi luxu i mundu ta junta"},
            "a11y": {"langSwitcher": "Skôli língua", "brandAlt": "Martins Global Travels — logo", "wcPopup": "Pakoti di viji Copa di Mundu 2026", "close": "Fecha"},
            "theme": {"appearance": "Aparénsia", "light": "Klaru", "darkMode": "Muda pa modu skuru"},
            "form": {
                "sendEnquiry": "Manda pedidu",
                "sending": "Ta manda…",
                "success": "Pedidu mandadu! Jeanie ta kontata-bu dentu di 24 ora.",
                "error": "Nun podi manda — xama (508) 232-3003 o manda email pa Jeanie@MartinsGlobalTravels.com.",
            },
            "toast": {"subscribed": "Subskritu! Bon bini.", "blogSoon": "Blog ta bin!", "careersSoon": "Trabalhu ta bin!"},
            "common": {
                "enquire": "Pergunta",
                "explore": "Explora",
                "scrollExplore": "Rola pa explora",
                "scrollMore": "Rola pa odja más",
                "allDestinations": "Tudu destinu",
                "viewAllDestinations": "Odja tudu destinu",
                "enquireNow": "Pergunta agora",
                "contactUs": "Kontata-nu",
                "planMyTrip": "Planifica nha viji",
                "subscribe": "Subskreve",
                "privacy": "Privasidadi",
                "terms": "Termu",
                "cookies": "Cookies",
            },
            "footer": {
                "quote": '"Mundu é un livru, i ken ka viaja li li un pájina."',
                "destinations": "Destinu",
                "packages": "Pakoti",
                "company": "Empresa",
                "contact": "Kontaktu",
                "aboutUs": "Sobre nós",
                "ourTeam": "Nós ekipi",
                "travelBlog": "Blog di viji",
                "careers": "Trabalhu",
                "licensed": "Ajénsia di viji lixensiadu na EUA",
                "copyright": "© 2026 Martins Global Travels. Tudu direitu reservadu.",
                "noSpam": "Sin spam. Podes kansela kuandu ker.",
            },
            "wc": {"continue": "Kontinua navega", "book": "Reserva nha esperiénsia"},
        },
        "zh": {
            "nav": {
                "home": "首页",
                "destinations": "目的地",
                "packages": "套餐",
                "faq": "常见问题",
                "about": "关于我们",
                "contact": "联系我们",
                "portal": "客户门户",
                "bookNow": "立即预订",
            },
            "brand": {"name": "Martins Global Travels", "tagline": "奢华与世界相遇"},
            "a11y": {"langSwitcher": "选择语言", "brandAlt": "Martins Global Travels — 标志", "wcPopup": "2026世界杯旅行套餐", "close": "关闭"},
            "theme": {"appearance": "外观", "light": "浅色", "darkMode": "切换到深色模式"},
            "form": {
                "sendEnquiry": "发送咨询",
                "sending": "发送中…",
                "success": "咨询已发送！Jeanie将在24小时内与您联系。",
                "error": "无法发送 — 请致电 (508) 232-3003 或发送邮件至 Jeanie@MartinsGlobalTravels.com。",
            },
            "toast": {"subscribed": "订阅成功！欢迎加入。", "blogSoon": "博客即将上线！", "careersSoon": "招聘即将上线！"},
            "common": {
                "enquire": "咨询",
                "explore": "探索",
                "scrollExplore": "向下滚动探索",
                "scrollMore": "滑动查看更多",
                "allDestinations": "所有目的地",
                "viewAllDestinations": "查看所有目的地",
                "enquireNow": "立即咨询",
                "contactUs": "联系我们",
                "planMyTrip": "规划我的行程",
                "subscribe": "订阅",
                "privacy": "隐私",
                "terms": "条款",
                "cookies": "Cookie",
            },
            "footer": {
                "quote": "「世界是一本书，不旅行的人只读了一页。」",
                "destinations": "目的地",
                "packages": "套餐",
                "company": "公司",
                "contact": "联系",
                "aboutUs": "关于我们",
                "ourTeam": "我们的团队",
                "travelBlog": "旅行博客",
                "careers": "招聘",
                "licensed": "美国持证旅行社",
                "copyright": "© 2026 Martins Global Travels. 保留所有权利。",
                "noSpam": "绝无垃圾邮件。随时取消订阅。",
            },
            "wc": {"continue": "继续浏览", "book": "预订您的体验"},
        },
    }

    def merge(base, patch):
        out = deep_clone(base)
        for k, v in patch.items():
            if isinstance(v, dict) and isinstance(out.get(k), dict):
                out[k] = merge(out[k], v)
            else:
                out[k] = v
        return out

    if lang == "en":
        return en
    patch = overrides.get(lang, {})
    return merge(en, patch)


def build_en() -> dict:
    html = INDEX.read_text(encoding="utf-8")
    cards = re.findall(
        r'<div class="dpc"[^>]*>.*?<div class="dpc-region">([^<]+)</div>\s*<div class="dpc-name">([^<]+)</div>',
        html,
        re.S,
    )
    dest_cards = {}
    for region, name in cards:
        key = slugify(name)
        dest_cards[key] = {"region": region.strip(), "name": name.strip()}

    en = {
        "meta": {"title": "Martins Global Travels"},
        "nav": {
            "home": "Home",
            "destinations": "Destinations",
            "packages": "Packages",
            "faq": "FAQ",
            "about": "About",
            "contact": "Contact",
            "portal": "Client Portal",
            "bookNow": "Book Now",
        },
        "brand": {
            "name": "Martins Global Travels",
            "tagline": "Where luxury meets the world",
        },
        "a11y": {
            "langSwitcher": "Select language",
            "brandAlt": "Martins Global Travels — gold seal logo with MGT monogram and globe",
            "wcPopup": "World Cup 2026 travel packages",
            "close": "Close",
        },
        "theme": {
            "appearance": "Appearance",
            "light": "Light",
            "darkMode": "Switch to dark mode",
        },
        "form": {
            "sendEnquiry": "Send Enquiry",
            "sending": "Sending…",
            "success": "Enquiry sent! Jeanie will be in touch within 24 hours.",
            "error": "Could not send — please call (508) 232-3003 or email Jeanie@MartinsGlobalTravels.com.",
            "title": "Send an Enquiry",
            "subtitle": "Fill out the form and Jeanie will respond within 24 hours.",
            "firstName": "First Name",
            "lastName": "Last Name",
            "email": "Email",
            "phone": "Phone",
            "destination": "Destination",
            "package": "Package",
            "departureDate": "Departure Date",
            "travelers": "Travelers",
            "message": "Tell Us About Your Dream Trip",
            "messagePlaceholder": "Share any special requests, interests, or must-have experiences...",
            "selectRegion": "Select region...",
            "selectPackage": "Select package...",
            "note": "Your information is secure and will never be shared with third parties.",
            "placeholderFirst": "John",
            "placeholderLast": "Smith",
            "placeholderEmail": "john@email.com",
            "placeholderPhone": "(508) 555-1234",
        },
        "toast": {
            "subscribed": "Subscribed! Welcome aboard.",
            "blogSoon": "Blog coming soon!",
            "careersSoon": "Careers coming soon!",
        },
        "common": {
            "enquire": "Enquire",
            "explore": "Explore",
            "scrollExplore": "Scroll to explore",
            "scrollMore": "Scroll to see more",
            "allDestinations": "All Destinations",
            "viewAllDestinations": "View all destinations",
            "enquireNow": "Enquire Now",
            "contactUs": "Contact Us",
            "planMyTrip": "Plan My Trip",
            "subscribe": "Subscribe",
            "privacy": "Privacy",
            "terms": "Terms",
            "cookies": "Cookies",
            "days": "Days",
            "showingAll": "Showing all {n} destinations",
            "showingCat": "Showing {n} {cat} destination",
            "showingCats": "Showing {n} {cat} destinations",
        },
        "footer": {
            "quote": '"The world is a book, and those who do not travel read only one page."',
            "destinations": "Destinations",
            "packages": "Packages",
            "company": "Company",
            "contact": "Contact",
            "aboutUs": "About Us",
            "ourTeam": "Our Team",
            "travelBlog": "Travel Blog",
            "careers": "Careers",
            "licensed": "Licensed US Travel Agency",
            "copyright": "© 2026 Martins Global Travels. All Rights Reserved.",
            "noSpam": "No spam, ever. Unsubscribe any time.",
            "maldives": "Maldives",
            "africaSafaris": "Africa Safaris",
            "japanAsia": "Japan & Asia",
            "europe": "Europe",
            "caribbean": "Caribbean",
            "southAmerica": "South America",
            "honeymoons": "Honeymoons",
            "familyHolidays": "Family Holidays",
            "adventureTours": "Adventure Tours",
            "luxuryEscapes": "Luxury Escapes",
            "cruises": "Cruises",
        },
        "wc": {
            "continue": "Continue browsing",
            "book": "Book your experience",
            "imgAlt": "World Cup 2026 travel packages — flights, hotels, transportation, and ticket assistance from Martins Global Travels.",
        },
        "home": {
            "heroLine1": "The World's",
            "heroLine2": "Most Extraordinary",
            "heroLine2html": "Most <em>Extraordinary</em>",
            "heroLine3": "Destinations",
            "heroDesc": "Tailor-made journeys crafted entirely around you — from overwater villas to safari wilderness and everything between.",
            "exploreDestinations": "Explore Destinations",
            "viewPackages": "View Packages",
            "statDestinations": "Destinations",
            "statContinents": "Continents",
            "topDestinations": "Top Destinations",
            "whereNext": "Where Will You",
            "whereNextEm": "Go Next?",
            "whereNextHtml": "Where Will You<br><em>Go Next?</em>",
            "signatureFoot": "Our five signature countries — hand-picked for bespoke journeys worldwide.",
            "aboutTag": "About Martins Global Travels",
            "aboutTitle": "A Travel Agency Built",
            "aboutTitleEm": "Around You",
            "aboutTitleHtml": "A Travel Agency Built<br>Around <em>You</em>",
            "aboutBody": "Martins Global Travels was built on one belief — every traveler deserves a journey crafted entirely around them. Our specialists personally explore every destination they recommend. No templates, no guesswork.",
            "pill1": "120+ Destinations",
            "pill2": "6 Continents",
            "pill3": "24/7 Support",
            "pill4": "100% Tailored",
            "ourStory": "Our Story",
            "featuredJourneys": "Featured Journeys",
            "curatedItineraries": "Our Curated",
            "curatedEm": "Itineraries",
            "curatedHtml": "Our Curated <em>Itineraries</em>",
            "allPackages": "All packages",
            "whyTag": "Why Martins Global Travels",
            "whyTitle": "Travel Built",
            "whyEm": "Differently",
            "whyTitleHtml": "Travel Built <em>Differently</em>",
            "whyLead": "We handle every detail so you can focus entirely on the experience.",
            "readyTag": "Ready to Travel?",
            "readyTitle": "Your Dream Trip",
            "readyEm": "Starts Here",
            "readyTitleHtml": "Your Dream Trip<br><em>Starts Here</em>",
            "readyBody": "Tell us where you want to go. Our specialists will craft every detail of your perfect journey — all you have to do is show up.",
            "nlTag": "Stay Inspired",
            "nlTitle": "Be First to",
            "nlEm": "Discover",
            "nlTitle2": "Our Exclusive Deals",
            "nlTitleHtml": "Be First to <em>Discover</em><br>Our Exclusive Deals",
            "nlBody": "Exclusive offers, destination guides, and travel inspiration from our specialists.",
            "nlPlaceholder": "Your email address...",
            "why1t": "Personally Curated",
            "why1d": "Every hotel, guide, and experience is personally vetted. We only recommend places our team has been to themselves.",
            "why2t": "Fully Protected",
            "why2d": "Your trip investment is fully secured. We work only with trusted, vetted suppliers and carry full travel agent liability insurance.",
            "why3t": "Global Network",
            "why3d": "A carefully curated network of trusted local experts across every destination we offer, giving you access to experiences unavailable anywhere else.",
            "why4t": "24/7 Support",
            "why4d": "Round-the-clock concierge service. Wherever you are in the world, our team is always just a call away.",
            "tdItalyRegion": "Europe",
            "tdItalyTitle": "Italy",
            "tdItalyDesc": "From Venetian canals to Tuscan hills — art, cuisine, and la dolce vita tailored to your pace.",
            "tdItalyBtn": "Explore Italy",
            "tdChinaRegion": "East Asia",
            "tdChinaTitle": "China",
            "tdChinaDesc": "Ancient wonders and ultramodern cities — private guides unlock history, flavor, and spectacle.",
            "tdChinaBtn": "Explore China",
            "tdPortugalRegion": "Europe",
            "tdPortugalTitle": "Portugal",
            "tdPortugalDesc": "Atlantic light, azulejo tiles, and soulful Fado — Lisbon, Porto, and the Algarve on your terms.",
            "tdPortugalBtn": "Explore Portugal",
            "tdSpainRegion": "Europe",
            "tdSpainTitle": "Spain",
            "tdSpainDesc": "Moorish palaces, Gaudí's Barcelona, and sun-soaked coasts — rhythm, tapas, and pure passion.",
            "tdSpainBtn": "Explore Spain",
            "tdSaRegion": "Africa",
            "tdSaTitle": "South Africa",
            "tdSaDesc": "Cape elegance meets Big Five safari — wine routes, dramatic coast, and unforgettable wildlife.",
            "tdSaBtn": "Explore South Africa",
            "mqItaly": "Italy",
            "mqChina": "China",
            "mqPortugal": "Portugal",
            "mqSpain": "Spain",
            "mqSa": "South Africa",
            "tour1Cat": "Beach & Luxury",
            "tour1Days": "10 Days",
            "tour1Loc": "Maldives, Indian Ocean",
            "tour1Name": "Maldives Overwater Escape",
            "tour1Desc": "Private overwater villas, coral reef diving, and sunset cruises in the most pristine waters on earth.",
            "tour2Cat": "Safari",
            "tour2Days": "14 Days",
            "tour2Loc": "Tanzania, East Africa",
            "tour2Name": "Great Migration Safari",
            "tour2Desc": "Witness 1.5 million wildebeest cross the Serengeti — one of nature's greatest spectacles.",
            "tour3Cat": "Cultural",
            "tour3Days": "12 Days",
            "tour3Loc": "Japan, East Asia",
            "tour3Name": "Japan Cherry Blossom",
            "tour3Desc": "Tokyo, Kyoto, and Osaka during sakura season — an unforgettable cultural immersion.",
            "tour4Cat": "Luxury",
            "tour4Days": "8 Days",
            "tour4Loc": "Greece, Mediterranean",
            "tour4Name": "Greek Islands Yacht Charter",
            "tour4Desc": "Private yacht hopping across Santorini, Mykonos, and Crete with your personal crew.",
            "tour5Cat": "Adventure",
            "tour5Days": "9 Days",
            "tour5Loc": "Iceland, North Atlantic",
            "tour5Name": "Northern Lights Iceland",
            "tour5Desc": "Chase the aurora borealis and soak in geothermal pools under a painted sky.",
            "tour6Cat": "Adventure",
            "tour6Days": "16 Days",
            "tour6Loc": "Patagonia, South America",
            "tour6Name": "Patagonia Wilderness Trek",
            "tour6Desc": "Glacier trekking, condor sightings, and end-of-the-world fjords across Argentina and Chile.",
        },
        "dest": {
            "heroEyebrow": "57 Top Destinations",
            "heroTitle1": "Explore the World",
            "heroTitleEm": "Without Limits",
            "heroTitleHtml": "Explore the World<br><em>Without Limits</em>",
            "heroSub": "From secluded island hideaways to cosmopolitan capitals — every corner of the globe is within reach.",
            "filterAll": "All (57)",
            "filterBeach": "Beach & Islands",
            "filterSafari": "Safari & Wilderness",
            "filterCulture": "Culture & History",
            "filterAdventure": "Adventure",
            "filterFood": "Food & Wine",
            "filterCity": "City Breaks",
            "countDefault": "Showing all 57 destinations",
            "cards": dest_cards,
        },
        "packages": {
            "heroEyebrow": "Travel Packages",
            "heroTitle1": "Choose Your",
            "heroTitleEm": "Perfect Journey",
            "heroTitleHtml": "Choose Your<br><em>Perfect Journey</em>",
            "heroSub": "Thoughtfully structured packages for every style of travel — from intimate escapes to grand expeditions.",
            "tag": "Our Packages",
            "title": "Find the Right",
            "titleEm": "Package",
            "titleHtml": "Find the Right <em>Package</em>",
            "tier1": "Tier One",
            "essentialName": "Essential Explorer",
            "essentialSub": "The perfect introduction to world travel",
            "tier2": "Tier Two",
            "signatureName": "Signature Journey",
            "signatureSub": "Our premium travel experience",
            "tier3": "Tier Three",
            "ultraName": "Ultra Luxury",
            "ultraSub": "The pinnacle of world travel",
            "mostPopular": "Most Popular",
            "featReturnFlights": "Return flights included",
            "feat3Star": "3-star accommodation",
            "featAirportXfer": "Airport transfers",
            "featBreakfast": "Daily breakfast",
            "featConcierge": "Dedicated concierge",
            "featPrivateGuides": "Private guides",
            "featBusinessClass": "Business class flights",
            "feat5Star": "5-star accommodation",
            "featPrivateXfer": "Private transfers",
            "featAllMeals": "All meals included",
            "featPersonalConcierge": "Personal concierge",
            "featPrivateJet": "Private jet available",
            "featVillas": "Exclusive private villas",
            "featHeli": "Helicopter transfers",
            "featGourmet": "All-inclusive gourmet dining",
            "featButler": "24/7 personal butler",
            "featUnlimited": "Unlimited experiences",
            "getStarted": "Get Started",
            "bookSignature": "Book Signature",
            "requestQuote": "Request Quote",
            "enhanceTag": "Enhancements",
            "enhanceTitle": "Elevate Your",
            "enhanceEm": "Experience",
            "enhanceTitleHtml": "Elevate Your <em>Experience</em>",
            "addDining": "Fine Dining Upgrade",
            "addDiningDesc": "Michelin-starred restaurant reservations at your destinations, pre-booked and confirmed.",
            "addWellness": "Wellness & Spa",
            "addWellnessDesc": "Daily spa treatments, yoga sessions, and wellness experiences at world-class facilities.",
            "addPhoto": "Private Photographer",
            "addPhotoDesc": "A professional travel photographer documents your journey with stunning, lasting imagery.",
            "addHeli": "Helicopter Tours",
            "addHeliDesc": "Private helicopter experiences over iconic landscapes — fjords, volcanoes, and glaciers.",
        },
        "about": {
            "storyTag": "Our Story",
            "storyTitle1": "More Than a Travel",
            "storyTitle2": "Agency.",
            "storyTitleEm": "A Vision.",
            "storyTitleHtml": "More Than a Travel<br>Agency. <em>A Vision.</em>",
            "storyBody": "Built on the belief that every traveler deserves a truly personal experience — not a package, not a template, but a journey crafted entirely around you.",
            "planJourney": "Plan Your Journey",
            "whoTag": "Who We Are",
            "whoTitle1": "Passion for Travel",
            "whoTitleEm": "in Our DNA",
            "whoTitleHtml": "Passion for Travel<br><em>in Our DNA</em>",
            "whoP1": "Martins Global Travels was born from a single belief: that travel, done right, has the power to change lives. Our founder Martins spent years exploring the world's greatest destinations and built this agency to share that sense of wonder — with the comfort and precision modern travelers deserve.",
            "whoP2": "Our team of specialist travel designers is passionate about every destination we offer. Each person personally explores the places they recommend — we never suggest anywhere we haven't experienced firsthand.",
            "whoP3": "From meticulously selecting the perfect hotel to providing real-time support while you're on the road — everything we do is guided by one question: what would make this the most extraordinary trip of your life?",
            "pillarVision": "Vision",
            "pillarVisionT": "Your Journey, Our Passion",
            "pillarVisionD": "Every trip reflects our deep love of travel and our commitment to making your experience genuinely extraordinary.",
            "pillarApproach": "Approach",
            "pillarApproachT": "Handcrafted, Not Automated",
            "pillarApproachD": "No algorithms, no generic templates. Every itinerary is built by a specialist who has been there themselves.",
            "pillarReach": "Reach",
            "pillarReachT": "120+ Destinations Worldwide",
            "pillarReachD": "From hidden tropical coves to buzzing cultural capitals — our network spans every continent.",
            "pillarPromise": "Promise",
            "pillarPromiseT": "Always There For You",
            "pillarPromiseD": "24/7 support before, during, and after your trip. We don't disappear after the booking is made.",
            "valuesTag": "Our Values",
            "valuesTitle1": "Principles That",
            "valuesTitleEm": "Guide Everything",
            "valuesTitleHtml": "Principles That<br>Guide <em>Everything</em>",
            "val1t": "Authenticity First",
            "val1d": "We design experiences connecting you with real culture, real people, and real moments — beyond tourist checkboxes.",
            "val2t": "Relentless Excellence",
            "val2d": "Every hotel inspected, every guide trained, every itinerary stress-tested before we recommend it to a single client.",
            "val3t": "Responsible Travel",
            "val3d": "We carefully select responsible operators and are committed to sustainable, ethical travel practices at every destination.",
            "val4t": "Total Transparency",
            "val4d": "No hidden fees, no surprises. What you see is exactly what you get — always stated clearly upfront.",
            "val5t": "Human Connection",
            "val5d": "Real specialists, real conversations — you will always speak to a human who genuinely cares about your trip.",
            "val6t": "Your Journey, Always",
            "val6d": "We build each trip entirely around you — your preferences, your pace, your budget, your dream.",
            "commitTag": "Our Commitments",
            "commitTitle1": "What You Can Always",
            "commitTitleEm": "Expect From Us",
            "commitTitleHtml": "What You Can Always <em>Expect From Us</em>",
            "commitLead": "These aren't awards — they're promises. Every single trip, every single time.",
            "c1t": "Fully Insured & Licensed",
            "c1d": "We are a fully licensed US travel agency carrying professional liability insurance. Your booking and money are protected every step of the way.",
            "c2t": "24/7 Real Human Support",
            "c2d": "Not a chatbot. Not a call centre. A real specialist who knows your trip, available around the clock before and during travel.",
            "c3t": "Personally Recommended Only",
            "c3d": "We never recommend a hotel, guide, or experience we haven't personally visited. If we wouldn't send our own family there, we won't send you.",
            "c4t": "Best Price Guarantee",
            "c4d": "Find the same trip cheaper elsewhere and we'll match it. We stand behind the value of every itinerary we build.",
            "c5t": "Fully Bespoke, Always",
            "c5d": "No two trips are the same. Every itinerary is built from scratch around you — your pace, your interests, your budget.",
            "c6t": "Responsible Travel",
            "c6d": "We carefully select responsible operators and are committed to giving back to the communities in the destinations we serve.",
        },
        "contact": {
            "heroEyebrow": "Get in Touch",
            "heroTitle1": "Let's Plan Your",
            "heroTitleEm": "Dream Trip",
            "heroTitleHtml": "Let's Plan Your<br><em>Dream Trip</em>",
            "infoTitle1": "We're Here",
            "infoTitleEm": "For You",
            "infoTitleHtml": "We're Here<br><em>For You</em>",
            "heroSub": "Tell us where you want to go and a specialist will reach out within 24 hours.",
            "infoTag": "Contact Info",
            "infoTitle1": "We're Here",
            "infoTitleEm": "For You",
            "phone": "Phone",
            "email": "Email",
            "office": "Office",
            "officeAddr": "1350 Belmont St, Suite 114\nBrockton, MA",
            "hoursTitle": "Office Hours",
            "monFri": "Monday – Friday",
            "monFriTime": "8:00 AM – 8:00 PM",
            "sat": "Saturday",
            "satTime": "9:00 AM – 6:00 PM",
            "sun": "Sunday",
            "sunTime": "10:00 AM – 4:00 PM",
            "emergency": "Emergency",
            "emergencyTime": "24/7 Always",
            "destMaldives": "Maldives / Indian Ocean",
            "destAfrica": "Africa / Safari",
            "destJapan": "Japan / Asia Pacific",
            "destEurope": "Europe / Mediterranean",
            "destCaribbean": "Caribbean",
            "destSa": "South America",
            "destUnsure": "Not sure yet",
            "pkgEssential": "Essential Explorer",
            "pkgSignature": "Signature Journey",
            "pkgUltra": "Ultra Luxury",
            "pkgHoneymoon": "Honeymoon",
            "pkgFamily": "Family Holiday",
            "pkgGroup": "Group Travel",
            "travel1": "1 Person",
            "travel2": "2 People",
            "travel34": "3–4 People",
            "travel58": "5–8 People",
            "travel9": "9+ Group",
        },
        "faq": {
            "heroEyebrow": "Help & Information",
            "heroTitle1": "Frequently Asked",
            "heroTitleEm": "Questions",
            "heroTitleHtml": "Frequently Asked<br><em>Questions</em>",
            "heroSub": "Everything you need to know about booking and traveling with Martins Global Travels.",
            "g1": "Booking & Planning",
            "q1": "How do I start planning a trip?",
            "a1": "Head to our Contact page and send an enquiry with your destination, dates, and group size. One of our travel specialists will reach out within 24 hours to begin building your itinerary from scratch.",
            "q2": "How far in advance should I book?",
            "a2": "We recommend 3–6 months for most destinations, and 6–12 months for popular seasons like African safari, Japan cherry blossom, or peak European summer. We can accommodate last-minute bookings too — just ask.",
            "q3": "Can I fully customise my package?",
            "a3": "Every trip we build is completely bespoke. Our packages are a starting point — we tailor accommodation, activities, pace, dietary needs, and every detail to exactly what you want. Nothing is off the table.",
            "q4": "Do you organise group travel?",
            "a4": "Yes — from intimate family trips to large corporate retreats. We handle groups from 5 to 50+ people. Contact us with your group size and we'll put together a tailored proposal.",
            "q5": "Can you arrange honeymoons or special occasions?",
            "a5": "Absolutely. Honeymoons and special occasions are some of our most requested trips. We partner with hotels and resorts worldwide to arrange private dinners, room upgrades, surprise experiences, and bespoke touches that make the moment truly unforgettable.",
            "g2": "Pricing & Payment",
            "q6": "Why don't you show prices on the website?",
            "a6": "Every trip is completely bespoke, so prices vary based on destination, season, accommodation, duration, and group size. We prefer to give you an accurate quote based on exactly what you want — rather than a generic number that doesn't reflect your trip.",
            "q7": "Is there a consultation fee?",
            "a7": "No. Initial consultations and quotes are completely free. We only charge once you decide to proceed with a booking, at which point a deposit secures your arrangements.",
            "q8": "What payment methods do you accept?",
            "a8": "We accept all major credit and debit cards, bank transfers, and select digital payment methods. A deposit is required at booking, with the balance due 60–90 days before departure. Full payment terms are outlined in your booking agreement.",
            "q9": "Do you offer a best price guarantee?",
            "a9": "Yes. If you find the same itinerary at a lower price elsewhere — same hotels, flights, and dates — we will match it. We are confident in the value we provide, especially given the level of personalisation and support included.",
            "g3": "Protection & Safety",
            "q10": "Are my bookings financially protected?",
            "a10": "Yes, completely. Martins Global Travels is a fully licensed US travel agency carrying professional liability insurance. We work exclusively with financially stable, vetted suppliers worldwide, and every booking includes a detailed written agreement outlining your protections.",
            "q11": "What is your cancellation policy?",
            "a11": "Signature Journey and Ultra Luxury bookings include free cancellation up to 60 days before departure. Essential Explorer bookings carry a small cancellation fee. We strongly recommend comprehensive travel insurance for full peace of mind.",
            "q12": "Do I need travel insurance?",
            "a12": "We strongly recommend it for all trips. Travel insurance protects you against medical emergencies, trip disruption, lost luggage, and the unexpected. We can recommend trusted providers if you need help choosing the right policy.",
            "g4": "During Your Trip",
            "q13": "What support do I get while traveling?",
            "a13": "All bookings include 24/7 emergency support throughout your trip. Signature Journey and Ultra Luxury clients also have a dedicated personal concierge reachable at any hour for anything from restaurant recommendations to urgent rebooking.",
            "q14": "Will I have a local guide?",
            "a14": "Signature Journey and Ultra Luxury packages include expert private guides at each destination. Essential Explorer trips include group guides for included excursions. All guides are carefully vetted, English-speaking, and passionate about their destinations.",
            "q15": "Do you offer sustainable travel options?",
            "a15": "Yes. We carefully select responsible, locally-invested operators at every destination and are committed to sustainable travel practices. Ask us about our responsible travel options when you enquire.",
            "q16": "What if something goes wrong on my trip?",
            "a16": "Contact us immediately — our 24/7 emergency line is always open. We have local contacts and partners in every destination and can typically resolve issues quickly. Our goal is always to ensure any disruption has minimal impact on your experience.",
            "ctaTag": "Still have questions?",
            "ctaTitle1": "We're Happy to",
            "ctaTitleEm": "Help",
            "ctaTitleHtml": "We're Happy to <em style=\"font-style:italic;color:var(--gold)\">Help</em>",
            "ctaBody": "Reach out anytime — we typically respond within one business day.",
        },
        "privacy": {
            "heroEyebrow": "Your Data",
            "heroTitle1": "Privacy",
            "heroTitleEm": "Policy",
            "heroTitleHtml": "Privacy<br><em>Policy</em>",
            "heroSub": "How Martins Global Travels collects, uses, and protects your personal information.",
            "updated": "Last updated: March 27, 2026",
            "note": "This policy is provided for general information. It does not constitute legal advice. Have it reviewed by a qualified attorney for your business, jurisdiction, and practices.",
            "introH": "Introduction",
            "introP1": "Martins Global Travels (\"we,\" \"us,\" or \"our\") respects your privacy. This Privacy Policy describes how we collect, use, disclose, and safeguard personal information when you visit our website, contact us, subscribe to updates, or use our travel planning and booking services.",
            "introP2": "By using our website or providing information to us, you agree to this policy. If you do not agree, please do not use our services.",
            "collectH": "Information we collect",
            "collectP": "Depending on how you interact with us, we may collect:",
            "collectL1": "Contact and identity data: name, email address, phone number, mailing address, and similar details you provide on forms or in correspondence.",
            "collectL2": "Trip and preference data: destinations, dates, budget, travel style, dietary or accessibility needs, loyalty program numbers, and other information needed to plan or arrange travel.",
            "collectL3": "Payment-related data: limited payment information as needed to process transactions. Card data may be handled directly by payment processors; we do not store full card numbers on our servers unless required for a specific transaction and permitted by law.",
            "collectL4": "Communications: emails, messages, call notes, and feedback you send to us.",
            "collectL5": "Technical and usage data: IP address, browser type, device information, general location derived from IP, pages viewed, and similar data collected through cookies and similar technologies (see the Cookies section below).",
            "useH": "How we use information",
            "useP": "We use personal information to:",
            "useL1": "Respond to enquiries and provide travel consultations;",
            "useL2": "Research, plan, price, book, and manage travel arrangements with suppliers (airlines, hotels, tour operators, insurers, etc.);",
            "useL3": "Process payments and send related notices;",
            "useL4": "Send service-related messages and, where permitted, marketing communications (you may opt out of marketing at any time);",
            "useL5": "Improve our website, services, and customer experience;",
            "useL6": "Comply with legal obligations, enforce our terms, and protect rights, safety, and security.",
            "legalH": "Legal bases (where applicable)",
            "legalP": "If applicable law requires a \"legal basis\" for processing (for example in the European Economic Area or United Kingdom), we rely on one or more of: performance of a contract, legitimate interests (such as operating our business and securing our systems), consent where required, and legal obligation.",
            "shareH": "Sharing of information",
            "shareP": "We may share personal information with:",
            "shareL1": "Suppliers and partners who fulfill or support your travel (e.g., hotels, airlines, ground operators, insurers);",
            "shareL2": "Service providers that assist us (e.g., hosting, email delivery, analytics, payment processing, customer relationship tools);",
            "shareL3": "Professional advisers when required (e.g., lawyers, accountants);",
            "shareL4": "Authorities when required by law, court order, or to protect vital interests.",
            "shareP2": "We do not sell your personal information for monetary consideration as that term is commonly understood in US state privacy laws. We may use analytics or advertising tools that involve cookies or similar technologies as described below.",
            "cookiesH": "Cookies and similar technologies",
            "cookiesP": "We and our partners may use cookies, pixels, and similar technologies to operate the site, remember preferences, measure traffic, and (where applicable) deliver relevant content. You can control cookies through your browser settings. Blocking certain cookies may affect site functionality.",
            "retentionH": "Retention",
            "retentionP": "We retain personal information only as long as needed for the purposes described in this policy, including legal, accounting, or reporting requirements, unless a longer period is required or permitted by law.",
            "securityH": "Security",
            "securityP": "We implement reasonable administrative, technical, and organizational measures designed to protect personal information. No method of transmission over the Internet is completely secure; we cannot guarantee absolute security.",
            "rightsH": "Your choices and rights",
            "rightsP": "Depending on where you live, you may have rights to access, correct, delete, or restrict processing of your personal information, or to object to certain processing or to data portability. You may also have the right to lodge a complaint with a supervisory authority. To exercise applicable rights, contact us using the details below. We may need to verify your identity before responding.",
            "intlH": "International transfers",
            "intlP": "If you are located outside the United States, your information may be transferred to and processed in the United States or other countries where we or our suppliers operate. We take steps designed to ensure appropriate safeguards where required by law.",
            "childrenH": "Children",
            "childrenP": "Our services are not directed to children under 16, and we do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us and we will take appropriate steps to delete it.",
            "changesH": "Changes to this policy",
            "changesP": "We may update this Privacy Policy from time to time. We will post the revised policy on this page and update the \"Last updated\" date. Material changes may be communicated through additional notice where appropriate.",
            "contactH": "Contact us",
            "contactP": "For privacy-related questions or requests, contact Martins Global Travels using the details on our Contact page.",
            "contactLink": "Contact",
        },
        "terms": {
            "heroEyebrow": "Legal",
            "heroTitle1": "Terms of",
            "heroTitleEm": "Service",
            "heroTitleHtml": "Terms of<br><em>Service</em>",
            "heroSub": "Please read these terms carefully before using our website or services.",
            "updated": "Last updated: March 27, 2026",
            "note": "These terms are a general template. They are not legal advice. Have them reviewed and customized by a qualified attorney for your business, jurisdiction, and risk profile.",
            "agreeH": "Agreement to terms",
            "agreeP": "These Terms of Service (\"Terms\") govern your access to and use of the website and services of Martins Global Travels (collectively, \"we,\" \"us,\" or \"our\"). By accessing our website, submitting an enquiry, or using our services, you agree to these Terms. If you do not agree, do not use our services.",
            "roleH": "Our role",
            "roleP": "Martins Global Travels is a travel agency. We assist in researching, planning, and arranging travel-related products and services provided by third-party suppliers (such as airlines, hotels, cruise lines, tour operators, and insurers). Unless we expressly state otherwise in a signed agreement, we act as an intermediary between you and those suppliers.",
            "eligH": "Eligibility",
            "eligP": "You represent that you are at least 18 years old and have the legal capacity to enter into these Terms. If you use our services on behalf of a company or other entity, you represent that you have authority to bind that entity.",
            "bookH": "Bookings, suppliers, and your contract",
            "bookP": "When travel is booked, separate terms and conditions apply from each supplier (fare rules, cancellation policies, health requirements, etc.). Those supplier terms form part of your agreement for the relevant services. You are responsible for reviewing supplier terms, passports, visas, health requirements, and travel advisories. We are not responsible for supplier acts, omissions, failures, or changes, except as required by applicable law or as expressly stated in a written agreement between you and us.",
            "feesH": "Fees and payment",
            "feesP": "Quotes are estimates unless confirmed in writing. Prices can change until deposit or full payment is received and tickets or reservations are issued, subject to supplier rules. You agree to pay all amounts when due, including our professional or service fees where disclosed. Late payments may result in cancellation or penalties per supplier rules.",
            "cancelH": "Cancellations, changes, and refunds",
            "cancelP": "Cancellation, change, and refund rules depend on supplier terms, fare class, timing, and insurance coverage. Fees may be non-refundable. We will use reasonable efforts to assist with changes or cancellations as permitted by suppliers; we do not guarantee refunds or waivers.",
            "insH": "Travel insurance",
            "insP": "We strongly recommend comprehensive travel insurance. Insurance is subject to the insurer's policy terms. You are responsible for determining whether coverage meets your needs.",
            "discH": "Disclaimers",
            "discP": "Information on our website (including sample itineraries, descriptions, and photographs) is for general guidance and may change. We do not warrant that all information is complete, current, or error-free. Travel involves inherent risks; we do not guarantee safety, satisfaction, or uninterrupted travel.",
            "liabH": "Limitation of liability",
            "liabP": "To the fullest extent permitted by applicable law, Martins Global Travels and our officers, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or for loss of profits, goodwill, or data, arising from your use of our services or travel arrangements. Our aggregate liability for any claim arising out of or relating to these Terms or our services is limited to the fees you paid to us for the specific booking or service giving rise to the claim during the six (6) months before the claim arose, except where prohibited by law. Some jurisdictions do not allow certain limitations; in those cases, our liability is limited to the maximum extent permitted.",
            "indemH": "Indemnity",
            "indemP": "You agree to indemnify and hold harmless Martins Global Travels and our affiliates, officers, employees, and agents from claims, losses, damages, and expenses (including reasonable attorneys' fees) arising from your breach of these Terms, your travel, or your violation of law or third-party rights, except to the extent caused by our gross negligence or willful misconduct.",
            "ipH": "Intellectual property",
            "ipP": "Content on this website (including text, graphics, logos, and design) is owned by Martins Global Travels or our licensors and is protected by intellectual property laws. You may not copy, modify, distribute, or create derivative works without our prior written consent, except for limited personal, non-commercial viewing.",
            "govH": "Governing law and disputes",
            "govP": "These Terms are governed by the laws of the State in which Martins Global Travels maintains its principal place of business, without regard to conflict-of-law principles, except where mandatory consumer protection laws of your jurisdiction apply. You agree to the exclusive jurisdiction and venue of the state and federal courts located in that State for disputes, subject to any rights you cannot waive under applicable law.",
            "chgH": "Changes",
            "chgP": "We may modify these Terms at any time. The updated Terms will be posted on this page with a revised \"Last updated\" date. Continued use after changes constitutes acceptance of the revised Terms, except where applicable law requires additional notice or consent.",
            "contactH": "Contact",
            "contactP": "For questions about these Terms, contact us via our Contact page.",
            "contactLink": "Contact",
        },
        "bookNav": {
            "bookFlights": "Book flights",
            "portalSub": "Client portal",
            "explore": "Explore",
            "legal": "Legal",
            "support": "Support",
            "bookTravel": "Book Travel",
            "contactUs": "Contact Us",
        },
    }
    return en


def dict_to_js(obj, indent=2) -> str:
    sp = " " * indent

    def render(val, depth):
        pad = sp * depth
        if isinstance(val, dict):
            if not val:
                return "{}"
            lines = ["{"]
            for k, v in val.items():
                key = k if re.match(r"^[A-Za-z_][A-Za-z0-9_]*$", k) else js_str(k)
                lines.append(f"{pad}{sp}{key}: {render(v, depth + 1)},")
            lines.append(f"{pad}}}")
            return "\n".join(lines)
        if isinstance(val, str):
            return js_str(val)
        return json.dumps(val)

    return render(obj, 0)


def write_translations():
    en = build_en()
    langs = {}
    for lang in ["en", "es", "pt", "ht", "kea", "fr", "zh"]:
        langs[lang] = translate_dict(en, lang)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    parts = [
        "/**\n * Martins Global Travels — translations.\n * Loaded before i18n.js.\n */\n(function () {\n  \"use strict\";\n"
    ]
    for code, data in langs.items():
        parts.append(f"  var {code.upper() if code != 'zh' else 'ZH'} = {dict_to_js(data, 2)};\n")
    parts.append(
        "\n  window.MGT_TRANSLATIONS = {\n    en: EN,\n    es: ES,\n    pt: PT,\n    ht: HT,\n    kea: KEA,\n    fr: FR,\n    zh: ZH\n  };\n})();\n"
    )
    OUT.write_text("".join(parts), encoding="utf-8")
    print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")


def patch_index():
    html = INDEX.read_text(encoding="utf-8")
    original = html

    # CSS for lang select
    if ".lang-select" not in html:
        css = """
.lang-switcher{display:flex;align-items:center;flex-shrink:0}
.lang-select{appearance:none;font-family:'DM Sans',sans-serif;font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--dim);background:var(--ink3) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23c9a84c' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E") no-repeat right 8px center/10px;border:1px solid var(--border);padding:8px 26px 8px 12px;cursor:pointer;transition:border-color .25s,color .25s}
.lang-select:hover{border-color:rgba(201,168,76,.35);color:#fff}
.lang-select option{color:var(--ink);background:#fff}
.mob .lang-switcher{padding:16px 0;border-bottom:1px solid var(--border);margin-bottom:8px}
.mob .lang-select{width:100%;font-size:12px;padding:12px 28px 12px 14px}
.visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.hp-field{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
"""
        html = html.replace("</style>", css + "</style>", 1)

    # Title
    html = html.replace(
        "<title>Martins Global Travels</title>",
        '<title data-i18n-title="meta.title">Martins Global Travels</title>',
    )

    # Nav lang switcher desktop
    lang_opts = "".join(
        f'<option value="{c}">{lbl}</option>' for c, lbl in LANG_LABELS.items()
    )
    lang_desktop = f'''<div class="lang-switcher">
      <label class="visually-hidden" for="lang-select-desktop" data-i18n="a11y.langSwitcher">Select language</label>
      <select id="lang-select-desktop" class="lang-select" aria-label="Select language" data-i18n-aria="a11y.langSwitcher">{lang_opts}</select>
    </div>'''
    if "lang-select-desktop" not in html:
        html = html.replace(
            '<button type="button" class="theme-toggle"',
            lang_desktop + '\n    <button type="button" class="theme-toggle"',
            1,
        )

    # Nav lang mobile
    lang_mobile = f'''<div class="lang-switcher">
    <label class="visually-hidden" for="lang-select-mobile" data-i18n="a11y.langSwitcher">Select language</label>
    <select id="lang-select-mobile" class="lang-select" aria-label="Select language" data-i18n-aria="a11y.langSwitcher">{lang_opts}</select>
  </div>'''
    if "lang-select-mobile" not in html:
        html = html.replace('<div class="mob" id="mob">', '<div class="mob" id="mob">\n  ' + lang_mobile, 1)

    # Contact form
    html = re.sub(
        r'<form id="enquiry-form"[^>]*>.*?</form>',
        '''<form id="enquiry-form" class="contact-form" name="enquiry" method="post" action="/api/contact" accept-charset="UTF-8">
        <input type="hidden" name="_subject" value="New enquiry — Martins Global Travels website">
        <input type="text" name="_honey" class="hp-field" tabindex="-1" autocomplete="off" aria-hidden="true">
        <div class="form-h" data-i18n="form.title">Send an Enquiry</div>
        <div class="form-s" data-i18n="form.subtitle">Fill out the form and Jeanie will respond within 24 hours.</div>
        <div class="fgrid">
          <div class="fg"><label class="flbl" for="enq-first" data-i18n="form.firstName">First Name</label><input class="finp" id="enq-first" name="firstName" type="text" data-i18n-placeholder="form.placeholderFirst" placeholder="John" required></div>
          <div class="fg"><label class="flbl" for="enq-last" data-i18n="form.lastName">Last Name</label><input class="finp" id="enq-last" name="lastName" type="text" data-i18n-placeholder="form.placeholderLast" placeholder="Smith" required></div>
          <div class="fg"><label class="flbl" for="enq-email" data-i18n="form.email">Email</label><input class="finp" id="enq-email" name="email" type="email" data-i18n-placeholder="form.placeholderEmail" placeholder="john@email.com" required></div>
          <div class="fg"><label class="flbl" for="enq-phone" data-i18n="form.phone">Phone</label><input class="finp" id="enq-phone" name="phone" type="tel" data-i18n-placeholder="form.placeholderPhone" placeholder="(508) 555-1234"></div>
          <div class="fg"><label class="flbl" for="enq-dest" data-i18n="form.destination">Destination</label><select class="fsel" id="enq-dest" name="destination"><option value="" data-i18n="form.selectRegion">Select region...</option><option data-i18n="contact.destMaldives">Maldives / Indian Ocean</option><option data-i18n="contact.destAfrica">Africa / Safari</option><option data-i18n="contact.destJapan">Japan / Asia Pacific</option><option data-i18n="contact.destEurope">Europe / Mediterranean</option><option data-i18n="contact.destCaribbean">Caribbean</option><option data-i18n="contact.destSa">South America</option><option data-i18n="contact.destUnsure">Not sure yet</option></select></div>
          <div class="fg"><label class="flbl" for="enq-pkg" data-i18n="form.package">Package</label><select class="fsel" id="enq-pkg" name="package"><option value="" data-i18n="form.selectPackage">Select package...</option><option data-i18n="contact.pkgEssential">Essential Explorer</option><option data-i18n="contact.pkgSignature">Signature Journey</option><option data-i18n="contact.pkgUltra">Ultra Luxury</option><option data-i18n="contact.pkgHoneymoon">Honeymoon</option><option data-i18n="contact.pkgFamily">Family Holiday</option><option data-i18n="contact.pkgGroup">Group Travel</option></select></div>
          <div class="fg"><label class="flbl" for="enq-date" data-i18n="form.departureDate">Departure Date</label><input class="finp" id="enq-date" name="departureDate" type="date"></div>
          <div class="fg"><label class="flbl" for="enq-travelers" data-i18n="form.travelers">Travelers</label><select class="fsel" id="enq-travelers" name="travelers"><option data-i18n="contact.travel1">1 Person</option><option data-i18n="contact.travel2">2 People</option><option data-i18n="contact.travel34">3–4 People</option><option data-i18n="contact.travel58">5–8 People</option><option data-i18n="contact.travel9">9+ Group</option></select></div>
          <div class="fg full"><label class="flbl" for="enq-message" data-i18n="form.message">Tell Us About Your Dream Trip</label><textarea class="fta" id="enq-message" name="message" data-i18n-placeholder="form.messagePlaceholder" placeholder="Share any special requests, interests, or must-have experiences..."></textarea></div>
        </div>
        <button class="fsub" type="submit" data-i18n="form.sendEnquiry">Send Enquiry</button>
        <p class="fnote" data-i18n="form.note">Your information is secure and will never be shared with third parties.</p>
      </form>''',
        html,
        count=1,
        flags=re.S,
    )

    # Remove netlify hidden form
    html = re.sub(
        r'\n<!-- Netlify reads this.*?<textarea name="message"></textarea>\s*</form>',
        "",
        html,
        flags=re.S,
    )

    # Destination cards i18n
    cards = re.findall(
        r'(<div class="dpc"[^>]*>.*?<div class="dpc-region">)([^<]+)(</div>\s*<div class="dpc-name">)([^<]+)(</div>)',
        html,
        re.S,
    )
    for region, name in [(m[1], m[3]) for m in cards]:
        key = slugify(name)
        old = f'<div class="dpc-region">{region}</div>\n        <div class="dpc-name">{name}</div>'
        new = f'<div class="dpc-region" data-i18n="dest.cards.{key}.region">{region}</div>\n        <div class="dpc-name" data-i18n="dest.cards.{key}.name">{name}</div>'
        html = html.replace(old, new, 1)

    # Enquire buttons
    html = html.replace(
        '<button class="dpc-btn" onclick="go(\'contact\')">Enquire</button>',
        '<button class="dpc-btn" onclick="go(\'contact\')" data-i18n="common.enquire">Enquire</button>',
    )

    # Move scripts to end + add i18n includes
    script_block = re.search(r"<script>\n// World Cup home popup", html)
    if script_block:
        end_body = html.rfind("</body>")
        script_end = html.find("</script>", script_block.start()) + len("</script>")
        inline_script = html[script_block.start() : script_end]
        html = html[: script_block.start()] + html[script_end:]
        # remove duplicate if already at end
        if "i18n/translations.js" not in html:
            inserts = (
                inline_script
                + '\n<script src="i18n/translations.js"></script>\n<script src="i18n.js"></script>\n<script src="js/contact-form.js"></script>\n'
            )
            html = html[:end_body] + inserts + html[end_body:]

    # Update filterDest in script for i18n
    html = html.replace(
        """  if(countEl) countEl.textContent = cat==='all'
    ? 'Showing all ' + visible + ' destinations'
    : 'Showing ' + visible + ' ' + label + ' destination' + (visible!==1?'s':'');""",
        """  if(countEl){
    var i18n=window.MartinsI18n;
    var t=i18n&&i18n.t?function(k){return i18n.t(k);}:function(k){return k;};
    if(cat==='all') countEl.textContent=t('common.showingAll').replace('{n}',visible);
    else countEl.textContent=(visible===1?t('common.showingCat'):t('common.showingCats')).replace('{n}',visible).replace('{cat}',label);
  }""",
    )

    # Remove old netlify form handler from inline script
    html = re.sub(
        r"// Enquiry form → Netlify.*?}\)\(\);\n",
        "",
        html,
        flags=re.S,
    )

    # Toast onclick i18n keys
    html = html.replace(
        "onclick=\"toast('Subscribed! Welcome aboard.')\"",
        "onclick=\"toast((window.MartinsI18n&&MartinsI18n.t('toast.subscribed'))||'Subscribed! Welcome aboard.')\"",
    )
    html = html.replace(
        "onclick=\"toast('Blog coming soon!')\"",
        "onclick=\"toast((window.MartinsI18n&&MartinsI18n.t('toast.blogSoon'))||'Blog coming soon!')\"",
    )
    html = html.replace(
        "onclick=\"toast('Careers coming soon!')\"",
        "onclick=\"toast((window.MartinsI18n&&MartinsI18n.t('toast.careersSoon'))||'Careers coming soon!')\"",
    )

    if html != original:
        INDEX.write_text(html, encoding="utf-8")
        print("Patched index.html")
    else:
        print("No index.html changes")


if __name__ == "__main__":
    write_translations()
    patch_index()
