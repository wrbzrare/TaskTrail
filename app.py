from flask import Flask, session, redirect, url_for, request, render_template, jsonify, abort
from flask_restful import Api, Resource
from werkzeug.security import generate_password_hash, check_password_hash 
from werkzeug.utils import secure_filename

import smtplib
from email.message import EmailMessage
import random
from datetime import datetime, timedelta, timezone
import time
import os
import re

from functools import wraps

from config import Config
from db import Database
from models import User, Task, Project


app = Flask(__name__)
app.secret_key = Config.SECRET_KEY 
api = Api(app)

db = Database()

# ---------- Декоратор для авторизации ----------
def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login_page'))
        return f(*args, **kwargs)
    return decorated


# ---------- Маршруты ----------
@app.route('/login')
def login_page():
    return render_template('login.html')

@app.route('/restore-password')
def restore_page():
    return render_template('restore-password.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login_page'))

@app.route('/')
@login_required
def index():
    return render_template('main.html')

@app.route('/projects')
@login_required
def projects_page():
    return render_template('projects.html')

@app.route('/tasks')
@login_required
def tasks_page():
    return render_template('tasks.html')

@app.route('/projects/<int:project_id>')
@login_required
def project_page(project_id):
    return render_template('project-tasks.html')

@app.route("/projects/create")
@login_required
def create_project_page():
    user_id = session.get("user_id")
    user = User.get_by_id(user_id)
    if user.role not in ("admin", "moderator"):
        abort(403)
    return render_template("create_project.html")

@app.route("/admin")
@login_required
def admin_page():
    user_id = session.get("user_id")
    user = User.get_by_id(user_id)
    if user.role not in ("admin", "moderator"):
        abort(403)
    return render_template("admin.html")

@app.route('/profile')
@login_required
def profile_page():
    return render_template('profile.html')


# ---------- API авторизации ----------
class LoginAPI(Resource):
    def post(self):
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            return {"success": False, "message": "Введите логин/email и пароль"}, 400

        EMAIL_REGEX = r"^[\w\.-]+@[\w\.-]+\.\w+$"

        is_email = re.match(EMAIL_REGEX, email) is not None

        if is_email:
            db.cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
        else:
            db.cursor.execute("SELECT * FROM users WHERE login = ?", (email,))

        row = db.cursor.fetchone()

        if not row:
            return {"success": False, "message": "Пользователь не найден"}, 404

        columns = [desc[0] for desc in db.cursor.description]
        user = dict(zip(columns, row))

        # Проверяем хэш пароля
        if not check_password_hash(user["password_hash"], password):
            return {"success": False, "message": "Неверный пароль"}, 401

        # Авторизация успешна — сохраняем сессию
        session["user_id"] = user["id"]
        session["user_name"] = user["name"]

        return {"success": True, "message": "Вход выполнен", "redirect": url_for("index")}, 200

# ---------- Вспомогательная функция для отправки email ----------
def send_email(to_email, code):
    try:
        msg = EmailMessage()
        msg["Subject"] = "Восстановление пароля"
        msg["From"] = "igamletov@bk.ru"
        msg["To"] = to_email
        msg["Reply-To"] = "igamletov@bk.ru"
        msg["User-Agent"] = "PythonSMTP/3.11"

        html_content = (
            '<!DOCTYPE html>'
            '<html lang="ru">'
            '<head>'
            '    <meta charset="UTF-8">'
            '    <title>Код подтверждения</title>'
            '    <style>'
            '        body {'
            '            font-family: system-ui, sans-serif;'
            '            background: #f5f7fa;'
            '            margin: 40px 20px;'
            '            display: flex;'
            '            justify-content: center;'
            '        }'
            '        .email {'
            '            background: white;'
            '            padding: 30px;'
            '            border-radius: 8px;'
            '            box-shadow: 0 2px 8px rgba(0,0,0,0.1);'
            '            max-width: 300px;'
            '            text-align: center;'
            '        }'
            '        .logo {'
            '            font-weight: 700;'
            '            color: #2c3e50;'
            '            margin-bottom: 20px;'
            '        }'
            '        .code {'
            '            font-size: 24px;'
            '            font-weight: 700;'
            '            letter-spacing: 6px;'
            '            color: #3498db;'
            '            margin: 25px 0;'
            '            padding: 12px;'
            '            background: #f8f9fa;'
            '            border-radius: 6px;'
            '            cursor: pointer;'
            '            user-select: all;'
            '        }'
            '        .note {'
            '            color: #7f8c8d;'
            '            font-size: 13px;'
            '        }'
            '    </style>'
            '</head>'
            '<body>'
            '    <div class="email">'
            '        <div class="logo">TaskTrail</div>'
            f'        <div class="code" onclick="navigator.clipboard.writeText(\'{code}\')">{code}</div>'
            '        <div class="note">Код для восстановления пароля</div>'
            '    </div>'
            '</body>'
            '</html>'
            )

        msg.add_alternative(html_content, subtype='html')

        with smtplib.SMTP_SSL("smtp.mail.ru", 465) as smtp:
            smtp.login("igamletov@bk.ru", "w4UkdujIMzivHKomfRyu")
            smtp.send_message(msg)
    except Exception as e:
        print(f"Ошибка отправки email: {e}")

