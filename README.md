# Eco Oil Connect

A multi-page website that connects hotels and cloud kitchens with used cooking oil to collectors, who deliver it to biofuel companies.

## Run it

Open `index.html` in a browser. Or, from this folder, run `python3 -m http.server 8000`.

## Pages

| File | Page | Who sees it |
| --- | --- | --- |
| index.html | Home | Everyone |
| about.html | About Us | Everyone |
| auth.html | Register / Login | Everyone |
| sell.html | Sell Used Oil | Restaurants |
| requests.html | Collection Requests | Any signed-in user |
| dashboard.html | Dashboard | Any signed-in user |
| admin.html | Admin Panel | Admin |
| contact.html | Contact Us | Everyone |

## Request status

Submitted, then Accepted (by a collector), then Picked up, then Delivered (to a named biofuel company). A collector can also reject a request.

## Rates and profit

The platform owner (admin) is the middleman. In the Admin Panel the admin sets two rates per litre: the **buying rate** paid to the restaurant (starts at ₹40) and the **selling rate** paid by the biofuel company (starts at ₹55). Each request keeps the rates in force when it was raised. For a delivered request, profit is litres times (selling rate minus buying rate), so 20 litres gives (55 - 40) x 20 = ₹300. Restaurants see their payment on the Sell Used Oil page and on each request. The admin sees totals for litres, money paid out, money received and profit in the Admin Panel and the Dashboard.

## Maps

The maps use OpenStreetMap through Leaflet, so no API key is needed and it works as long as the computer is online. On the Sell Used Oil page the restaurant types an address (the pin moves to it) or clicks the map to place a pin, and can drag the pin to fine-tune it. The Collection Requests page shows every request as a marker. Each request also has an "Open in Google Maps" link. The default map centre is set in `config.js`.

## Default admin login

Email `admin@ecooil.local`, password `admin123`. Change it in `app.js` before showing the project to anyone.

## Limits of this version

- Data is stored in the browser (localStorage), so each browser has its own users and requests. This is fine for a demo.
- Passwords are stored as plain text in that storage. Do not use real passwords.
- To make it a real system, replace the functions in the "data" section of `app.js` with calls to a backend and database (for example Firebase or Node with MongoDB), and hash passwords there.
- Address search uses the free OpenStreetMap Nominatim service, which is meant for light use like a demo.
