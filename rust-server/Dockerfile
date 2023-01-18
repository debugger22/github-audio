FROM rust:1.66 as build-env

# Create working directory
RUN mkdir /rust-server

COPY . /rust-server

# Set working directory
WORKDIR /rust-server

RUN cargo build --release

FROM gcr.io/distroless/cc
COPY --from=build-env /rust-server/target/release/rust-server /app
COPY --from=build-env /rust-server/.env /.env

EXPOSE 8000

CMD ["./app"]