# ---------- API для запроса кода восстановления ----------
class RequestRecoveryAPI(Resource):
    def post(self):
        data = request.get_json()
        email = data.get('email')
        if not email:
            return {"success": False, "message": "Email не указан"}, 400

        db.cursor.execute("SELECT id, email FROM users WHERE email = ?", (email,))
        user = db.cursor.fetchone()
        if not user:
            return {"success": False, "message": "Пользователь с таким email не найден"}, 404

        user_id = user[0]

        db.cursor.execute("DELETE FROM account_recovery WHERE user_id = ?", (user_id,))
        db.connection.commit()
        code = random.randint(100000, 999999)
        db.cursor.execute(
            "INSERT INTO account_recovery (user_id, code) VALUES (?, ?)",
            (user_id, code)
        )
        db.connection.commit()

        send_email(email, code)

        return {"success": True, "message": "Код отправлен на email"}, 200

# ---------- API для проверки кода ----------
class VerifyRecoveryAPI(Resource):
    def post(self):
        data = request.get_json()
        email = data.get('email')
        code = data.get('code')

        if not email or not code:
            return {"success": False, "message": "Не указан email или код"}, 400

        db.cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
        user = db.cursor.fetchone()
        if not user:
            return {"success": False, "message": "Пользователь не найден"}, 404
        user_id = user[0]

        # Получаем код восстановления
        db.cursor.execute(
            "SELECT code, created_at FROM account_recovery WHERE user_id = ?",
            (user_id,)
        )
        row = db.cursor.fetchone()
        if not row:
            return {"success": False, "message": "Код не найден, запросите новый"}, 404

        db_code, created_at_str = row
        created_at = datetime.fromisoformat(created_at_str)
        created_at = created_at.replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        print("created_at:", repr(created_at_str))
        if datetime.now(timezone.utc) > created_at + timedelta(minutes=10):
            return {"success": False, "message": "Код истёк, запросите новый"}, 400

        if str(db_code) != str(code):
            return {"success": False, "message": "Неверный код"}, 400

        return {"success": True, "message": "Код подтверждён"}, 200

# ---------- API для сброса пароля ----------
class ResetPasswordAPI(Resource):
    def post(self):
        data = request.get_json()
        email = data.get('email')
        code = data.get('code')
        new_password = data.get('new_password')

        if not email or not code or not new_password:
            return {"success": False, "message": "Не заполнены все поля"}, 400

        db.cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
        user = db.cursor.fetchone()
        if not user:
            return {"success": False, "message": "Пользователь не найден"}, 404
        user_id = user[0]

        db.cursor.execute(
            "SELECT code, created_at FROM account_recovery WHERE user_id = ?",
            (user_id,)
        )
        row = db.cursor.fetchone()
        if not row:
            return {"success": False, "message": "Код не найден"}, 404

        db_code, created_at_str = row
        created_at = datetime.fromisoformat(created_at_str)
        created_at = created_at.replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        print("created_at:", repr(created_at_str))
        if datetime.now(timezone.utc) > created_at + timedelta(minutes=10):
            return {"success": False, "message": "Код истёк, запросите новый"}, 400

        if str(db_code) != str(code):
            return {"success": False, "message": "Неверный код"}, 400

        hashed_password = generate_password_hash(new_password)
        db.cursor.execute(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            (hashed_password, user_id)
        )
        db.connection.commit()

        # Удаляем использованный код
        db.cursor.execute("DELETE FROM account_recovery WHERE user_id = ?", (user_id,))
        db.connection.commit()

        return {"success": True, "message": "Пароль успешно изменён"}, 200

