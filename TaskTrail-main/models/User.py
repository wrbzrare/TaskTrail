from datetime import datetime
from .BaseModel import BaseModel

class User(BaseModel):
    table_name = "users"

    def __init__(self, id=None, login=None, password_hash=None,
                 surname=None, name=None, patronymic=None,
                 description=None, email=None, phone_number=None,
                 role=None, status=None, photo=None,
                 last_auth=None, created_at=None):

        if created_at is None:
            created_at = datetime.utcnow()

        if role is None:
            role = 'member'

        if status is None:
            status = 'active'

        super().__init__(id=id, login=login, password_hash=password_hash,
                         surname=surname, name=name, patronymic=patronymic,
                         description=description, email=email,
                         phone_number=phone_number, role=role, status=status,
                         photo=photo, last_auth=last_auth, created_at=created_at)

    @classmethod
    def get_role(cls, user_id):
        cursor = cls.get_cursor()
        try:
            query = "SELECT role FROM users WHERE id = ?"
            cursor.execute(query, (user_id,))
            row = cursor.fetchone()
            return row[0] if row else None
        finally:
            cursor.close()

    @classmethod
    def search_users(cls, q=None, limit=200):
        cursor = cls.get_cursor()
        try:
            base = """
                SELECT id, surname, name, patronymic, email, phone_number, status, created_at, photo
                FROM users
            """
            if q:
                q_like = f"%{q}%"
                try:
                    possible_id = int(q)
                except Exception:
                    possible_id = None

                if possible_id:
                    query = base + " WHERE id = ? OR (surname || ' ' || name || ' ' || COALESCE(patronymic,'') LIKE ?) OR email LIKE ? ORDER BY created_at DESC LIMIT ?"
                    params = (possible_id, q_like, q_like, limit)
                else:
                    query = base + " WHERE (surname || ' ' || name || ' ' || COALESCE(patronymic,'') LIKE ?) OR email LIKE ? ORDER BY created_at DESC LIMIT ?"
                    params = (q_like, q_like, limit)
            else:
                query = base + " ORDER BY created_at DESC LIMIT ?"
                params = (limit,)

            cursor.execute(query, params)
            rows = cursor.fetchall()
            columns = [desc[0] for desc in cursor.description]
            return [dict(zip(columns, row)) for row in rows]
        finally:
            cursor.close()

    @classmethod
    def set_status(cls, user_id, status):
        cursor = cls.get_cursor()
        try:
            cursor.execute("SELECT id FROM users WHERE id = ?", (user_id,))
            if not cursor.fetchone():
                return False

            cursor.execute("UPDATE users SET status = ? WHERE id = ?", (status, user_id))
            cls.db.commit()
            return True
        finally:
            cursor.close()
