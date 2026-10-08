# How This Site Is Secured

## Data Encryption

My website, https://michaeljportfolio.me, uses HTTPS to protect information traveling between a visitor's browser and my server. HTTPS uses TLS (Transport Layer Security) to encrypt the connection so that someone intercepting the network traffic cannot easily read or modify the information being sent.

Visitors can verify the connection themselves using Google Chrome. By clicking the site controls icon next to the URL, they can select "Connection is secure" and view the website's certificate. Chrome checks that the certificate is valid, matches the website's domain name, and was issued by a trusted certificate authority.

## Certificate Info

My certificate was issued by a nonprofit certificate authority called Let's Encrypt. It covers both michaeljportfolio.me and www.michaeljportfolio.me, so visitors get a valid certificate whichever name they use. It is valid for 90 days from when I got it, so it expires on January 6, 2027 (UTC).

My server uses Certbot to manage certificate renewal. To prevent the certificate from expiring, Certbot automatically renews it once it is within 30 days of expiring, so I don't have to request a new certificate every 90 days. My renewal test shows that Certbot went through a full renewal against the Let's Encrypt test server, meaning the dry run succeeded. The timer check shows that Certbot's timer is enabled and active and that it runs twice a day.

Renewal test result:

```
$ sudo certbot renew --dry-run
Congratulations, all simulated renewals succeeded:
  /etc/letsencrypt/live/michaeljportfolio.me/fullchain.pem (success)
```

Timer check:

```
$ systemctl list-timers certbot.timer
NEXT                         LEFT  LAST                         PASSED       UNIT           ACTIVATES
Fri 2026-10-09 06:34:49 UTC  14h   Thu 2026-10-08 14:49:09 UTC  1h 8min ago  certbot.timer  certbot.service

$ systemctl is-enabled certbot.timer; systemctl is-active certbot.timer
enabled
active

$ grep OnCalendar /lib/systemd/system/certbot.timer
OnCalendar=*-*-* 00,12:00:00
RandomizedDelaySec=43200
```

## Network Ports

- **Port 22** is open for SSH so I can remotely log in to my VM from my laptop. The firewall rule allows only my laptop's IP address, not the whole internet.
- **Port 80** is an unencrypted endpoint. Nginx uses it to redirect visitors to HTTPS, and Let's Encrypt uses it to verify that I control my domain.
- **Port 443** is the HTTPS port used to create an encrypted connection between visitors and the website.
- **Ports 8000 and 8001** are where my Next.js app runs, but they are only accessible inside the VM, not from the internet.

## Encryption Start and End

The process starts when the browser makes a connection with Nginx and tells it which site it wants to go to. Nginx sends my site's certificate, and my browser verifies it. After verification, encryption begins when the browser and Nginx agree on encryption keys that only they know, through a TLS handshake. Every request and response after that is encrypted using these keys.

The encryption ends at Nginx, which decrypts the data and sends it to the Next.js app on my VM. This hop uses plain HTTP, which is acceptable because it happens only inside my VM (on 127.0.0.1) and never crosses a network.

## Site Security Verification

Visitors can check my site's security by going to my site in their browser and clicking the site controls icon next to the domain in the address bar. If they see "Connection is secure" and "Certificate is valid," it means their connection to my site is encrypted and they are connected to the real michaeljportfolio.me.

## OpenSSL

```
$ openssl s_client -connect michaeljportfolio.me:443 -servername michaeljportfolio.me </dev/null 2>/dev/null | openssl x509 -noout -subject -issuer -dates
subject=CN = michaeljportfolio.me
issuer=C = US, O = Let's Encrypt, CN = YE2
notBefore=Oct  8 02:25:09 2026 GMT
notAfter=Jan  6 02:25:08 2027 GMT
```

The output confirms the certificate's subject, its issuing authority, and its validity dates, proving that my website has the correct certificate.