# ---------- API для получения роли пользователя ----------
class UserRoleAPI(Resource):
    def get(self):
        user_id = session.get("user_id")
        if not user_id:
            return {"success": False, "error": "unauthorized"}, 401
        role = User.get_role(user_id)
        return {"success": True, "role": role}, 200


# ---------- API для получения пользовательских проектов ----------
class UserProjectsAPI(Resource):
    def get(self):
        user_id = session.get("user_id")
        projects = Project.get_user_projects(user_id)

        grouped = {
            "planned": [],
            "active": [],
            "paused": [],
            "completed": [],
            "cancelled": [],
            "archived": []
        }

        for p in projects:
            grouped[p.status].append({
                "id": p.id,
                "name": p.name,
                "description": p.description,
                "cover": p.cover,
                "status": p.status
            })

        return {"success": True, "projects": grouped}, 200


# ---------- API для получения информации о проекте ----------
class ProjectAPI(Resource):
    def get(self, project_id):
        project = Project.get_by_id(project_id)
        if not project:
            return {"success": False, "message": "Проект не найден"}, 404

        user_id = session.get("user_id")
        is_creator = user_id is not None and project.creator_id == user_id

        return {
            "success": True,
            "project": {
                "id": project.id,
                "name": project.name,
                "description": project.description,
                "cover": project.cover,
                "status": project.status,
                "creator_id": project.creator_id,
                "created_at": project.created_at,
                "is_creator": is_creator
            }
        }, 200

# ---------- API для создания задачи ----------
class ProjectCreateTaskAPI(Resource):
    def post(self, project_id):
        user_id = session.get("user_id")
        if not user_id:
            return {"success": False, "message": "Требуется авторизация"}, 401

        project = Project.get_by_id(project_id)
        if not project:
            return {"success": False, "message": "Проект не найден"}, 404

        if project.creator_id != user_id:
            return {"success": False, "message": "Только создатель проекта может создавать задачи"}, 403

        payload = request.get_json() or {}
        name = payload.get("name")
        description = payload.get("description")
        status = payload.get("status", "planned")
        start_at = payload.get("start_at")
        end_at = payload.get("end_at")

        if not name:
            return {"success": False, "message": "Требуется имя задачи"}, 400

        # Создаём задачу через модель
        t = Task(project_id=project_id, creator_id=user_id, name=name, description=description, status=status, start_at=start_at, end_at=end_at)
        t.save()

        return {"success": True, "task": {
            "id": t.id,
            "name": t.name,
            "description": t.description,
            "status": t.status,
            "start_at": t.start_at,
            "end_at": t.end_at
        }}, 201

# ---------- API для смены глобального статуса задачи ----------
class TaskUpdateStatusAPI(Resource):
    def post(self, task_id):
        user_id = session.get("user_id")
        if not user_id:
            return {"success": False, "message": "Требуется авторизация"}, 401

        task = Task.get_by_id(task_id)
        if not task:
            return {"success": False, "message": "Задача не найдена"}, 404

        project = Project.get_by_id(task.project_id)
        if not project:
            return {"success": False, "message": "Проект задачи не найден"}, 404

        if project.creator_id != user_id:
            return {"success": False, "message": "Только создатель проекта может менять статус задачи"}, 403

        payload = request.get_json() or {}
        new_status = payload.get("status")
        if new_status not in ('planned','active','paused','completed','cancelled','archived'):
            return {"success": False, "message": "Неподдерживаемый статус"}, 400

        Task.db.cursor.execute("UPDATE tasks SET status = ? WHERE id = ?", (new_status, task_id))
        Task.db.connection.commit()

        return {"success": True, "message": "Статус задачи обновлён", "task_id": task_id, "status": new_status}, 200

