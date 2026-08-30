from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Semua konfigurasi aplikasi diambil dari environment variable.
    Prinsip 12-factor app: config terpisah dari kode, tidak di-hardcode.
    """

    database_url: str = "postgresql+psycopg://twoppals:twoppals@localhost:5432/twoppals"

    jwt_secret_key: str = "change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60

    api_v1_prefix: str = "/api/v1"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
