# Рендер-воркер YOOMP: Node, ffmpeg, Python и headless Chrome для библиотеки lemo-opuscar.
FROM node:22-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg python3 python3-venv python3-pip git ca-certificates fonts-noto-core fonts-noto-cjk fonts-dejavu \
    && rm -rf /var/lib/apt/lists/*

# Библиотека стилей и её зависимости: ядро и голос (edge-tts для русского, whisper для проверки речи).
ENV LEMO_OPUSCAR_HOME=/opt/lemo-opuscar
RUN git clone --depth 1 https://github.com/lemomo-ai/lemo-opuscar.git /opt/lemo-opuscar \
    && cd /opt/lemo-opuscar \
    && sh plugin/skills/lemo-opuscar/scripts/setup.sh deps voice music \
    && node node_modules/playwright-core/cli.js install-deps chromium

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY index.mjs ./

ENV LIB=/opt/lemo-opuscar WORK=/work
CMD ["node", "index.mjs"]
