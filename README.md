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

## Google Maps

1. In Google Cloud Console, create a project and turn on **Maps JavaScript API** and **Geocoding API**.
2. Create an API key and restrict it to your website address.
3. Paste it into `config.js`.

With the key set, the Sell Used Oil page has a map where the restaurant finds or drops a pin for its address, and the Collection Requests page shows every request as a marker. Without a key the site still works, and each request has an "Open in Google Maps" link.

## Default admin login

Email `admin@ecooil.local`, password `admin123`. Change it in `app.js` before showing the project to anyone.

## Limits of this version

- Data is stored in the browser (localStorage), so each browser has its own users and requests. This is fine for a demo.
- Passwords are stored as plain text in that storage. Do not use real passwords.
- To make it a real system, replace the functions in the "data" section of `app.js` with calls to a backend and database (for example Firebase or Node with MongoDB), and hash passwords there.
- The map markers use the classic Google Maps marker, which Google has marked deprecated but still supports.
