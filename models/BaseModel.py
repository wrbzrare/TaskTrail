from db import Database

class BaseModel:
    """
    Базовая модель, предоставляющая общие методы для работы с БД.
    """
    table_name = None
    db = Database()

    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)

    @classmethod
    def get_by_id(cls, record_id):
        query = f"SELECT * FROM {cls.table_name} WHERE id = ?"
        cls.db.cursor.execute(query, (record_id,))
        row = cls.db.cursor.fetchone()
        if row:
            columns = [desc[0] for desc in cls.db.cursor.description]
            return cls(**dict(zip(columns, row)))
        return None

    @classmethod
    def get_all(cls):
        query = f"SELECT * FROM {cls.table_name}"
        cls.db.cursor.execute(query)
        rows = cls.db.cursor.fetchall()
        columns = [desc[0] for desc in cls.db.cursor.description]
        return [cls(**dict(zip(columns, row))) for row in rows]

    def save(self):

        data = self.__dict__.copy()
        
        is_update = hasattr(self, 'id') and self.id is not None
        
        if is_update:
            object_id = data.pop('id')
            
            columns_to_update = []
            values_to_update = []
            
            for field_name, field_value in data.items():
                columns_to_update.append(f"{field_name}=?")
                values_to_update.append(field_value)
            
            values_to_update.append(object_id)
            
            set_clause = ", ".join(columns_to_update)
            query = f"UPDATE {self.table_name} SET {set_clause} WHERE id = ?"
            
        else:
            data_for_insert = {}
            for field_name, field_value in data.items():
                if field_value is not None:
                    data_for_insert[field_name] = field_value
            
            if not data_for_insert:
                query = f"INSERT INTO {self.table_name} DEFAULT VALUES"
                values_to_update = []
            else:
                columns = ", ".join(data_for_insert.keys())
                placeholders = ", ".join(["?"] * len(data_for_insert))
                values_to_update = list(data_for_insert.values())
                
                query = f"INSERT INTO {self.table_name} ({columns}) VALUES ({placeholders})"
        
        self.db.cursor.execute(query, values_to_update)
        self.db.connection.commit()
        
        if not is_update:
            self.id = self.db.cursor.lastrowid

    @classmethod
    def find_one(cls, field, value):
        query = f"SELECT * FROM {cls.table_name} WHERE {field} = ? LIMIT 1"
        cls.db.cursor.execute(query, (value,))
        row = cls.db.cursor.fetchone()

        if not row:
            return None

        columns = [col[0] for col in cls.db.cursor.description]
        data = dict(zip(columns, row))
        return cls(**data)

    def delete(self):
        if getattr(self, "id", None):
            query = f"DELETE FROM {self.table_name} WHERE id = ?"
            self.db.cursor.execute(query, (self.id,))
            self.db.connection.commit()
