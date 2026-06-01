FROM python:3.12-slim

WORKDIR /app

RUN pip install --no-cache-dir pymongo>=4.6.0

COPY scripts/seed_demo_data.py /app/seed_demo_data.py

ENTRYPOINT ["python", "/app/seed_demo_data.py"]
