from .BaseModel import BaseModel

class Project(BaseModel):
    table_name = "projects"

    def __init__(self, id=None, creator_id=None, name=None,
                 description=None, cover=None, status='active',
                 created_at=None):
        super().__init__(id=id, creator_id=creator_id, name=name,
                         description=description, cover=cover,
                         status=status, created_at=created_at)

    @classmethod
    def get_user_projects(cls, user_id):
        query = """
            SELECT DISTINCT p.* 
            FROM projects p
            JOIN tasks t ON p.id = t.project_id
            JOIN distributed_tasks dt ON dt.task_id = t.id
            WHERE dt.user_id = ?
            
            UNION

            SELECT DISTINCT p.*
            FROM projects p
            WHERE p.creator_id = ?

        """
        cls.db.cursor.execute(query, (user_id, user_id))
        rows = cls.db.cursor.fetchall()

        columns = [desc[0] for desc in cls.db.cursor.description]
        return [cls(**dict(zip(columns, row))) for row in rows]