# ---------- API для назначения пользователя на задачу ----------
class TaskAssignUserAPI(Resource):
    def post(self, task_id):
        user_id = session.get("user_id")
        if not user_id:
            return {"success": False, "message": "Требуется авторизация"}, 401

        task = Task.get_by_id(task_id)
        if not task:
            return {"success": False, "message": "Задача не найдена"}, 404

        project = Project.get_by_id(task.project_id)
        if not project:
            return {"success": False, "message": "Проект задачи не найден"}, 404

        if project.creator_id != user_id:
            return {"success": False, "message": "Только создатель проекта может назначать пользователей"}, 403

        payload = request.get_json() or {}
        assign_user_id = payload.get("user_id")
        if not assign_user_id:
            return {"success": False, "message": "user_id обязателен"}, 400

        Task.db.cursor.execute("SELECT id FROM users WHERE id = ?", (assign_user_id,))
        if not Task.db.cursor.fetchone():
            return {"success": False, "message": "Пользователь не найден"}, 404

        try:
            Task.db.cursor.execute("""
                INSERT INTO distributed_tasks (user_id, task_id, status)
                VALUES (?, ?, ?)
            """, (assign_user_id, task_id, 'planned'))
            Task.db.connection.commit()
        except Exception as e:
            return {"success": False, "message": "Пользователь уже назначен или ошибка: " + str(e)}, 400

        return {"success": True, "message": "Пользователь назначен"}, 201

# ---------- API для получения задач проекта ----------
class ProjectTasksAPI(Resource):
    def get(self, project_id):
        user_id = session.get("user_id")

        tasks = Task.get_project_user_tasks(user_id, project_id)

        completed_tasks_ids = Task.get_user_completed_task_ids(user_id)

        grouped = {
            "active": [],
            "planned": [],
            "paused": [],
            "completed": [],
            "cancelled": [],
            "archived": []
        }

        for t in tasks:
            task_dict = {
                "id": t.id,
                "name": t.name,
                "description": t.description,
                "status": t.status,
                "start_at": t.start_at,
                "end_at": t.end_at,
                "user_completed": t.id in completed_tasks_ids
            }
            grouped.get(t.status, []).append(task_dict)

        return {"success": True, "project_id": project_id, "tasks": grouped}, 200

# ---------- API для получения всех задач пользователя ----------
class AllUserTasksAPI(Resource):
    def get(self):
        user_id = session.get("user_id")

        tasks = Task.get_all_user_tasks(user_id)

        completed_tasks_ids = Task.get_user_completed_task_ids(user_id)

        grouped = {
            "active": [],
            "planned": [],
            "paused": [],
            "completed": [],
            "cancelled": [],
            "archived": []
        }

        for r in tasks:
            t_id, name, desc, status, start, end, project_id, project_name = r

            grouped[status].append({
                "id": t_id,
                "name": name,
                "description": desc,
                "status": status,
                "start_at": start,
                "end_at": end,
                "project_id": project_id,
                "project_name": project_name,
                "user_completed": t_id in completed_tasks_ids
            })

        return {"success": True, "tasks": grouped}, 200


# ---------- API для отметки задачи как выполненной ----------
class CompleteTaskAPI(Resource):
    def post(self, task_id):
        user_id = session.get("user_id")

        query = """
            UPDATE distributed_tasks 
            SET status='completed', completed_at=CURRENT_TIMESTAMP
            WHERE user_id = ? AND task_id = ?
        """
        Task.db.cursor.execute(query, (user_id, task_id))
        Task.db.connection.commit()

        return {"success": True}, 200

# ---------- API для создангия проекта ----------
class CreateProjectAPI(Resource):
    def post(self):
        user_id = session.get("user_id")
        if not user_id:
            return {"success": False, "error": "Не авторизован"}, 401

        user = User.get_by_id(user_id)
        if user.role not in ("admin", "moderator"):
            return {"success": False, "error": "Нет прав"}, 403

        name = request.form.get("name")
        description = request.form.get("description")
        status = request.form.get("status")
        cover_file = request.files.get("cover")

        if not name or not description or not status:
            return {"success": False, "error": "Заполните все обязательные поля"}, 400

        cover_filename = "static/img/project_covers/default_project.jpg"
        if cover_file and cover_file.filename != "":
            filename = secure_filename(cover_file.filename)
            cover_path = os.path.join("static", "img", "project_covers", filename)
            os.makedirs(os.path.dirname(cover_path), exist_ok=True)
            cover_file.save(cover_path)
            cover_filename = f"static/img/project_covers/{filename}"

        project = Project(
            creator_id=user_id,
            name=name,
            description=description,
            cover=cover_filename,
            status=status
        )
        project.save()

        return {"success": True, "project_id": project.id}, 200

