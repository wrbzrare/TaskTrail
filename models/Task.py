from datetime import datetime
from .BaseModel import BaseModel

class Task(BaseModel):
    table_name = "tasks"

    def __init__(self, id=None, project_id=None, creator_id=None,
                name=None, description=None, status=None,
                start_at=None, end_at=None, created_at=None):

        if created_at is None:
            created_at = datetime.utcnow()

        if start_at is None:
            start_at = created_at

        if status is None:
            status = 'planned'

        super().__init__(id=id, project_id=project_id, creator_id=creator_id,
                        name=name, description=description, status=status,
                        start_at=start_at, end_at=end_at,
                        created_at=created_at)

    @classmethod
    def get_user_tasks(cls, user_id):
        query = """
            SELECT t.*
            FROM tasks t
            JOIN distributed_tasks d ON d.task_id = t.id
            WHERE d.user_id = ?
            ORDER BY t.created_at DESC
        """
        cls.db.cursor.execute(query, (user_id,))
        rows = cls.db.cursor.fetchall()
        columns = [desc[0] for desc in cls.db.cursor.description]
        return [cls(**dict(zip(columns, row))) for row in rows]

    @classmethod
    def get_user_tasks(cls, user_id):
        cursor = cls.get_cursor()
        try:
            query = """
                SELECT t.*
                FROM tasks t
                JOIN distributed_tasks d ON d.task_id = t.id
                WHERE d.user_id = ?
                ORDER BY t.created_at DESC
            """
            cursor.execute(query, (user_id,))
            rows = cursor.fetchall()
            columns = [desc[0] for desc in cursor.description]
            return [cls(**dict(zip(columns, row))) for row in rows]
        finally:
            cursor.close()

    @classmethod
    def get_project_user_tasks(cls, user_id, project_id):
        cursor = cls.get_cursor()
        try:
            query = """
                SELECT DISTINCT t.*
                FROM tasks t
                LEFT JOIN distributed_tasks d ON d.task_id = t.id
                WHERE t.project_id = ?
                AND (d.user_id = ? OR t.creator_id = ?)
            """
            cursor.execute(query, (project_id, user_id, user_id))
            rows = cursor.fetchall()
            columns = [desc[0] for desc in cursor.description]
            return [cls(**dict(zip(columns, row))) for row in rows]
        finally:
            cursor.close()

    @staticmethod
    def get_all_user_tasks(user_id):
        cursor = Task.db.get_cursor()
        try:
            query = """
                SELECT t.id, t.name, t.description, t.status, t.start_at, t.end_at,
                       t.project_id, p.name as project_name
                FROM tasks t
                JOIN projects p ON p.id = t.project_id
                JOIN distributed_tasks d ON d.task_id = t.id
                WHERE d.user_id = ?
            """
            cursor.execute(query, (user_id,))
            return cursor.fetchall()
        finally:
            cursor.close()

    @staticmethod
    def get_user_completed_task_ids(user_id):
        cursor = Task.db.get_cursor()
        try:
            cursor.execute("""
                SELECT task_id 
                FROM distributed_tasks
                WHERE user_id = ? AND status = 'completed'
            """, (user_id,))
            return {row[0] for row in cursor.fetchall()}
        finally:
            cursor.close()