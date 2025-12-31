FROM python:3.12

WORKDIR /app

# 依存関係のインストール時にキャッシュを効かせる
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app/