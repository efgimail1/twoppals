from app.core.models import Business, Role, User
from app.core.security import hash_password
from app.database import SessionLocal

DEFAULT_OWNER_EMAIL = "owner@twoppals.com"
DEFAULT_OWNER_PASSWORD = "owner123"


def run():
    db = SessionLocal()
    try:
        if not db.query(Role).filter_by(name="owner").first():
            db.add(Role(name="owner"))
        if not db.query(Role).filter_by(name="staff").first():
            db.add(Role(name="staff"))
        db.commit()

        if not db.query(Business).filter_by(code="cobi_kerupuk").first():
            db.add(
                Business(code="cobi_kerupuk", name="Cobi Kerupuk", icon="ti-bowl-spoon")
            )
        if not db.query(Business).filter_by(code="inventory").first():
            db.add(Business(code="inventory", name="Inventory", icon="ti-boxes"))
        db.commit()

        if not db.query(User).filter_by(email=DEFAULT_OWNER_EMAIL).first():
            owner_role = db.query(Role).filter_by(name="owner").first()
            db.add(
                User(
                    full_name="Owner",
                    email=DEFAULT_OWNER_EMAIL,
                    hashed_password=hash_password(DEFAULT_OWNER_PASSWORD),
                    role_id=owner_role.id,
                )
            )
            db.commit()
            print(
                f"Akun owner dibuat -> {DEFAULT_OWNER_EMAIL} / {DEFAULT_OWNER_PASSWORD}"
            )
        else:
            print("Akun owner sudah ada.")
        print("Seed data selesai.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
