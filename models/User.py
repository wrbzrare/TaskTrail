from .BaseModel import BaseModel

class User(BaseModel):
    table_name = "users"

    def __init__(self, id=None, login=None, password_hash=None,
                 surname=None, name=None, patronymic=None,
                 description=None, email=None, phone_number=None,
                 role='member', status='active', photo=None,
                 last_auth=None, created_at=None):
        super().__init__(id=id, login=login, password_hash=password_hash,
                         surname=surname, name=name, patronymic=patronymic,
                         description=description, email=email,
                         phone_number=phone_number, role=role, status=status,
                         photo=photo, last_auth=last_auth, created_at=created_at)

    @classmethod
    def get_role(cls, user_id):
        query = "SELECT role FROM users WHERE id = ?"
        cls.db.cursor.execute(query, (user_id,))
        row = cls.db.cursor.fetchone()
        return row[0] if row else None

    @classmethod
    def search_users(cls, q=None, limit=200):
        base = """
            SELECT id, surname, name, patronymic, email, phone_number, status, created_at
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

        cls.db.cursor.execute(query, params)
        rows = cls.db.cursor.fetchall()
        columns = [desc[0] for desc in cls.db.cursor.description]
        return [dict(zip(columns, row)) for row in rows]

    @classmethod
    def set_status(cls, user_id, status):
        cls.db.cursor.execute("SELECT id FROM users WHERE id = ?", (user_id,))
        if not cls.db.cursor.fetchone():
            return False
        cls.db.cursor.execute("UPDATE users SET status = ? WHERE id = ?", (status, user_id))
        cls.db.connection.commit()
        return True