# ---------- API для профиля пользователя ----------
class UserProfileAPI(Resource):
    def get(self):
        """
        Получение данных профиля пользователя.
        """
        user_id = session.get('user_id')
        if not user_id:
            return {"success": False, "message": "Не авторизован"}, 401

        user = User.get_by_id(user_id)
        if not user:
            return {"success": False, "message": "Пользователь не найден"}, 404

        Task.db.cursor.execute("""
            SELECT 
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_count,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count
            FROM distributed_tasks
            WHERE user_id = ?
        """, (user_id,))
        row = Task.db.cursor.fetchone()
        active_count = row[0] or 0
        completed_count = row[1] or 0

        data = {
            "id": user.id,
            "surname": user.surname,
            "name": user.name,
            "patronymic": user.patronymic,
            "description": user.description,
            "email": user.email,
            "role": user.role,
            "photo": f"{user.photo}" if user.photo else None,
            "active_tasks": active_count,
            "completed_tasks": completed_count
        }
        return {"success": True, "user": data}, 200

    def post(self):
        """
        Изменение фотографии пользователя.
        """
        user_id = session.get('user_id')
        if not user_id:
            return {"success": False, "message": "Не авторизован"}, 401

        if 'photo' not in request.files:
            return {"success": False, "message": "Файл не предоставлен"}, 400

        file = request.files['photo']
        if file.filename == '':
            return {"success": False, "message": "Файл не выбран"}, 400

        if file and file.mimetype.startswith('image/'):
            filename = secure_filename(file.filename)
            save_path = os.path.join('static/img/photos', filename)
            file.save(save_path)

            user = User.get_by_id(user_id)
            if not user:
                return {"success": False, "message": "Пользователь не найден"}, 404

            user.photo = save_path
            user.save()

            return {"success": True, "photo": f"static/img/photos/{filename}"}
        else:
            return {"success": False, "message": "Неверный формат файла"}, 400

# ---------- API для получения списка пользователей ----------
class AdminUsersAPI(Resource):
    def get(self):
        user_id = session.get("user_id")
        if not user_id:
            return {"success": False, "message": "Не авторизован"}, 401

        # проверим роль
        role = User.get_role(user_id)
        if role not in ("moderator", "admin"):
            return {"success": False, "message": "Доступ запрещён"}, 403

        q = request.args.get("q", None)
        users = User.search_users(q=q, limit=500)

        # форматируем вывод: id, full_name, email, phone, status, created_at
        out = []
        for u in users:
            full_name = " ".join(filter(None, [u.get("surname"), u.get("name"), u.get("patronymic")]))
            out.append({
                "id": u.get("id"),
                "full_name": full_name,
                "email": u.get("email"),
                "phone": u.get("phone_number"),
                "status": u.get("status"),
                "created_at": u.get("created_at")
            })

        return {"success": True, "users": out}, 200

# ---------- API для изменения статуса пользователей ----------
class AdminUserStatusAPI(Resource):
    def post(self, user_id):
        current = session.get("user_id")
        if not current:
            return {"success": False, "message": "Не авторизован"}, 401

        role = User.get_role(current)
        if role not in ("moderator", "admin"):
            return {"success": False, "message": "Доступ запрещён"}, 403

        payload = request.get_json(silent=True) or {}
        if "active" not in payload:
            return {"success": False, "message": "Отсутствует параметр active"}, 400

        active = bool(payload.get("active"))
        new_status = "active" if active else "inactive"

        ok = User.set_status(user_id, new_status)
        if not ok:
            return {"success": False, "message": "Пользователь не найден"}, 404

        return {"success": True, "user_id": user_id, "status": new_status}, 200

