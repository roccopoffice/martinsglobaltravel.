#!/usr/bin/env python3
"""Apply data-i18n to about page and legal body paragraphs."""
from pathlib import Path

INDEX = Path(__file__).resolve().parent.parent / "index.html"

ABOUT = [
    ('<div class="tag">Our Story</div>', '<div class="tag" data-i18n="about.storyTag">Our Story</div>'),
    ('<h1 class="h2" style="font-size:clamp(40px,5vw,64px)">More Than a Travel<br>Agency. <em>A Vision.</em></h1>',
     '<h1 class="h2" style="font-size:clamp(40px,5vw,64px)" data-i18n-html="about.storyTitleHtml">More Than a Travel<br>Agency. <em>A Vision.</em></h1>'),
    ('<p class="body">Built on the belief that every traveler deserves a truly personal experience — not a package, not a template, but a journey crafted entirely around you.</p>',
     '<p class="body" data-i18n="about.storyBody">Built on the belief that every traveler deserves a truly personal experience — not a package, not a template, but a journey crafted entirely around you.</p>'),
    ('onclick="go(\'contact\')">Plan Your Journey', 'onclick="go(\'contact\')" data-i18n="about.planJourney">Plan Your Journey'),
    ('<div class="tag">Who We Are</div>', '<div class="tag" data-i18n="about.whoTag">Who We Are</div>'),
    ('<h2 class="h2" style="font-size:clamp(30px,3.5vw,46px);margin-bottom:28px">Passion for Travel<br><em>in Our DNA</em></h2>',
     '<h2 class="h2" style="font-size:clamp(30px,3.5vw,46px);margin-bottom:28px" data-i18n-html="about.whoTitleHtml">Passion for Travel<br><em>in Our DNA</em></h2>'),
    ('<p>Martins Global Travels was born from a single belief:', '<p data-i18n="about.whoP1">Martins Global Travels was born from a single belief:'),
    ('<p>Our team of specialist travel designers is passionate', '<p data-i18n="about.whoP2">Our team of specialist travel designers is passionate'),
    ('<p>From meticulously selecting the perfect hotel', '<p data-i18n="about.whoP3">From meticulously selecting the perfect hotel'),
    ('<div class="apillar-n">Vision</div>', '<div class="apillar-n" data-i18n="about.pillarVision">Vision</div>'),
    ('<div class="apillar-t">Your Journey, Our Passion</div>', '<div class="apillar-t" data-i18n="about.pillarVisionT">Your Journey, Our Passion</div>'),
    ('<div class="apillar-d">Every trip reflects our deep love of travel', '<div class="apillar-d" data-i18n="about.pillarVisionD">Every trip reflects our deep love of travel'),
    ('<div class="apillar-n">Approach</div>', '<div class="apillar-n" data-i18n="about.pillarApproach">Approach</div>'),
    ('<div class="apillar-t">Handcrafted, Not Automated</div>', '<div class="apillar-t" data-i18n="about.pillarApproachT">Handcrafted, Not Automated</div>'),
    ('<div class="apillar-d">No algorithms, no generic templates.', '<div class="apillar-d" data-i18n="about.pillarApproachD">No algorithms, no generic templates.'),
    ('<div class="apillar-n">Reach</div>', '<div class="apillar-n" data-i18n="about.pillarReach">Reach</div>'),
    ('<div class="apillar-t">120+ Destinations Worldwide</div>', '<div class="apillar-t" data-i18n="about.pillarReachT">120+ Destinations Worldwide</div>'),
    ('<div class="apillar-d">From hidden tropical coves to buzzing cultural capitals', '<div class="apillar-d" data-i18n="about.pillarReachD">From hidden tropical coves to buzzing cultural capitals'),
    ('<div class="apillar-n">Promise</div>', '<div class="apillar-n" data-i18n="about.pillarPromise">Promise</div>'),
    ('<div class="apillar-t">Always There For You</div>', '<div class="apillar-t" data-i18n="about.pillarPromiseT">Always There For You</div>'),
    ('<div class="apillar-d">24/7 support before, during, and after your trip.', '<div class="apillar-d" data-i18n="about.pillarPromiseD">24/7 support before, during, and after your trip.'),
    ('<div class="tag">Our Values</div>', '<div class="tag" data-i18n="about.valuesTag">Our Values</div>'),
    ('<h2 class="h2">Principles That<br>Guide <em>Everything</em></h2>', '<h2 class="h2" data-i18n-html="about.valuesTitleHtml">Principles That<br>Guide <em>Everything</em></h2>'),
    ('<div class="vcard-t">Authenticity First</div>', '<div class="vcard-t" data-i18n="about.val1t">Authenticity First</div>'),
    ('<p class="vcard-d">We design experiences connecting you with real culture', '<p class="vcard-d" data-i18n="about.val1d">We design experiences connecting you with real culture'),
    ('<div class="vcard-t">Relentless Excellence</div>', '<div class="vcard-t" data-i18n="about.val2t">Relentless Excellence</div>'),
    ('<p class="vcard-d">Every hotel inspected, every guide trained', '<p class="vcard-d" data-i18n="about.val2d">Every hotel inspected, every guide trained'),
    ('<div class="vcard-t">Responsible Travel</div>', '<div class="vcard-t" data-i18n="about.val3t">Responsible Travel</div>'),
    ('<p class="vcard-d">We carefully select responsible operators and are committed to sustainable', '<p class="vcard-d" data-i18n="about.val3d">We carefully select responsible operators and are committed to sustainable'),
    ('<div class="vcard-t">Total Transparency</div>', '<div class="vcard-t" data-i18n="about.val4t">Total Transparency</div>'),
    ('<p class="vcard-d">No hidden fees, no surprises.', '<p class="vcard-d" data-i18n="about.val4d">No hidden fees, no surprises.'),
    ('<div class="vcard-t">Human Connection</div>', '<div class="vcard-t" data-i18n="about.val5t">Human Connection</div>'),
    ('<p class="vcard-d">Real specialists, real conversations', '<p class="vcard-d" data-i18n="about.val5d">Real specialists, real conversations'),
    ('<div class="vcard-t">Your Journey, Always</div>', '<div class="vcard-t" data-i18n="about.val6t">Your Journey, Always</div>'),
    ('<p class="vcard-d">We build each trip entirely around you', '<p class="vcard-d" data-i18n="about.val6d">We build each trip entirely around you'),
    ('<div class="tag">Our Commitments</div>', '<div class="tag" data-i18n="about.commitTag">Our Commitments</div>'),
    ('<h2 class="h2" style="font-size:clamp(28px,3.5vw,42px)">What You Can Always <em>Expect From Us</em></h2>',
     '<h2 class="h2" style="font-size:clamp(28px,3.5vw,42px)" data-i18n-html="about.commitTitleHtml">What You Can Always <em>Expect From Us</em></h2>'),
    ('<p class="body" style="max-width:360px;font-size:15px">These aren\'t awards — they\'re promises.',
     '<p class="body" style="max-width:360px;font-size:15px" data-i18n="about.commitLead">These aren\'t awards — they\'re promises.'),
    ('<div class="commit-title">Fully Insured &amp; Licensed</div>', '<div class="commit-title" data-i18n="about.c1t">Fully Insured &amp; Licensed</div>'),
    ('<p class="commit-desc">We are a fully licensed US travel agency carrying professional liability insurance.',
     '<p class="commit-desc" data-i18n="about.c1d">We are a fully licensed US travel agency carrying professional liability insurance.'),
    ('<div class="commit-title">24/7 Real Human Support</div>', '<div class="commit-title" data-i18n="about.c2t">24/7 Real Human Support</div>'),
    ('<p class="commit-desc">Not a chatbot. Not a call centre.', '<p class="commit-desc" data-i18n="about.c2d">Not a chatbot. Not a call centre.'),
    ('<div class="commit-title">Personally Recommended Only</div>', '<div class="commit-title" data-i18n="about.c3t">Personally Recommended Only</div>'),
    ('<p class="commit-desc">We never recommend a hotel, guide, or experience we haven\'t personally visited.',
     '<p class="commit-desc" data-i18n="about.c3d">We never recommend a hotel, guide, or experience we haven\'t personally visited.'),
    ('<div class="commit-title">Best Price Guarantee</div>', '<div class="commit-title" data-i18n="about.c4t">Best Price Guarantee</div>'),
    ('<p class="commit-desc">Find the same trip cheaper elsewhere and we\'ll match it.',
     '<p class="commit-desc" data-i18n="about.c4d">Find the same trip cheaper elsewhere and we\'ll match it.'),
    ('<div class="commit-title">Fully Bespoke, Always</div>', '<div class="commit-title" data-i18n="about.c5t">Fully Bespoke, Always</div>'),
    ('<p class="commit-desc">No two trips are the same. Every itinerary is built from scratch',
     '<p class="commit-desc" data-i18n="about.c5d">No two trips are the same. Every itinerary is built from scratch'),
    ('<div class="commit-title">Responsible Travel</div>', '<div class="commit-title" data-i18n="about.c6t">Responsible Travel</div>'),
    ('<p class="commit-desc">We carefully select responsible operators and are committed to giving back',
     '<p class="commit-desc" data-i18n="about.c6d">We carefully select responsible operators and are committed to giving back'),
]

