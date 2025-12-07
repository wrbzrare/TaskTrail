import sqlite3

from config import Config

class Database:
    def __init__(self):
        self.connection = sqlite3.connect(Config.DATABASE, check_same_thread=False)
        self.cursor = self.connection.cursor()
        self.create_tables()

    def create_tables(self):
        self.cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            login TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            surname TEXT NOT NULL,
            name TEXT NOT NULL,
            patronymic TEXT,
            description TEXT,
            email TEXT UNIQUE,
            phone_number TEXT,
            role TEXT CHECK(role IN ('member', 'moderator', 'admin')) DEFAULT 'member',
            status TEXT CHECK(status IN ('active', 'inactive')) DEFAULT 'active',
            photo TEXT DEFAULT 'static/img/photos/default_photo.jpg',
            last_auth DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        """)

        self.cursor.execute("""
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            creator_id INTEGER,
            name TEXT NOT NULL,
            description TEXT,
            cover TEXT DEFAULT 'static/img/project_covers/default_project.jpg',
            status TEXT CHECK(status IN ('planned', 'active', 'paused', 'completed', 'cancelled', 'archived')) DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (creator_id) REFERENCES users (id) ON DELETE CASCADE
        )
        """)

        self.cursor.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER,
            creator_id INTEGER,
            name TEXT NOT NULL,
            description TEXT,
            status TEXT CHECK(status IN ('planned', 'active', 'paused', 'completed', 'cancelled', 'archived')),
            start_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            end_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
            FOREIGN KEY (creator_id) REFERENCES users (id) ON DELETE CASCADE
        )
        """)

        self.cursor.execute("""
        CREATE TABLE IF NOT EXISTS distributed_tasks (
            user_id INTEGER,
            task_id INTEGER,
            status TEXT CHECK(status IN ('planned', 'active', 'paused', 'completed', 'cancelled', 'archived')),
            completed_at DATETIME,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
            FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
            PRIMARY KEY (user_id, task_id)
        )
        """)

        self.cursor.execute("""
        CREATE TABLE IF NOT EXISTS account_recovery (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            code INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
        """)

        self.connection.commit()