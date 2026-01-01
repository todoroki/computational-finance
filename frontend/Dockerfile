FROM node:24

WORKDIR /app

# パッケージ定義を先にコピーしてインストール（キャッシュ効率のため）
# COPY package.json package-lock.json* ./
# RUN npm install

# ソースコードをコピー
COPY . .

# 開発サーバー起動
CMD ["npm", "run", "dev"]
