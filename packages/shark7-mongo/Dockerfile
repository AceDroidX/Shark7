FROM mongo:latest
COPY replica.key /app/replica.key
RUN chmod 600 /app/replica.key
RUN chown 999:999 /app/replica.key

CMD ["mongod", "--replSet", "rs0", "--bind_ip_all", "--keyFile", "/app/replica.key"]