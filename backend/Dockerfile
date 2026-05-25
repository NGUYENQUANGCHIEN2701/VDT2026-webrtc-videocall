# Stage 1: Build
FROM eclipse-temurin:17-jdk-jammy AS builder
WORKDIR /opt/app

# Download dependencies first (layer cache: only re-downloads when pom.xml changes)
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN ./mvnw dependency:go-offline -q

# Build the application
COPY src/ ./src/
RUN ./mvnw clean package -DskipTests -q

# Stage 2: Runtime (JRE only — smaller image ~277MB vs ~450MB for JDK)
FROM eclipse-temurin:17-jre-jammy
WORKDIR /opt/app
EXPOSE 8080

# Non-root user for security
RUN groupadd -r appgroup && useradd -r -g appgroup appuser
USER appuser

COPY --from=builder /opt/app/target/*.jar ./app.jar
ENTRYPOINT ["java", "-jar", "/opt/app/app.jar"]