LEGAL = [
    ('<p>Martins Global Travels ("we," "us," or "our") respects your privacy.', '<p data-i18n="privacy.introP1">Martins Global Travels ("we," "us," or "our") respects your privacy.'),
    ('<p>By using our website or providing information to us, you agree to this policy.', '<p data-i18n="privacy.introP2">By using our website or providing information to us, you agree to this policy.'),
    ('<p>Depending on how you interact with us, we may collect:</p>', '<p data-i18n="privacy.collectP">Depending on how you interact with us, we may collect:</p>'),
    ('<li><strong>Contact and identity data:</strong>', '<li data-i18n="privacy.collectL1"><strong>Contact and identity data:</strong>'),
    ('<li><strong>Trip and preference data:</strong>', '<li data-i18n="privacy.collectL2"><strong>Trip and preference data:</strong>'),
    ('<li><strong>Payment-related data:</strong>', '<li data-i18n="privacy.collectL3"><strong>Payment-related data:</strong>'),
    ('<li><strong>Communications:</strong>', '<li data-i18n="privacy.collectL4"><strong>Communications:</strong>'),
    ('<li><strong>Technical and usage data:</strong>', '<li data-i18n="privacy.collectL5"><strong>Technical and usage data:</strong>'),
    ('<p>We use personal information to:</p>', '<p data-i18n="privacy.useP">We use personal information to:</p>'),
    ('<li>Respond to enquiries and provide travel consultations;</li>', '<li data-i18n="privacy.useL1">Respond to enquiries and provide travel consultations;</li>'),
    ('<li>Research, plan, price, book, and manage travel arrangements', '<li data-i18n="privacy.useL2">Research, plan, price, book, and manage travel arrangements'),
    ('<li>Process payments and send related notices;</li>', '<li data-i18n="privacy.useL3">Process payments and send related notices;</li>'),
    ('<li>Send service-related messages and, where permitted, marketing communications', '<li data-i18n="privacy.useL4">Send service-related messages and, where permitted, marketing communications'),
    ('<li>Improve our website, services, and customer experience;</li>', '<li data-i18n="privacy.useL5">Improve our website, services, and customer experience;</li>'),
    ('<li>Comply with legal obligations, enforce our terms, and protect rights, safety, and security.</li>', '<li data-i18n="privacy.useL6">Comply with legal obligations, enforce our terms, and protect rights, safety, and security.</li>'),
    ('<p>If applicable law requires a "legal basis" for processing', '<p data-i18n="privacy.legalP">If applicable law requires a "legal basis" for processing'),
    ('<p>We may share personal information with:</p>', '<p data-i18n="privacy.shareP">We may share personal information with:</p>'),
    ('<li><strong>Suppliers and partners</strong> who fulfill or support your travel', '<li data-i18n="privacy.shareL1"><strong>Suppliers and partners</strong> who fulfill or support your travel'),
    ('<li><strong>Service providers</strong> that assist us', '<li data-i18n="privacy.shareL2"><strong>Service providers</strong> that assist us'),
    ('<li><strong>Professional advisers</strong> when required', '<li data-i18n="privacy.shareL3"><strong>Professional advisers</strong> when required'),
    ('<li><strong>Authorities</strong> when required by law', '<li data-i18n="privacy.shareL4"><strong>Authorities</strong> when required by law'),
    ('<p>We do not sell your personal information for monetary consideration', '<p data-i18n="privacy.shareP2">We do not sell your personal information for monetary consideration'),
    ('<p>We and our partners may use cookies, pixels, and similar technologies', '<p data-i18n="privacy.cookiesP">We and our partners may use cookies, pixels, and similar technologies'),
    ('<p>We retain personal information only as long as needed', '<p data-i18n="privacy.retentionP">We retain personal information only as long as needed'),
    ('<p>We implement reasonable administrative, technical, and organizational measures', '<p data-i18n="privacy.securityP">We implement reasonable administrative, technical, and organizational measures'),
    ('<p>Depending on where you live, you may have rights to access, correct, delete', '<p data-i18n="privacy.rightsP">Depending on where you live, you may have rights to access, correct, delete'),
    ('<p>If you are located outside the United States, your information may be transferred', '<p data-i18n="privacy.intlP">If you are located outside the United States, your information may be transferred'),
    ('<p>Our services are not directed to children under 16', '<p data-i18n="privacy.childrenP">Our services are not directed to children under 16'),
    ('<p>We may update this Privacy Policy from time to time.', '<p data-i18n="privacy.changesP">We may update this Privacy Policy from time to time.'),
    ('<p>For privacy-related questions or requests, contact Martins Global Travels using the details on our <a onclick="go(\'contact\')">Contact</a> page.</p>',
     '<p data-i18n="privacy.contactP">For privacy-related questions or requests, contact Martins Global Travels using the details on our <a onclick="go(\'contact\')" data-i18n="privacy.contactLink">Contact</a> page.</p>'),
]

