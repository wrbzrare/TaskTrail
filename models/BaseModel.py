from db import Database

class BaseModel:
    table_name = None
    db = Database()

    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)

    @classmethod
    def get_cursor(cls):
        return cls.db.get_cursor()

    @classmethod
    def get_by_id(cls, record_id):
        cursor = cls.get_cursor()
        query = f"SELECT * FROM {cls.table_name} WHERE id = ?"
        cursor.execute(query, (record_id,))
        row = cursor.fetchone()
        if row:
            columns = [desc[0] for desc in cursor.description]
            cursor.close()
            return cls(**dict(zip(columns, row)))
        cursor.close()
        return None

    @classmethod
    def get_all(cls):
        cursor = cls.get_cursor()
        query = f"SELECT * FROM {cls.table_name}"
        cursor.execute(query)
        rows = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description]
        cursor.close()
        return [cls(**dict(zip(columns, row))) for row in rows]

    def save(self):

        data = self.__dict__.copy()
        
        is_update = hasattr(self, 'id') and self.id is not None

        cursor = self.get_cursor()
        
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
        
        try:
            cursor.execute(query, values_to_update)
            self.db.commit()
            if not is_update:
                self.id = cursor.lastrowid
        finally:
            cursor.close()

    @classmethod
    def find_one(cls, field, value):
        cursor = cls.get_cursor()
        try:
            query = f"SELECT * FROM {cls.table_name} WHERE {field} = ? LIMIT 1"
            cursor.execute(query, (value,))
            row = cursor.fetchone()

            if not row:
                return None

            columns = [desc[0] for desc in cursor.description]
            data = dict(zip(columns, row))
                
            return cls(**data)
        finally:
            cursor.close()

    def delete(self):
        if getattr(self, "id", None):
            cursor = self.get_cursor()
            try:
                query = f"DELETE FROM {self.table_name} WHERE id = ?"
                cursor.execute(query, (self.id,))
                self.db.commit()
            finally:
                cursor.close()