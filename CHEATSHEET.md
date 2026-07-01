# CupAtlas Cheatsheet

## Start local website

```bash
python3 -m http.server 8000 --bind 0.0.0.0 -d docs
```

If you get:

```text
OSError: [Errno 98] Address already in use
```

the server is already running.

---

## Check JavaScript syntax

```bash
node -c docs/app.js
```

---

## Update local repository

```bash
git pull
```

---

## Commit changes

```bash
git add .
git commit -m "Describe your changes"
git push
```
## Open CupAtlas

1. Start the server

```bash
python3 -m http.server 8000 --bind 0.0.0.0 -d docs