TERMS = [
    ('<p class="legal-note">These terms are a general template.', '<div class="legal-note" data-i18n="terms.note">These terms are a general template.'),
    ('<p>These Terms of Service ("Terms") govern your access', '<p data-i18n="terms.agreeP">These Terms of Service ("Terms") govern your access'),
    ('<p>Martins Global Travels is a travel agency. We assist in researching', '<p data-i18n="terms.roleP">Martins Global Travels is a travel agency. We assist in researching'),
    ('<p>You represent that you are at least 18 years old', '<p data-i18n="terms.eligP">You represent that you are at least 18 years old'),
    ('<p>When travel is booked, separate terms and conditions apply', '<p data-i18n="terms.bookP">When travel is booked, separate terms and conditions apply'),
    ('<p>Quotes are estimates unless confirmed in writing.', '<p data-i18n="terms.feesP">Quotes are estimates unless confirmed in writing.'),
    ('<p>Cancellation, change, and refund rules depend on supplier terms', '<p data-i18n="terms.cancelP">Cancellation, change, and refund rules depend on supplier terms'),
    ('<p>We strongly recommend comprehensive travel insurance. Insurance is subject to the insurer\'s policy terms.', '<p data-i18n="terms.insP">We strongly recommend comprehensive travel insurance. Insurance is subject to the insurer\'s policy terms.'),
    ('<p>Information on our website (including sample itineraries', '<p data-i18n="terms.discP">Information on our website (including sample itineraries'),
    ('<p>To the fullest extent permitted by applicable law, Martins Global Travels and our officers', '<p data-i18n="terms.liabP">To the fullest extent permitted by applicable law, Martins Global Travels and our officers'),
    ('<p>You agree to indemnify and hold harmless Martins Global Travels', '<p data-i18n="terms.indemP">You agree to indemnify and hold harmless Martins Global Travels'),
    ('<p>Content on this website (including text, graphics, logos, and design)', '<p data-i18n="terms.ipP">Content on this website (including text, graphics, logos, and design)'),
    ('<p>These Terms are governed by the laws of the State in which Martins Global Travels', '<p data-i18n="terms.govP">These Terms are governed by the laws of the State in which Martins Global Travels'),
    ('<p>We may modify these Terms at any time. The updated Terms will be posted on this page with a revised "Last updated" date. Continued use after changes constitutes acceptance of the revised Terms, except where applicable law requires additional notice or consent.</p>',
     '<p data-i18n="terms.chgP">We may modify these Terms at any time. The updated Terms will be posted on this page with a revised "Last updated" date. Continued use after changes constitutes acceptance of the revised Terms, except where applicable law requires additional notice or consent.</p>'),
    ('<p>For questions about these Terms, contact us via our <a onclick="go(\'contact\')">Contact</a> page.</p>',
     '<p data-i18n="terms.contactP">For questions about these Terms, contact us via our <a onclick="go(\'contact\')" data-i18n="terms.contactLink">Contact</a> page.</p>'),
]

def main():
    html = INDEX.read_text(encoding="utf-8")
    n = 0
    for item in ABOUT + LEGAL + TERMS:
        old, new = item[0], item[1]
        if old in html:
            html = html.replace(old, new, item[2] if len(item) > 2 else -1)
            n += 1
    # terms updated meta on terms page only - find second legal-meta
    html = html.replace(
        '<div class="page" id="page-terms">\n  <div class="ph">',
        '<div class="page" id="page-terms">\n  <div class="ph">',
    )
    # Fix terms legal-meta
    parts = html.split('id="page-terms"')
    if len(parts) == 2:
        terms_section = parts[1]
        terms_section = terms_section.replace(
            '<p class="legal-meta" data-i18n="privacy.updated">',
            '<p class="legal-meta" data-i18n="terms.updated">',
            1,
        )
        terms_section = terms_section.replace(
            '<div class="legal-note" data-i18n="privacy.note">',
            '<div class="legal-note" data-i18n="terms.note">',
            1,
        )
        html = parts[0] + 'id="page-terms"' + terms_section

    INDEX.write_text(html, encoding="utf-8")
    print(f"Applied {n} about/legal replacements")

if __name__ == "__main__":
    main()
