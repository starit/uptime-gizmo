# An API reference in the product, and three interface repairs

Commits `5d7e54a3`, `187cdcba`, `f47abc88`, `b37f9dda`, `73d2fe92`, `bcf46821`,
`0158c465`.

## The API reference

Settings gains a page that renders `/api/v1/openapi.json`.

**Not written by hand.** The document is generated from the router's own field
tables, so it cannot describe a field the code lacks, and a test compares its
paths against the registered routes in both directions. Prose written beside that
would inherit none of it and would start lying within a release or two.

**Not a bundled viewer.** Swagger UI and its peers are each roughly the size of
this application's entire bundle — which is already 2.3 MB — and each arrives with
a visual language that would have to be fought into the theme, for twenty-three
endpoints and five schemas. Rendering the document directly costs **5.5 KB**,
lazily loaded, and looks like the rest of the product in both themes.

That choice has one real cost. A construct the generator starts emitting and the
page does not handle would not fail; it would render nothing where a parameter or
a whole request body should be. So the handled constructs are written down in a
test, and anything new — `oneOf`, `allOf`, `additionalProperties`, a non-JSON
body, a dangling `$ref` — fails it. Verified by adding `deprecated`, `tags` and
`oneOf` to the generator and watching it break.

**No "try it out".** Executing from the page would mean the reader pasting an API
key into it, and a reference is the wrong place to hold a credential. Each
endpoint carries a copy-ready `curl` built against the instance's own origin,
with the key left as a shell variable.

## Pagination had no styling at all

`v-pagination-3` emits Bootstrap's markup — `.pagination`, `.page-item`,
`.page-link` — and took all of its appearance from Bootstrap's stylesheet. The
migration removed the stylesheet and nothing replaced those rules, so with
Preflight also stripping the list, the pager rendered as **a bare column of
numbers**, one per line. It affected the dashboard's event list and the monitor
detail page.

Styled from the tokens, keyed on the component's own classes so it holds wherever
the component is used.

`:not(.active)` on the hover rule is load-bearing rather than tidiness: two
pseudo-classes outrank the single class beneath them, so hovering the current page
swapped its brand background for the plain one while keeping the text colour
chosen to sit on brand — leaving the number you are standing on the least readable
thing in the row. Measured under a real hover afterwards: 7.6:1 light, 12.7:1 dark.

## A calendar that could not be clicked

Choosing an expiry date for an API key did nothing. The calendar opened, sat above
everything, and passed every click straight through.

A modal dialog sets `pointer-events: none` on the body and restores it only on
itself, so nothing behind it can be clicked. The datepicker teleports its menu to
the body, which puts the calendar outside the dialog and therefore inside the part
that was switched off. Nothing threw and nothing warned — indistinguishable from
the field being broken.

**Chromium's own hit testing identified it**: clicks on a date cell reported the
dialog header as the element receiving them.

Two things found alongside and deliberately not changed: Escape closes the dialog
as well as the calendar, because the menu sits outside the dialog and the key
reaches its dismissable layer; and a date only commits when Select is pressed,
which is the component's behaviour for a picker that includes a time.

## Toasts

The toast was the one surface that ignored the theme — a saturated Material green
over the dark page as over the light one, because the tone came entirely from the
fill. It is an ordinary panel now, with the tone on the icon and the
remaining-time strip.

Two things were measured rather than eyeballed. The glyph took the base status
hue, which on a white card managed **3.07:1** inside its own tinted disc — the
weakest thing in the set and weaker than the red beside it, so success read as the
fainter signal. It takes the `-fg` variant now: 5.86:1 against red's 5.22:1. And
the timer strip was held at half opacity, which washed the green down to roughly
1.9:1 — the one place the colour had to survive and the place it was faintest.

The first contrast measurement was wrong: dark tokens live on `body.dark`, and
reading them from `documentElement` returned the light values, producing a
nonsensical 1.03:1 for body text.

The dismiss control was revealed only on hover, leaving keyboard and touch users
with a button they cannot see they have. Fixed through the plugin's own option
rather than a specificity fight with its stylesheet, which won that fight first.

## The mascot

An empty instance showed five zeroes above an empty table — a screen reporting
emptiness without saying what to do about it.

The artwork needed its studio backdrop removed, which is more than a white key:
the character's shirt is cream. Flooding in from the border handled that, and
three things needed handling beyond it. The threshold had to be tightened to 240,
because at 200 the flood leaked through the bright edge of a sleeve and ate across
the whole shirt — invisible on a white page, torn holes on a dark one. White
enclosed by the character is cleared from named seed points, because every rule
tried also matched the specular highlights on the sleeve, which are just as bright
and just as neutral. And the contact shadow is painted as light grey, so over a
dark page it is a pale smear that no opacity setting fixes; it is removed and the
page casts its own.

1.23 MB of opaque PNG became **43 KB** of WebP. The script is committed because
the asset is otherwise unreproducible.

## Translations

The repository's convention is that developers touch only `en.json` and Weblate
carries the rest, so everything added this session rendered as English. Filled in
for nine languages; the rest still fall back.

This turned up a string that had never worked. Three labels called
`$t("optional")` and no locale defines that key — not even `en.json` — so vue-i18n
rendered the key name, which happens to read as the English word and therefore
looked correct in every language. An earlier check missed it because it only
looked for camel-case key names.