# ---------- API для регистрации нового пользователя ----------
class AdminUserCreateAPI(Resource):
    def post(self):
        user_id = session.get("user_id")
        if not user_id:
            return {"success": False, "message": "Не авторизован"}, 401

        role = User.get_role(user_id)
        if role not in ("moderator", "admin"):
            return {"success": False, "message": "Доступ запрещён"}, 403

        data = request.get_json(silent=True) or {}

        required = ["login", "email", "surname", "name", "password"]
        for field in required:
            if not data.get(field):
                return {"success": False, "message": f"Поле '{field}' обязательно"}, 400

        email = data["email"].strip().lower()
        if "@" not in email or "." not in email:
            return {"success": False, "message": "Некорректный email"}, 400

        existing = User.find_one("email", email)
        if existing:
            return {"success": False, "message": "Пользователь с таким email уже существует"}, 409

        login = data["login"].strip()
        email = data["email"].strip()
        surname = data["surname"].strip()
        name = data["name"].strip()
        patronymic = data.get("patronymic", "").strip() or None
        description = data["description"].strip() or None
        phone = data.get("phone", "").strip() or None
        password = data["password"]

        password_hash = generate_password_hash(password)


        new_user = User(
            login=login,
            password_hash=password_hash,
            surname=surname,
            name=name,
            patronymic=patronymic,
            description=description,
            email=email,
            phone_number=phone
        )
        new_user.save()


        User.db.connection.commit()
        new_id = User.db.cursor.lastrowid

        return {"success": True, "message": "Пользователь создан", "user_id": new_id}, 201

# ---------- API для ввода и использования SQL команд ----------
class SQLConsoleAPI(Resource):
    def post(self):
        user_id = session.get("user_id")
        if not user_id:
            return {"success": False, "message": "Не авторизован"}, 401

        role = User.get_role(user_id)
        if role != "admin":
            return {"success": False, "message": "Доступ запрещён"}, 403

        data = request.get_json(silent=True) or {}
        query = data.get("query", "").strip()

        if not query:
            return {"success": False, "message": "Пустой SQL запрос"}, 400

        # Защита от multi-statements
        if ";" in query and not query.endswith(";"):
            return {"success": False, "message": "Множественные SQL запросы запрещены"}, 400

        db = User.db  # используем основную БД (как модель User)

        try:
            start = time.time()

            db.cursor.execute(query)

            if query.lower().startswith("select"):
                rows = db.cursor.fetchall()
                columns = [desc[0] for desc in db.cursor.description]
                execution_time = round(time.time() - start, 5)

                return {
                    "success": True,
                    "type": "select",
                    "columns": columns,
                    "rows": rows,
                    "rows_count": len(rows),
                    "execution_time": execution_time
                }, 200

            else:

                db.connection.commit()
                execution_time = round(time.time() - start, 5)

                return {
                    "success": True,
                    "type": "modify",
                    "rows_count": db.cursor.rowcount,
                    "execution_time": execution_time
                }, 200

        except sqlite3.Error as e:
            return {"success": False, "message": str(e)}, 400


# ---------- Регистрируем API ----------
api.add_resource(LoginAPI, '/api/login')
api.add_resource(RequestRecoveryAPI, '/api/recovery/send_code')
api.add_resource(VerifyRecoveryAPI, '/api/recovery/verify_code')
api.add_resource(ResetPasswordAPI, '/api/recovery/reset_password')
api.add_resource(UserProjectsAPI, '/api/user-projects')
api.add_resource(ProjectAPI, "/api/projects/<int:project_id>")
api.add_resource(ProjectTasksAPI, "/api/projects/<int:project_id>/tasks")
api.add_resource(AllUserTasksAPI, "/api/tasks/all")
api.add_resource(CompleteTaskAPI, "/api/tasks/<int:task_id>/complete")
api.add_resource(UserRoleAPI, "/api/user-role")
api.add_resource(CreateProjectAPI, "/api/projects/create")
api.add_resource(ProjectCreateTaskAPI, "/api/projects/<int:project_id>/tasks/create")
api.add_resource(TaskUpdateStatusAPI, "/api/tasks/<int:task_id>/update_status")
api.add_resource(TaskAssignUserAPI, "/api/tasks/<int:task_id>/assign")
api.add_resource(UserProfileAPI, "/api/users/me")
api.add_resource(AdminUsersAPI, "/api/admin/users")
api.add_resource(AdminUserStatusAPI, "/api/admin/users/<int:user_id>/status")
api.add_resource(AdminUserCreateAPI, "/api/admin/users/create")
api.add_resource(SQLConsoleAPI, "/api/admin/sql")


if __name__ == '__main__':
    app.run(port = Config.PORT, debug = Config.DEBUG)
