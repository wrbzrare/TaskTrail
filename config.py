class Config:
    DATABASE = 'db/database.db'
    SECRET_KEY = 'f133r87ygfd2252'
    PORT = 5000
    DEBUG = True
    NVIDIA_API_KEY = "Свой API ключ"
    NVIDIA_BASE_URL = "Базовый URL"
    AI_MODEL = "ИИ Модель"

    SYSTEM_CREATEDESCRIPTION = """Ты — опытный руководитель проектов и бизнес-аналитик. 
                        Твоя задача — превращать краткое название и описание в полноценное, структурированное техническое задание на русском языке."""
    USER_CREATEDESCRIPTION = """Название задачи: {name}
                        Краткое описание: {description}
                        Пожалуйста, подробно распиши задачу на русском языке в следующем формате:
                        1. <b>Цель и ценность задачи</b> — зачем она нужна проекту и бизнесу.
                        2. <b>Подробное описание</b> — что именно требуется сделать.
                        3. <b>Шаги выполнения</b> — нумерованный список конкретных шагов (6–12 пунктов).
                        4. <b>Необходимые ресурсы и инструменты</b>.
                        5. <b>Критерии приёмки</b> — как понять, что задача выполнена успешно.
                        6. <b>Возможные риски</b> и рекомендации по их минимизации.
                        Стиль: профессиональный, ясный, без лишней воды. Используй HTML для форматирования, в т.ч и для перехода на новую строку. Особенно не забудь об этом перед каждым новым пунктом. Не используй для форматирования Markdown."""

    SYSTEM_CREATEQUERY = """You are an AI that converts natural language into SQL queries for SQLite.
                            Strict rules:
                            - Output ONLY SQL query
                            - Do NOT explain anything
                            - Do NOT add comments
                            - Do NOT use markdown
                            - Only valid SQLite syntax

                            Allowed:
                            - SELECT, INNER, INSERT, UPDATE queries only

                            Disallowed:
                            - DELETE, CREATE, DROP, ALTER

                            Use only tables and columns listed below.

                            If the request is unclear, return:
                            SELECT 'ERROR: unclear request';

                            Database schema:

                            Database: SQLite

                            Tables:

                            users:
                            - id (INTEGER, PK)
                            - login (TEXT, UNIQUE)
                            - password_hash (TEXT)
                            - surname (TEXT)
                            - name (TEXT)
                            - patronymic (TEXT)
                            - description (TEXT)
                            - email (TEXT, UNIQUE)
                            - phone_number (TEXT)
                            - role (TEXT: member | moderator | admin)
                            - status (TEXT: active | inactive)
                            - photo (TEXT)
                            - last_auth (DATETIME)
                            - created_at (DATETIME)

                            projects:
                            - id (INTEGER, PK)
                            - creator_id (INTEGER, FK -> users.id)
                            - name (TEXT)
                            - description (TEXT)
                            - cover (TEXT)
                            - status (TEXT: planned | active | paused | completed | cancelled | archived)
                            - created_at (DATETIME)

                            tasks:
                            - id (INTEGER, PK)
                            - project_id (INTEGER, FK -> projects.id)
                            - creator_id (INTEGER, FK -> users.id)
                            - name (TEXT)
                            - description (TEXT)
                            - status (TEXT)
                            - start_at (DATETIME)
                            - end_at (DATETIME)
                            - created_at (DATETIME)

                            distributed_tasks:
                            - user_id (INTEGER, FK -> users.id)
                            - task_id (INTEGER, FK -> tasks.id)
                            - status (TEXT)
                            - completed_at (DATETIME)
                            - PRIMARY KEY (user_id, task_id)

                            account_recovery:
                            - id (INTEGER, PK)
                            - user_id (INTEGER, FK -> users.id)
                            - code (INTEGER)
                            - created_at (DATETIME)

                            Relationships:
                            - users 1→N projects
                            - projects 1→N tasks
                            - users N↔N tasks (through distributed_tasks)
                            """

    USER_CREATEQUERY = """
            Convert the following request to SQL:
            Request: "{user_query}"""
