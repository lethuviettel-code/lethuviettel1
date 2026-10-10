FROM python:3.12-slim@sha256:a6e34c598f2467ed0e9a8d349809fcd8b5c603269512df273a0bb1784edc11b1
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 DATA_DIR=/data SECURE_COOKIES=1
WORKDIR /app
COPY requirements.txt .
COPY .docker-wheels /wheels
RUN set -eu; set -- /wheels/*.whl; if [ -f "$1" ]; then pip install --no-cache-dir --no-index --find-links=/wheels -r requirements.txt; else pip install --no-cache-dir -r requirements.txt; fi; \
    useradd --uid 10001 --create-home store && mkdir /data && chown store:store /data
COPY --chown=store:store server.py app.js admin.js index.html admin.html styles.css admin.css favicon.svg ./
COPY --chown=store:store assets ./assets
USER store
EXPOSE 3000
CMD ["gunicorn", "--bind", "0.0.0.0:3000", "--workers", "2", "--threads", "4", "--timeout", "60", "server:app"]
