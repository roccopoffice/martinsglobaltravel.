#!/usr/bin/env python3
"""Apply data-i18n attributes to index.html sections."""
from pathlib import Path

INDEX = Path(__file__).resolve().parent.parent / "index.html"

REPLACEMENTS = [
    # Nav & brand
    ('alt="Martins Global Travels — gold seal logo with MGT monogram and globe"',
     'alt="Martins Global Travels — gold seal logo with MGT monogram and globe" data-i18n-alt="a11y.brandAlt"'),
    ('<span class="nav-name">Martins Global Travels</span>', '<span class="nav-name" data-i18n="brand.name">Martins Global Travels</span>'),
    ('<span class="nav-sub">Where luxury meets the world</span>', '<span class="nav-sub" data-i18n="brand.tagline">Where luxury meets the world</span>'),
    ('<a onclick="go(\'home\')" data-p="home" class="act">Home</a>', '<a onclick="go(\'home\')" data-p="home" class="act" data-i18n="nav.home">Home</a>'),
    ('<a onclick="go(\'destinations\')" data-p="destinations">Destinations</a>', '<a onclick="go(\'destinations\')" data-p="destinations" data-i18n="nav.destinations">Destinations</a>'),
    ('<a onclick="go(\'packages\')" data-p="packages">Packages</a>', '<a onclick="go(\'packages\')" data-p="packages" data-i18n="nav.packages">Packages</a>'),
    ('<a onclick="go(\'faq\')" data-p="faq">FAQ</a>', '<a onclick="go(\'faq\')" data-p="faq" data-i18n="nav.faq">FAQ</a>'),
    ('<a onclick="go(\'about\')" data-p="about">About</a>', '<a onclick="go(\'about\')" data-p="about" data-i18n="nav.about">About</a>'),
    ('<a onclick="go(\'contact\')" data-p="contact">Contact</a>', '<a onclick="go(\'contact\')" data-p="contact" data-i18n="nav.contact">Contact</a>'),
    ('<a href="portal.html">Client Portal</a>', '<a href="portal.html" data-i18n="nav.portal">Client Portal</a>'),
    ('aria-label="Switch to dark mode"', 'aria-label="Switch to dark mode" data-i18n-aria="theme.darkMode"'),
    ('<span class="theme-toggle-label">Light</span>', '<span class="theme-toggle-label" data-i18n="theme.light">Light</span>'),
    ('<button type="button" class="nav-cta" onclick="go(\'contact\')">Book Now</button>', '<button type="button" class="nav-cta" onclick="go(\'contact\')" data-i18n="nav.bookNow">Book Now</button>'),
    # Mobile nav
    ('<a onclick="go(\'home\');toggleMob()">Home</a>', '<a onclick="go(\'home\');toggleMob()" data-i18n="nav.home">Home</a>'),
    ('<a onclick="go(\'destinations\');toggleMob()">Destinations</a>', '<a onclick="go(\'destinations\');toggleMob()" data-i18n="nav.destinations">Destinations</a>'),
    ('<a onclick="go(\'packages\');toggleMob()">Packages</a>', '<a onclick="go(\'packages\');toggleMob()" data-i18n="nav.packages">Packages</a>'),
    ('<a onclick="go(\'faq\');toggleMob()">FAQ</a>', '<a onclick="go(\'faq\');toggleMob()" data-i18n="nav.faq">FAQ</a>'),
    ('<a onclick="go(\'about\');toggleMob()">About</a>', '<a onclick="go(\'about\');toggleMob()" data-i18n="nav.about">About</a>'),
    ('<a onclick="go(\'contact\');toggleMob()">Contact</a>', '<a onclick="go(\'contact\');toggleMob()" data-i18n="nav.contact">Contact</a>'),
    ('<a href="portal.html" onclick="toggleMob()">Client Portal</a>', '<a href="portal.html" onclick="toggleMob()" data-i18n="nav.portal">Client Portal</a>'),
    ('<span>Appearance</span>', '<span data-i18n="theme.appearance">Appearance</span>'),
    # WC popup
    ('aria-label="World Cup 2026 travel packages"', 'aria-label="World Cup 2026 travel packages" data-i18n-aria="a11y.wcPopup"'),
    ('aria-label="Close" onclick="closeWcPopup()"', 'aria-label="Close" data-i18n-aria="a11y.close" onclick="closeWcPopup()"'),
    ('alt="World Cup 2026 travel packages — flights, hotels, transportation, and ticket assistance from Martins Global Travels."',
     'alt="World Cup 2026 travel packages — flights, hotels, transportation, and ticket assistance from Martins Global Travels." data-i18n-alt="wc.imgAlt"'),
    ('class="wc-popup-continue" onclick="closeWcPopup()">Continue browsing</button>',
     'class="wc-popup-continue" onclick="closeWcPopup()" data-i18n="wc.continue">Continue browsing</button>'),
    ('class="wc-popup-cta" onclick="wcPopupBook()">Book your experience</button>',
     'class="wc-popup-cta" onclick="wcPopupBook()" data-i18n="wc.book">Book your experience</button>'),
    # Hero
    ('<span>The World\'s</span>', '<span data-i18n="home.heroLine1">The World\'s</span>'),
    ('<span>Most <em>Extraordinary</em></span>', '<span data-i18n-html="home.heroLine2html">Most <em>Extraordinary</em></span>'),
    ('<span>Destinations</span>', '<span data-i18n="home.heroLine3">Destinations</span>'),
    ('<p class="hero-desc">Tailor-made journeys crafted entirely around you — from overwater villas to safari wilderness and everything between.</p>',
     '<p class="hero-desc" data-i18n="home.heroDesc">Tailor-made journeys crafted entirely around you — from overwater villas to safari wilderness and everything between.</p>'),
    ('<button class="btn-primary" onclick="go(\'destinations\')">\n            Explore Destinations',
     '<button class="btn-primary" onclick="go(\'destinations\')" data-i18n="home.exploreDestinations">\n            Explore Destinations'),
    ('<button class="btn-outline-w" onclick="go(\'packages\')">View Packages</button>',
     '<button class="btn-outline-w" onclick="go(\'packages\')" data-i18n="home.viewPackages">View Packages</button>'),
    ('<div class="hero-stat-lbl">Destinations</div>', '<div class="hero-stat-lbl" data-i18n="home.statDestinations">Destinations</div>'),
    ('<div class="hero-stat-lbl">Continents</div>', '<div class="hero-stat-lbl" data-i18n="home.statContinents">Continents</div>'),
    ('Scroll to explore', '<span data-i18n="common.scrollExplore">Scroll to explore</span>'),
    # Top destinations section
    ('<div class="tag">Top Destinations</div>', '<div class="tag" data-i18n="home.topDestinations">Top Destinations</div>'),
    ('<h2 id="top-dest-heading" class="h2" style="font-size:clamp(38px,5vw,64px)">Where Will You<br><em>Go Next?</em></h2>',
     '<h2 id="top-dest-heading" class="h2" style="font-size:clamp(38px,5vw,64px)" data-i18n-html="home.whereNextHtml">Where Will You<br><em>Go Next?</em></h2>'),
    ('onclick="go(\'destinations\')">All Destinations</button>', 'onclick="go(\'destinations\')" data-i18n="common.allDestinations">All Destinations</button>'),
    ('<p class="td-card-region">Europe</p>\n              <h3 class="td-card-title">Italy</h3>',
     '<p class="td-card-region" data-i18n="home.tdItalyRegion">Europe</p>\n              <h3 class="td-card-title" data-i18n="home.tdItalyTitle">Italy</h3>'),
    ('<p class="td-card-desc">From Venetian canals to Tuscan hills — art, cuisine, and la dolce vita tailored to your pace.</p>',
     '<p class="td-card-desc" data-i18n="home.tdItalyDesc">From Venetian canals to Tuscan hills — art, cuisine, and la dolce vita tailored to your pace.</p>'),
    ('onclick="go(\'destinations\')">Explore Italy</button>', 'onclick="go(\'destinations\')" data-i18n="home.tdItalyBtn">Explore Italy</button>'),
    ('<p class="td-card-region">East Asia</p>\n              <h3 class="td-card-title">China</h3>',
     '<p class="td-card-region" data-i18n="home.tdChinaRegion">East Asia</p>\n              <h3 class="td-card-title" data-i18n="home.tdChinaTitle">China</h3>'),
    ('<p class="td-card-desc">Ancient wonders and ultramodern cities — private guides unlock history, flavor, and spectacle.</p>',
     '<p class="td-card-desc" data-i18n="home.tdChinaDesc">Ancient wonders and ultramodern cities — private guides unlock history, flavor, and spectacle.</p>'),
    ('onclick="go(\'destinations\')">Explore China</button>', 'onclick="go(\'destinations\')" data-i18n="home.tdChinaBtn">Explore China</button>'),
    ('<h3 class="td-card-title">Portugal</h3>', '<h3 class="td-card-title" data-i18n="home.tdPortugalTitle">Portugal</h3>'),
    ('<p class="td-card-desc">Atlantic light, azulejo tiles, and soulful Fado — Lisbon, Porto, and the Algarve on your terms.</p>',
     '<p class="td-card-desc" data-i18n="home.tdPortugalDesc">Atlantic light, azulejo tiles, and soulful Fado — Lisbon, Porto, and the Algarve on your terms.</p>'),
    ('onclick="go(\'destinations\')">Explore Portugal</button>', 'onclick="go(\'destinations\')" data-i18n="home.tdPortugalBtn">Explore Portugal</button>'),
    ('<h3 class="td-card-title">Spain</h3>', '<h3 class="td-card-title" data-i18n="home.tdSpainTitle">Spain</h3>'),
    ('<p class="td-card-desc">Moorish palaces, Gaudí’s Barcelona, and sun-soaked coasts — rhythm, tapas, and pure passion.</p>',
     '<p class="td-card-desc" data-i18n="home.tdSpainDesc">Moorish palaces, Gaudí\'s Barcelona, and sun-soaked coasts — rhythm, tapas, and pure passion.</p>'),
    ('onclick="go(\'destinations\')">Explore Spain</button>', 'onclick="go(\'destinations\')" data-i18n="home.tdSpainBtn">Explore Spain</button>'),
    ('<p class="td-card-region">Africa</p>', '<p class="td-card-region" data-i18n="home.tdSaRegion">Africa</p>'),
    ('<h3 class="td-card-title">South Africa</h3>', '<h3 class="td-card-title" data-i18n="home.tdSaTitle">South Africa</h3>'),
    ('<p class="td-card-desc">Cape elegance meets Big Five safari — wine routes, dramatic coast, and unforgettable wildlife.</p>',
     '<p class="td-card-desc" data-i18n="home.tdSaDesc">Cape elegance meets Big Five safari — wine routes, dramatic coast, and unforgettable wildlife.</p>'),
    ('onclick="go(\'destinations\')">Explore South Africa</button>', 'onclick="go(\'destinations\')" data-i18n="home.tdSaBtn">Explore South Africa</button>'),
    ('<span style="font-size:13px;font-weight:300">Our five signature countries — hand-picked for bespoke journeys worldwide.</span>',
     '<span style="font-size:13px;font-weight:300" data-i18n="home.signatureFoot">Our five signature countries — hand-picked for bespoke journeys worldwide.</span>'),
    ('onclick="go(\'destinations\')">View all destinations</button>', 'onclick="go(\'destinations\')" data-i18n="common.viewAllDestinations">View all destinations</button>'),
    # Marquee - only first occurrence each
    ('<div class="mq-item">Italy<span', '<div class="mq-item"><span data-i18n="home.mqItaly">Italy</span><span', 1),
    ('<div class="mq-item">China<span', '<div class="mq-item"><span data-i18n="home.mqChina">China</span><span', 1),
    ('<div class="mq-item">Portugal<span', '<div class="mq-item"><span data-i18n="home.mqPortugal">Portugal</span><span', 1),
    ('<div class="mq-item">Spain<span', '<div class="mq-item"><span data-i18n="home.mqSpain">Spain</span><span', 1),
    ('<div class="mq-item">South Africa<span', '<div class="mq-item"><span data-i18n="home.mqSa">South Africa</span><span', 1),
    # About strip
    ('<div class="tag">About Martins Global Travels</div>', '<div class="tag" data-i18n="home.aboutTag">About Martins Global Travels</div>'),
    ('<h2 class="h2 about-strip-text" style="font-family:\'DM Serif Display\',serif">A Travel Agency Built<br>Around <em>You</em></h2>',
     '<h2 class="h2 about-strip-text" style="font-family:\'DM Serif Display\',serif" data-i18n-html="home.aboutTitleHtml">A Travel Agency Built<br>Around <em>You</em></h2>'),
    ('<p class="body">Martins Global Travels was built on one belief — every traveler deserves a journey crafted entirely around them. Our specialists personally explore every destination they recommend. No templates, no guesswork.</p>',
     '<p class="body" data-i18n="home.aboutBody">Martins Global Travels was built on one belief — every traveler deserves a journey crafted entirely around them. Our specialists personally explore every destination they recommend. No templates, no guesswork.</p>'),
    ('<span class="pill">120+ Destinations</span>', '<span class="pill" data-i18n="home.pill1">120+ Destinations</span>'),
    ('<span class="pill">6 Continents</span>', '<span class="pill" data-i18n="home.pill2">6 Continents</span>'),
    ('<span class="pill">24/7 Support</span>', '<span class="pill" data-i18n="home.pill3">24/7 Support</span>'),
    ('<span class="pill">100% Tailored</span>', '<span class="pill" data-i18n="home.pill4">100% Tailored</span>'),
    ('onclick="go(\'about\')">\n          Our Story', 'onclick="go(\'about\')" data-i18n="home.ourStory">\n          Our Story'),
    # Tours
    ('<div class="tag">Featured Journeys</div>', '<div class="tag" data-i18n="home.featuredJourneys">Featured Journeys</div>'),
    ('<h2 class="h2">Our Curated <em>Itineraries</em></h2>', '<h2 class="h2" data-i18n-html="home.curatedHtml">Our Curated <em>Itineraries</em></h2>'),
    ('onclick="go(\'packages\')">All packages</button>', 'onclick="go(\'packages\')" data-i18n="home.allPackages">All packages</button>'),
    ('Scroll to see more', '<span data-i18n="common.scrollMore">Scroll to see more</span>'),
    # Why section
    ('<div class="tag">Why Martins Global Travels</div>', '<div class="tag" data-i18n="home.whyTag">Why Martins Global Travels</div>'),
    ('<h2 class="h2">Travel Built <em>Differently</em></h2>', '<h2 class="h2" data-i18n-html="home.whyTitleHtml">Travel Built <em>Differently</em></h2>'),
    ('<p class="body" style="max-width:360px">We handle every detail so you can focus entirely on the experience.</p>',
     '<p class="body" style="max-width:360px" data-i18n="home.whyLead">We handle every detail so you can focus entirely on the experience.</p>'),
    ('<div class="wcard-t">Personally Curated</div>', '<div class="wcard-t" data-i18n="home.why1t">Personally Curated</div>'),
    ('<p class="wcard-d">Every hotel, guide, and experience is personally vetted. We only recommend places our team has been to themselves.</p>',
     '<p class="wcard-d" data-i18n="home.why1d">Every hotel, guide, and experience is personally vetted. We only recommend places our team has been to themselves.</p>'),
    ('<div class="wcard-t">Fully Protected</div>', '<div class="wcard-t" data-i18n="home.why2t">Fully Protected</div>'),
    ('<p class="wcard-d">Your trip investment is fully secured. We work only with trusted, vetted suppliers and carry full travel agent liability insurance.</p>',
     '<p class="wcard-d" data-i18n="home.why2d">Your trip investment is fully secured. We work only with trusted, vetted suppliers and carry full travel agent liability insurance.</p>'),
    ('<div class="wcard-t">Global Network</div>', '<div class="wcard-t" data-i18n="home.why3t">Global Network</div>'),
    ('<p class="wcard-d">A carefully curated network of trusted local experts across every destination we offer, giving you access to experiences unavailable anywhere else.</p>',
     '<p class="wcard-d" data-i18n="home.why3d">A carefully curated network of trusted local experts across every destination we offer, giving you access to experiences unavailable anywhere else.</p>'),
    ('<div class="wcard-t">24/7 Support</div>', '<div class="wcard-t" data-i18n="home.why4t">24/7 Support</div>'),
    ('<p class="wcard-d">Round-the-clock concierge service. Wherever you are in the world, our team is always just a call away.</p>',
     '<p class="wcard-d" data-i18n="home.why4d">Round-the-clock concierge service. Wherever you are in the world, our team is always just a call away.</p>'),
    # CTA & newsletter
    ('<div class="tag">Ready to Travel?</div>', '<div class="tag" data-i18n="home.readyTag">Ready to Travel?</div>'),
    ('<h2 class="h2">Your Dream Trip<br><em>Starts Here</em></h2>', '<h2 class="h2" data-i18n-html="home.readyTitleHtml">Your Dream Trip<br><em>Starts Here</em></h2>'),
    ('<p class="body">Tell us where you want to go. Our specialists will craft every detail of your perfect journey — all you have to do is show up.</p>',
     '<p class="body" data-i18n="home.readyBody">Tell us where you want to go. Our specialists will craft every detail of your perfect journey — all you have to do is show up.</p>'),
    ('onclick="go(\'contact\')">\n        Plan My Trip', 'onclick="go(\'contact\')" data-i18n="common.planMyTrip">\n        Plan My Trip'),
    ('<div class="tag">Stay Inspired</div>', '<div class="tag" data-i18n="home.nlTag">Stay Inspired</div>'),
    ('<h2 class="h2" style="font-size:clamp(30px,3.5vw,44px)">Be First to <em>Discover</em><br>Our Exclusive Deals</h2>',
     '<h2 class="h2" style="font-size:clamp(30px,3.5vw,44px)" data-i18n-html="home.nlTitleHtml">Be First to <em>Discover</em><br>Our Exclusive Deals</h2>'),
    ('<p class="body" style="font-size:14px;margin-top:12px">Exclusive offers, destination guides, and travel inspiration from our specialists.</p>',
     '<p class="body" style="font-size:14px;margin-top:12px" data-i18n="home.nlBody">Exclusive offers, destination guides, and travel inspiration from our specialists.</p>'),
    ('placeholder="Your email address..."', 'data-i18n-placeholder="home.nlPlaceholder" placeholder="Your email address..."'),
    # Footer
    ('<p class="ft-tag">"The world is a book, and those who do not travel read only one page."</p>',
     '<p class="ft-tag" data-i18n="footer.quote">"The world is a book, and those who do not travel read only one page."</p>'),
    ('<div class="ft-ch">Destinations</div>', '<div class="ft-ch" data-i18n="footer.destinations">Destinations</div>'),
    ('<div class="ft-ch">Packages</div>', '<div class="ft-ch" data-i18n="footer.packages">Packages</div>'),
    ('<div class="ft-ch">Company</div>', '<div class="ft-ch" data-i18n="footer.company">Company</div>'),
    ('<div class="ft-ch">Contact</div>', '<div class="ft-ch" data-i18n="footer.contact">Contact</div>'),
    ('<li><a onclick="go(\'about\')">About Us</a></li>', '<li><a onclick="go(\'about\')" data-i18n="footer.aboutUs">About Us</a></li>'),
    ('<li><a onclick="go(\'about\')">Our Team</a></li>', '<li><a onclick="go(\'about\')" data-i18n="footer.ourTeam">Our Team</a></li>'),
    ('<li><a onclick="go(\'faq\')">FAQ</a></li>', '<li><a onclick="go(\'faq\')" data-i18n="nav.faq">FAQ</a></li>'),
    ('>Travel Blog</a></li>', ' data-i18n="footer.travelBlog">Travel Blog</a></li>'),
    ('>Careers</a></li>', ' data-i18n="footer.careers">Careers</a></li>'),
    ('Licensed US Travel Agency</div>', '<span data-i18n="footer.licensed">Licensed US Travel Agency</span></div>'),
    ('<div class="ft-copy">© 2026 Martins Global Travels. All Rights Reserved.</div>',
     '<div class="ft-copy" data-i18n="footer.copyright">© 2026 Martins Global Travels. All Rights Reserved.</div>'),
    ('<a onclick="go(\'privacy\')">Privacy</a>', '<a onclick="go(\'privacy\')" data-i18n="common.privacy">Privacy</a>'),
    ('<a onclick="go(\'terms\')">Terms</a>', '<a onclick="go(\'terms\')" data-i18n="common.terms">Terms</a>'),
    ('<a onclick="goPrivacyCookies()">Cookies</a>', '<a onclick="goPrivacyCookies()" data-i18n="common.cookies">Cookies</a>'),
    ('<p style="font-size:11px;color:var(--dimmer);margin-top:12px;font-weight:300">No spam, ever. Unsubscribe any time.</p>',
     '<p style="font-size:11px;color:var(--dimmer);margin-top:12px;font-weight:300" data-i18n="footer.noSpam">No spam, ever. Unsubscribe any time.</p>'),
    ('onclick="toast((window.MartinsI18n&&MartinsI18n.t(\'toast.subscribed\'))||\'Subscribed! Welcome aboard.\')">Subscribe</button>',
     'onclick="toast((window.MartinsI18n&&MartinsI18n.t(\'toast.subscribed\'))||\'Subscribed! Welcome aboard.\')" data-i18n="common.subscribe">Subscribe</button>'),
    # Destinations page
    ('<div class="ph-ey">57 Top Destinations</div>', '<div class="ph-ey" data-i18n="dest.heroEyebrow">57 Top Destinations</div>'),
    ('<h1 class="ph-t">Explore the World<br><em>Without Limits</em></h1>',
     '<h1 class="ph-t" data-i18n-html="dest.heroTitleHtml">Explore the World<br><em>Without Limits</em></h1>'),
    ('<p class="ph-s">From secluded island hideaways to cosmopolitan capitals — every corner of the globe is within reach.</p>',
     '<p class="ph-s" data-i18n="dest.heroSub">From secluded island hideaways to cosmopolitan capitals — every corner of the globe is within reach.</p>'),
    ('onclick="filterDest(\'all\',this)">All (57)</button>', 'onclick="filterDest(\'all\',this)" data-i18n="dest.filterAll">All (57)</button>'),
    ('onclick="filterDest(\'beach\',this)">Beach &amp; Islands</button>', 'onclick="filterDest(\'beach\',this)" data-i18n="dest.filterBeach">Beach &amp; Islands</button>'),
    ('onclick="filterDest(\'safari\',this)">Safari &amp; Wilderness</button>', 'onclick="filterDest(\'safari\',this)" data-i18n="dest.filterSafari">Safari &amp; Wilderness</button>'),
    ('onclick="filterDest(\'culture\',this)">Culture &amp; History</button>', 'onclick="filterDest(\'culture\',this)" data-i18n="dest.filterCulture">Culture &amp; History</button>'),
    ('onclick="filterDest(\'adventure\',this)">Adventure</button>', 'onclick="filterDest(\'adventure\',this)" data-i18n="dest.filterAdventure">Adventure</button>'),
    ('onclick="filterDest(\'food\',this)">Food &amp; Wine</button>', 'onclick="filterDest(\'food\',this)" data-i18n="dest.filterFood">Food &amp; Wine</button>'),
    ('onclick="filterDest(\'city\',this)">City Breaks</button>', 'onclick="filterDest(\'city\',this)" data-i18n="dest.filterCity">City Breaks</button>'),
    ('id="destCount" style="padding:16px 52px;background:var(--ink2);border-bottom:1px solid var(--border);font-size:12px;color:var(--dimmer);letter-spacing:1px">Showing all 57 destinations</div>',
     'id="destCount" style="padding:16px 52px;background:var(--ink2);border-bottom:1px solid var(--border);font-size:12px;color:var(--dimmer);letter-spacing:1px" data-i18n="dest.countDefault">Showing all 57 destinations</div>'),
    # Tour enquire buttons (all)
    ('<button class="tcard-btn" onclick="go(\'contact\')">Enquire Now</button>',
     '<button class="tcard-btn" onclick="go(\'contact\')" data-i18n="common.enquireNow">Enquire Now</button>'),
    # go() i18n reapply on lang change
]

def main():
    html = INDEX.read_text(encoding="utf-8")
    count = 0
    for item in REPLACEMENTS:
        old, new = item[0], item[1]
        if old not in html:
            continue
        if len(item) > 2:
            html = html.replace(old, new, item[2])
        else:
            html = html.replace(old, new)
        count += 1
    INDEX.write_text(html, encoding="utf-8")
    print(f"Applied {count} replacements")

if __name__ == "__main__":
    main()
